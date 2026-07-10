"""FastAPI recommendation service — Phase 1: content-based + co-purchase + popularity + MMR.

Chỉ Java backend gọi service này (giữ JWT auth tập trung); không expose ra ngoài.
Java tự fallback rule-based khi service down/rỗng nên mọi endpoint được phép trả rỗng/500.
"""

import logging
import math
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Query

from app.blend import blend
from app.config import settings
from app.db import fetch_df
from app.metrics import metrics
from app.rerank.diversity import adaptive_lambda, mmr_rerank
from app.schemas import RecItem, RecResponse
from app.store import ModelArtifacts, store
from app.trainer import train_all

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

CONTENT = "CONTENT_BASED"
CO_PURCHASE = "CO_PURCHASE"
POPULARITY = "POPULARITY"

VIEWS_SQL_USER = """
SELECT product_id, viewed_at FROM product_views
WHERE user_id = :uid OR session_id = :sid
ORDER BY viewed_at DESC LIMIT 30
"""
VIEWS_SQL_SESSION = """
SELECT product_id, viewed_at FROM product_views
WHERE session_id = :sid
ORDER BY viewed_at DESC LIMIT 30
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Train đồng bộ TRƯỚC khi nhận request — không có giai đoạn "model rỗng".
    train_all()
    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(_safe_retrain, "cron", hour=settings.retrain_cron_hour)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


def _safe_retrain() -> None:
    try:
        train_all()
    except Exception:
        logger.exception("Nightly retrain lỗi — giữ nguyên model cũ.")


app = FastAPI(title="webbachhoa recommendation-service", lifespan=lifespan)


def _art() -> ModelArtifacts:
    art = store.get()
    if art is None or not art.product_ids:
        raise HTTPException(status_code=503, detail="Model chưa sẵn sàng")
    return art


def _to_response(
    items: list[tuple[int, float, str]], algorithm_source: str, art: ModelArtifacts
) -> RecResponse:
    return RecResponse(
        algorithm_source=algorithm_source,
        model_version=art.model_version,
        items=[RecItem(product_id=pid, score=round(score, 6), source=src) for pid, score, src in items],
    )


def _fetch_views(user_id: int | None, session_id: str | None):
    """View history live từ product_views (Phase 0 tracking). [] khi không có định danh."""
    if user_id is not None:
        return fetch_df(VIEWS_SQL_USER, {"uid": user_id, "sid": session_id or ""})
    if session_id:
        return fetch_df(VIEWS_SQL_SESSION, {"sid": session_id})
    return None


def _profile_scores(views, art: ModelArtifacts) -> tuple[dict[int, float], list[int], set[int]]:
    """Preference vector time-decay: score[cand] = Σ_seed exp(-Δh/τ)·cosine(seed, cand)."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # viewed_at lưu UTC (Instant)
    scores: dict[int, float] = {}
    seen: set[int] = set()
    categories: list[int] = []
    for _, row in views.iterrows():
        pid = int(row["product_id"])
        seen.add(pid)
        if pid in art.pid_to_category:
            categories.append(art.pid_to_category[pid])
        age_h = max((now - row["viewed_at"].to_pydatetime()).total_seconds() / 3600.0, 0.0)
        weight = math.exp(-age_h / settings.time_decay_tau_h)
        for nbr, sim in art.neighbors.get(pid, []):
            scores[nbr] = scores.get(nbr, 0.0) + weight * sim
    return scores, categories, seen


def _majority_source(items: list[tuple[int, float, str]]) -> str:
    counts: dict[str, int] = {}
    for _, _, src in items:
        counts[src] = counts.get(src, 0) + 1
    priority = {CO_PURCHASE: 2, CONTENT: 1, POPULARITY: 0}
    return max(counts, key=lambda s: (counts[s], priority.get(s, -1))) if counts else POPULARITY


@app.get("/health")
def health():
    art = store.get()
    return {
        "status": "ok" if art else "training",
        "model_version": art.model_version if art else None,
        "products_indexed": len(art.product_ids) if art else 0,
        "copurchase_rules": len(art.rules) if art else 0,
        "last_train_seconds": art.last_train_seconds if art else None,
    }


@app.get("/metrics")
def get_metrics():
    return metrics.snapshot()


@app.post("/internal/retrain")
def retrain():
    art = train_all()
    return {"model_version": art.model_version, "last_train_seconds": art.last_train_seconds}


@app.get("/recommend/similar/{product_id}", response_model=RecResponse)
def recommend_similar(product_id: int, k: int = Query(12, ge=1, le=50)):
    art = _art()

    if product_id not in art.pid_to_idx:
        # Cold-start: sản phẩm tạo sau lần train gần nhất — trả trending theo category.
        row = fetch_df(
            "SELECT category_id FROM products WHERE id = :pid AND active = 1", {"pid": product_id}
        )
        cat = int(row.iloc[0]["category_id"]) if not row.empty else None
        pool = art.popularity_by_category.get(cat, art.popularity)
        items = [(pid, s, POPULARITY) for pid, s in pool if pid != product_id][:k]
        metrics.inc_request("similar", POPULARITY)
        return _to_response(items, POPULARITY, art)

    sources = {
        CONTENT: art.neighbors.get(product_id, []),
        CO_PURCHASE: art.rules.get(product_id, []),
        POPULARITY: art.popularity[:40],
    }
    weights = {
        CONTENT: settings.w_similar_content,
        CO_PURCHASE: settings.w_similar_copurchase,
        POPULARITY: settings.w_similar_popularity,
    }
    pool = blend(sources, weights, exclude={product_id})
    items = mmr_rerank(pool, k, settings.mmr_lambda, art)
    metrics.inc_request("similar", CONTENT)
    return _to_response(items, CONTENT, art)


@app.get("/recommend/home", response_model=RecResponse)
def recommend_home(
    session_id: str | None = Query(None, max_length=64),
    user_id: int | None = None,  # Java resolve từ JWT — không bao giờ nhận từ FE
    k: int = Query(12, ge=1, le=50),
):
    art = _art()
    views = _fetch_views(user_id, session_id)

    if views is None or views.empty:
        items = [(pid, s, POPULARITY) for pid, s in art.popularity[: max(k * 3, 30)]]
        items = mmr_rerank(items, k, settings.mmr_lambda, art)
        metrics.inc_request("home", POPULARITY)
        return _to_response(items, POPULARITY, art)

    profile, view_categories, seen = _profile_scores(views, art)
    sources = {
        CONTENT: sorted(profile.items(), key=lambda x: -x[1])[:60],
        POPULARITY: art.popularity[:40],
    }
    weights = {CONTENT: settings.w_home_content, POPULARITY: settings.w_home_popularity}
    pool = blend(sources, weights, exclude=seen)
    lam = adaptive_lambda(view_categories)
    items = mmr_rerank(pool, k, lam, art)
    metrics.inc_request("home", CONTENT)
    return _to_response(items, CONTENT, art)


@app.get("/recommend/cart", response_model=RecResponse)
def recommend_cart(
    product_ids: str = Query(..., description="Comma-separated, VD: 3,15,22"),
    k: int = Query(6, ge=1, le=50),
):
    art = _art()
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
        POPULARITY: art.popularity[:40],
    }
    weights = {
        CO_PURCHASE: settings.w_cart_copurchase,
        CONTENT: settings.w_cart_content,
        POPULARITY: settings.w_cart_popularity,
    }
    pool = blend(sources, weights, exclude=cart_pids)
    items = mmr_rerank(pool, k, settings.mmr_lambda, art)
    source = _majority_source(items)
    metrics.inc_request("cart", source)
    return _to_response(items, source, art)
