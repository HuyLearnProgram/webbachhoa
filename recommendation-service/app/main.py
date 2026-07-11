"""FastAPI recommendation service — Phase 2: content + co-purchase + popularity + CF (ALS)
+ MMR + category-fatigue decay.

Chỉ Java backend gọi service này (giữ JWT auth tập trung); không expose ra ngoài.
Java tự fallback rule-based khi service down/rỗng nên mọi endpoint được phép trả rỗng/500.
"""

import logging
import math
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Query

from app.bandit.explore import maybe_explore
from app.bandit.linucb import linucb
from app.bandit.rewards import process_rewards
from app.bandit.state import state as bandit_state
from app.blend import blend
from app.candidates import repurchase
from app.candidates.collaborative import item_scores, user_scores
from app.config import settings
from app.db import fetch_df
from app.metrics import metrics
from app.metrics_experiment import build_report
from app.rerank.diversity import adaptive_lambda, mmr_rerank
from app.rerank.fatigue import apply_fatigue, category_exposure
from app.schemas import RecItem, RecResponse
from app.store import ModelArtifacts, store
from app.trainer import train_all

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

CONTENT = "CONTENT_BASED"
CO_PURCHASE = "CO_PURCHASE"
POPULARITY = "POPULARITY"
COLLABORATIVE = "CF"

# Preference vector đa tín hiệu (Phase 2): view + cart-add + purchase, LIMIT riêng từng loại.
# Purchase chỉ có nghĩa khi có user_id; guest lấy view + cart-add theo session.
# 2 query tách riêng theo user/session (không dùng OR — cùng lý do đã áp dụng ở fatigue.py:
# OR trên user_id/session_id vô hiệu cả 2 index trên product_views/cart_events đang phình).
# Double-count sau session-merge (dòng có cả user_id lẫn session_id khớp) chấp nhận được —
# chỉ cộng thêm trọng số nhỏ vào preference vector, không đổi hạng nghiêm trọng.
INTERACTIONS_SQL_USER = """
(SELECT product_id, viewed_at AS ts, 'V' AS kind FROM product_views
 WHERE user_id = :uid ORDER BY viewed_at DESC LIMIT :view_lim)
UNION ALL
(SELECT product_id, occurred_at, 'C' FROM cart_events
 WHERE user_id = :uid AND event_type = 'ADD'
 ORDER BY occurred_at DESC LIMIT :cart_lim)
UNION ALL
(SELECT od.product_id, o.order_time, 'P' FROM order_detail od
 JOIN orders o ON o.id = od.order_id
 WHERE o.user_id = :uid AND o.status IN (1, 2)
 ORDER BY o.order_time DESC LIMIT :purchase_lim)
"""
INTERACTIONS_SQL_SESSION = """
(SELECT product_id, viewed_at AS ts, 'V' AS kind FROM product_views
 WHERE session_id = :sid ORDER BY viewed_at DESC LIMIT :view_lim)
UNION ALL
(SELECT product_id, occurred_at, 'C' FROM cart_events
 WHERE session_id = :sid AND event_type = 'ADD'
 ORDER BY occurred_at DESC LIMIT :cart_lim)
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Train đồng bộ TRƯỚC khi nhận request — không có giai đoạn "model rỗng".
    train_all()
    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(_safe_retrain, "cron", hour=settings.retrain_cron_hour)
    if settings.bandit_enabled:
        # Phase 3: reward loop của LinUCB — poll impressions, KHÔNG batch retrain
        scheduler.add_job(
            _safe_process_rewards, "interval",
            seconds=settings.bandit_poll_interval_s, max_instances=1, coalesce=True,
        )
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


def _safe_retrain() -> None:
    try:
        train_all()
    except Exception:
        logger.exception("Nightly retrain lỗi — giữ nguyên model cũ.")


def _safe_process_rewards() -> None:
    try:
        process_rewards()
    except Exception:
        logger.exception("Bandit reward poll lỗi — thử lại kỳ sau.")


app = FastAPI(title="webbachhoa recommendation-service", lifespan=lifespan)


def _art() -> ModelArtifacts:
    art = store.get()
    if art is None or not art.product_ids:
        raise HTTPException(status_code=503, detail="Model chưa sẵn sàng")
    return art


def _to_response(
    items: list[tuple[int, float, str]], algorithm_source: str, art: ModelArtifacts, request_id: str
) -> RecResponse:
    return RecResponse(
        request_id=request_id,
        algorithm_source=algorithm_source,
        model_version=art.model_version,
        items=[RecItem(product_id=pid, score=round(score, 6), source=src) for pid, score, src in items],
    )


def _fetch_interactions(user_id: int | None, session_id: str | None):
    """Lịch sử tương tác đa tín hiệu (view/cart-add/purchase) từ tracking Phase 0.
    None khi không có định danh nào."""
    limits = {
        "view_lim": settings.profile_view_limit,
        "cart_lim": settings.profile_cart_limit,
        "purchase_lim": settings.profile_purchase_limit,
    }
    if user_id is not None:
        frames = [fetch_df(INTERACTIONS_SQL_USER, {"uid": user_id, **limits})]
        if session_id:
            frames.append(fetch_df(INTERACTIONS_SQL_SESSION, {"sid": session_id, **limits}))
        return pd.concat(frames, ignore_index=True)
    if session_id:
        return fetch_df(INTERACTIONS_SQL_SESSION, {"sid": session_id, **limits})
    return None


_PROFILE_PARAMS = {
    # kind -> (weight, tau_hours) — lazy đọc settings để .env override được
    "V": lambda: (settings.profile_w_view, settings.profile_tau_view_h),
    "C": lambda: (settings.profile_w_cart, settings.profile_tau_cart_h),
    "P": lambda: (settings.profile_w_purchase, settings.profile_tau_purchase_h),
}


def _profile_scores(interactions, art: ModelArtifacts) -> tuple[dict[int, float], list[int], set[int]]:
    """Preference vector time-decay đa tín hiệu:
    score[cand] = Σ_seed w_kind·exp(-Δh/τ_kind)·cosine(seed, cand).
    `seen` (exclude khỏi gợi ý) chỉ lấy từ view — grocery là hàng mua lặp,
    sản phẩm đã mua/đã bỏ giỏ vẫn phải gợi ý được.
    Riêng tín hiệu mua thật ('P') nhân thêm readiness theo chu kỳ mua lại ước tính — vừa mua
    thì còn yếu, tăng dần khi gần tới lúc hết hàng, tránh boost "sản phẩm giống cái vừa mua"
    mạnh nhất ngay lúc khách rõ ràng chưa cần mua lại."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # timestamp DB lưu UTC (Instant)
    scores: dict[int, float] = {}
    seen: set[int] = set()
    categories: list[int] = []
    for row in interactions.itertuples(index=False):
        pid = int(row.product_id)
        if row.kind == "V":
            seen.add(pid)
        if pid in art.pid_to_category:
            categories.append(art.pid_to_category[pid])
        w, tau = _PROFILE_PARAMS[row.kind]()
        age_h = max((now - row.ts.to_pydatetime()).total_seconds() / 3600.0, 0.0)
        weight = w * math.exp(-age_h / tau)
        if row.kind == "P":
            weight *= repurchase.readiness(age_h / 24.0, art.repurchase_cycle_days.get(pid))
        for nbr, sim in art.neighbors.get(pid, []):
            scores[nbr] = scores.get(nbr, 0.0) + weight * sim
    return scores, categories, seen


def _majority_source(items: list[tuple[int, float, str]]) -> str:
    counts: dict[str, int] = {}
    for _, _, src in items:
        counts[src] = counts.get(src, 0) + 1
    priority = {COLLABORATIVE: 3, CO_PURCHASE: 2, CONTENT: 1, POPULARITY: 0}
    return max(counts, key=lambda s: (counts[s], priority.get(s, -1))) if counts else POPULARITY


@app.get("/health")
def health():
    art = store.get()
    cf = art.cf if art else None
    return {
        "status": "ok" if art else "training",
        "model_version": art.model_version if art else None,
        "products_indexed": len(art.product_ids) if art else 0,
        "copurchase_rules": len(art.rules) if art else 0,
        "cf_enabled": cf is not None,
        "cf_users": len(cf.uid_to_idx) if cf else 0,
        "cf_items": len(cf.item_ids) if cf else 0,
        "cf_backend": cf.backend if cf else None,
        "cf_trained_at": cf.trained_at.isoformat(timespec="seconds") if cf else None,
        "last_train_seconds": art.last_train_seconds if art else None,
        "bandit_enabled": settings.bandit_enabled,
        "bandit_arms": linucb.n_arms(),
        "bandit_pending_decisions": bandit_state.count_pending(),
        "ab_bandit_pct": settings.ab_bandit_pct if settings.ab_bandit_enabled else 100,
    }


@app.get("/metrics")
def get_metrics():
    return metrics.snapshot()


@app.get("/metrics/experiment")
def get_experiment_metrics(days: int = Query(None, ge=1, le=180)):
    """Phase 3: CTR/diversity/coverage/entropy/A-B — Java proxy qua admin/recommendation-metrics
    (khoá ADMIN). Cache TTL ngắn phía service, dashboard refresh không đập DB."""
    return build_report(days or settings.metrics_experiment_days_default, _art())


@app.post("/internal/retrain")
def retrain():
    art = train_all(force_cf=True)  # dev retrain luôn muốn CF tươi, bỏ qua hybrid cadence
    return {"model_version": art.model_version, "last_train_seconds": art.last_train_seconds}


@app.get("/recommend/similar/{product_id}", response_model=RecResponse)
def recommend_similar(
    product_id: int,
    session_id: str | None = Query(None, max_length=64),
    user_id: int | None = None,  # Java resolve từ JWT — không bao giờ nhận từ FE
    k: int = Query(12, ge=1, le=50),
):
    art = _art()
    request_id = uuid.uuid4().hex

    if product_id not in art.pid_to_idx:
        # Cold-start: sản phẩm tạo sau lần train gần nhất — trả trending theo category.
        row = fetch_df(
            "SELECT category_id FROM products WHERE id = :pid AND active = 1", {"pid": product_id}
        )
        cat = int(row.iloc[0]["category_id"]) if not row.empty else None
        pool = art.popularity_by_category.get(cat, art.popularity)
        items = [(pid, s, POPULARITY) for pid, s in pool if pid != product_id][:k]
        metrics.inc_request("similar", POPULARITY)
        return _to_response(items, POPULARITY, art, request_id)

    sources = {
        CONTENT: art.neighbors.get(product_id, []),
        CO_PURCHASE: art.rules.get(product_id, []),
        COLLABORATIVE: art.cf.item_neighbors.get(product_id, []) if art.cf else [],
        POPULARITY: art.popularity[:40],
    }
    weights = {
        CONTENT: settings.w_similar_content,
        CO_PURCHASE: settings.w_similar_copurchase,
        COLLABORATIVE: settings.w_similar_collaborative,
        POPULARITY: settings.w_similar_popularity,
    }
    pool = blend(sources, weights, exclude={product_id})
    exposure = category_exposure(user_id, session_id, art)
    pool = apply_fatigue(pool, exposure, art)
    items = mmr_rerank(pool, k, settings.mmr_lambda, art)
    # PDP không fetch interactions (giữ latency) — proxy "session mới" từ exposure:
    # đã từng thấy impression nào trong 14 ngày thì không còn là khách mới.
    items = maybe_explore(
        items, k, user_id, session_id, art, exposure,
        interaction_categories=[], exclude={product_id}, request_id=request_id,
        interaction_count=settings.bandit_new_session_max_interactions if exposure else 0,
    )
    source = _majority_source(items)
    metrics.inc_request("similar", source)
    return _to_response(items, source, art, request_id)


@app.get("/recommend/home", response_model=RecResponse)
def recommend_home(
    session_id: str | None = Query(None, max_length=64),
    user_id: int | None = None,  # Java resolve từ JWT — không bao giờ nhận từ FE
    k: int = Query(12, ge=1, le=50),
):
    art = _art()
    request_id = uuid.uuid4().hex
    interactions = _fetch_interactions(user_id, session_id)

    if interactions is None or interactions.empty:
        items = [(pid, s, POPULARITY) for pid, s in art.popularity[: max(k * 3, 30)]]
        items = mmr_rerank(items, k, settings.mmr_lambda, art)
        # Khách hoàn toàn mới vẫn explore được (identity = session_id) — bandit thu tín hiệu
        # cold-start sớm; exposure rỗng vì chưa có impression nào.
        items = maybe_explore(
            items, k, user_id, session_id, art, exposure={},
            interaction_categories=[], exclude=set(), request_id=request_id,
            interaction_count=0,
        )
        metrics.inc_request("home", POPULARITY)
        return _to_response(items, POPULARITY, art, request_id)

    profile, interaction_categories, seen = _profile_scores(interactions, art)
    sources = {
        CONTENT: sorted(profile.items(), key=lambda x: -x[1])[:60],
        COLLABORATIVE: user_scores(art.cf, user_id) if (art.cf and user_id is not None) else [],
        POPULARITY: art.popularity[:40],
    }
    weights = {
        CONTENT: settings.w_home_content,
        COLLABORATIVE: settings.w_home_collaborative,
        POPULARITY: settings.w_home_popularity,
    }
    pool = blend(sources, weights, exclude=seen)
    exposure = category_exposure(user_id, session_id, art)
    pool = apply_fatigue(pool, exposure, art)
    lam = adaptive_lambda(interaction_categories)
    items = mmr_rerank(pool, k, lam, art)
    items = maybe_explore(
        items, k, user_id, session_id, art, exposure,
        interaction_categories=interaction_categories, exclude=seen, request_id=request_id,
        interaction_count=len(interactions),
    )
    source = _majority_source(items)
    metrics.inc_request("home", source)
    return _to_response(items, source, art, request_id)


@app.get("/recommend/cart", response_model=RecResponse)
def recommend_cart(
    product_ids: str = Query(..., description="Comma-separated, VD: 3,15,22"),
    session_id: str | None = Query(None, max_length=64),
    user_id: int | None = None,  # Java resolve từ JWT — không bao giờ nhận từ FE
    k: int = Query(6, ge=1, le=50),
):
    art = _art()
    request_id = uuid.uuid4().hex
    try:
        cart_pids = {int(x) for x in product_ids.split(",") if x.strip()}
    except ValueError:
        raise HTTPException(status_code=422, detail="product_ids không hợp lệ")
    if not cart_pids:
        raise HTTPException(status_code=422, detail="product_ids rỗng")

    copurchase_scores: dict[int, float] = {}
    for pid in cart_pids:
        for consequent, score in art.rules.get(pid, []):
            copurchase_scores[consequent] = copurchase_scores.get(consequent, 0.0) + score
    if not copurchase_scores:
        metrics.inc_copurchase_empty()

    content_scores: dict[int, float] = {}
    for pid in cart_pids:
        for nbr, sim in art.neighbors.get(pid, []):
            content_scores[nbr] = content_scores.get(nbr, 0.0) + sim / len(cart_pids)

    sources = {
        CO_PURCHASE: sorted(copurchase_scores.items(), key=lambda x: -x[1]),
        CONTENT: sorted(content_scores.items(), key=lambda x: -x[1])[:60],
        COLLABORATIVE: item_scores(art.cf, cart_pids) if art.cf else [],
        POPULARITY: art.popularity[:40],
    }
    weights = {
        CO_PURCHASE: settings.w_cart_copurchase,
        CONTENT: settings.w_cart_content,
        COLLABORATIVE: settings.w_cart_collaborative,
        POPULARITY: settings.w_cart_popularity,
    }
    pool = blend(sources, weights, exclude=cart_pids)
    exposure = category_exposure(user_id, session_id, art)
    pool = apply_fatigue(pool, exposure, art)
    items = mmr_rerank(pool, k, settings.mmr_lambda, art)
    # Cart không fetch interactions — cùng proxy "session mới" từ exposure như PDP
    items = maybe_explore(
        items, k, user_id, session_id, art, exposure,
        interaction_categories=[], exclude=cart_pids, request_id=request_id,
        interaction_count=settings.bandit_new_session_max_interactions if exposure else 0,
    )
    source = _majority_source(items)
    metrics.inc_request("cart", source)
    return _to_response(items, source, art, request_id)
