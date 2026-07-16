"""Collaborative filtering: implicit ALS trên purchase + cart-add + view (Phase 2).

Chạy "im lặng" như co-purchase: thiếu dữ liệu (guard cf_min_users/cf_min_items) → trả None,
không lỗi, log info. Chỉ dùng tương tác có user_id (guest không vào ma trận CF).
Backend "auto" thử thư viện `implicit` trước, thiếu/lỗi thì fallback solver numpy tự viết
(Hu-Koren-Volinsky) — quy mô hiện tại (<100 user × ~250 item) numpy giải trong mili-giây.
"""

import logging
import math
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import numpy as np
import scipy.sparse as sp

from app.candidates import repurchase
from app.config import settings
from app.db import fetch_df

logger = logging.getLogger(__name__)

# Hằng số cho decay mũ half-life (~10k lần/train) — tránh gọi lại math.log(2) trong vòng lặp nóng.
_LN2 = math.log(2)

# Purchase dùng cùng filter commitment với co-purchase (status 1 = đang giao, 2 = thành công).
# JOIN products + lọc active/quantity>0 ở cả 3 nhánh — giống content_based.py/popularity.py —
# tránh sản phẩm hết hàng lọt vào "vũ trụ" CF rồi bị Java lọc mất ở bước hydrate cuối cùng,
# làm danh sách trả về ngắn hơn số lượng yêu cầu (bug phát hiện sau khi dùng thật).
INTERACTIONS_SQL = """
SELECT o.user_id AS user_id, od.product_id AS product_id, o.order_time AS ts, 'P' AS kind
FROM order_detail od
JOIN orders o ON o.id = od.order_id
JOIN products p ON p.id = od.product_id
WHERE o.user_id IS NOT NULL AND o.status IN (1, 2) AND o.order_time >= :cutoff
      AND p.active = 1 AND p.quantity > 0
UNION ALL
SELECT ce.user_id, ce.product_id, ce.occurred_at, 'C'
FROM cart_events ce
JOIN products p ON p.id = ce.product_id
WHERE ce.user_id IS NOT NULL AND ce.event_type = 'ADD' AND ce.occurred_at >= :cutoff
      AND p.active = 1 AND p.quantity > 0
UNION ALL
SELECT pv.user_id, pv.product_id, pv.viewed_at, 'V'
FROM product_views pv
JOIN products p ON p.id = pv.product_id
WHERE pv.user_id IS NOT NULL AND pv.viewed_at >= :cutoff
      AND p.active = 1 AND p.quantity > 0
"""


@dataclass
class CFModel:
    user_factors: np.ndarray  # (U, f)
    item_factors: np.ndarray  # (I, f)
    uid_to_idx: dict[int, int]
    item_ids: list[int]
    iid_to_idx: dict[int, int]
    item_neighbors: dict[int, list[tuple[int, float]]]  # pid -> [(pid2, cosine)] top-K
    backend: str  # "implicit" | "numpy"
    n_interactions: int
    trained_at: datetime  # UTC naive, cho hybrid cadence ở trainer


def _kind_params() -> dict[str, tuple[float, float]]:
    return {
        "P": (settings.cf_w_purchase, settings.cf_hl_purchase_days),
        "C": (settings.cf_w_cart, settings.cf_hl_cart_days),
        "V": (settings.cf_w_view, settings.cf_hl_view_days),
    }


def build(cycle_days: dict[int, float] | None = None) -> CFModel | None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # timestamp DB lưu Instant (UTC naive)
    cutoff = now - timedelta(days=settings.cf_window_days)
    df = fetch_df(INTERACTIONS_SQL, {"cutoff": cutoff})
    if df.empty:
        logger.info("CF im lặng: 0 tương tác trong %d ngày.", settings.cf_window_days)
        return None
    if cycle_days is None:
        cycle_days = repurchase.build_cycle_days()

    # Confidence c_ui = Σ_event w_kind * exp(-age_days * ln2 / half_life_kind), cap để 1 user
    # cày view 1 sản phẩm không áp đảo ma trận. Riêng mua thật ('P') nhân thêm readiness theo
    # chu kỳ mua lại — vừa mua thì tín hiệu còn yếu, tăng dần khi gần tới lúc hết hàng, thay vì
    # coi "vừa mua" luôn là tín hiệu mạnh nhất (khách vừa mua thường CHƯA cần mua lại ngay).
    kind_params = _kind_params()
    confidence: dict[tuple[int, int], float] = {}
    for row in df.itertuples(index=False):
        w, hl = kind_params[row.kind]
        age_days = max((now - row.ts.to_pydatetime()).total_seconds() / 86400.0, 0.0)
        value = w * math.exp(-age_days * _LN2 / hl)
        if row.kind == "P":
            value *= repurchase.readiness(age_days, cycle_days.get(int(row.product_id)))
        key = (int(row.user_id), int(row.product_id))
        confidence[key] = min(confidence.get(key, 0.0) + value, settings.cf_confidence_cap)

    interactions_per_user: dict[int, int] = {}
    for uid, _ in confidence:
        interactions_per_user[uid] = interactions_per_user.get(uid, 0) + 1
    eligible_users = sorted(
        u for u, n in interactions_per_user.items() if n >= settings.cf_min_user_interactions
    )
    eligible_user_set = set(eligible_users)
    item_ids = sorted({pid for (u, pid) in confidence if u in eligible_user_set})

    if len(eligible_users) < settings.cf_min_users or len(item_ids) < settings.cf_min_items:
        logger.info(
            "CF im lặng: %d user đủ tương tác (< %d) hoặc %d item (< %d) — chờ đủ dữ liệu.",
            len(eligible_users), settings.cf_min_users, len(item_ids), settings.cf_min_items,
        )
        return None

    uid_to_idx = {u: i for i, u in enumerate(eligible_users)}
    iid_to_idx = {p: i for i, p in enumerate(item_ids)}
    rows, cols, vals = [], [], []
    for (uid, pid), c in confidence.items():
        if uid in uid_to_idx and pid in iid_to_idx:
            rows.append(uid_to_idx[uid])
            cols.append(iid_to_idx[pid])
            vals.append(c)
    C = sp.csr_matrix((vals, (rows, cols)), shape=(len(eligible_users), len(item_ids)))

    user_factors, item_factors, backend = _fit(C)

    item_neighbors = _build_item_neighbors(item_factors, item_ids)
    logger.info(
        "CF: %d user / %d item / %d tương tác (%s).",
        len(eligible_users), len(item_ids), C.nnz, backend,
    )
    return CFModel(
        user_factors=user_factors,
        item_factors=item_factors,
        uid_to_idx=uid_to_idx,
        item_ids=item_ids,
        iid_to_idx=iid_to_idx,
        item_neighbors=item_neighbors,
        backend=backend,
        n_interactions=C.nnz,
        trained_at=now,
    )


def _fit(C: sp.csr_matrix) -> tuple[np.ndarray, np.ndarray, str]:
    reg = max(settings.cf_regularization, 0.01)  # floor chống singular solve
    if settings.cf_backend in ("auto", "implicit"):
        try:
            os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")  # known hang trên Windows
            from implicit.als import AlternatingLeastSquares

            model = AlternatingLeastSquares(
                factors=settings.cf_factors,
                regularization=reg,
                iterations=settings.cf_iterations,
                alpha=settings.cf_alpha,
                random_state=42,
                use_gpu=False,
            )
            model.fit(C, show_progress=False)
            return np.asarray(model.user_factors), np.asarray(model.item_factors), "implicit"
        except Exception as e:
            if settings.cf_backend == "implicit":
                raise
            logger.warning("Backend implicit không dùng được (%s) — fallback numpy.", e)
    uf, itf = _als_numpy(
        C, settings.cf_factors, reg, settings.cf_iterations, settings.cf_alpha
    )
    return uf, itf, "numpy"


def _als_numpy(
    C: sp.csr_matrix, factors: int, reg: float, iters: int, alpha: float, seed: int = 42
) -> tuple[np.ndarray, np.ndarray]:
    """ALS chuẩn Hu-Koren-Volinsky cho implicit feedback: P=1 nơi có tương tác,
    confidence C=1+alpha*c_ui. Dense solve per user/item — đủ nhanh ở quy mô nhỏ."""
    n_users, n_items = C.shape
    rng = np.random.default_rng(seed)
    X = rng.normal(0, 0.01, (n_users, factors))
    Y = rng.normal(0, 0.01, (n_items, factors))
    Cui = C.tocsr()
    Ciu = C.T.tocsr()
    eye = reg * np.eye(factors)

    def solve_side(fixed: np.ndarray, mat: sp.csr_matrix) -> np.ndarray:
        # mat[i] = hàng confidence c của side đang giải; fixed = factor phía kia.
        FtF = fixed.T @ fixed
        out = np.zeros((mat.shape[0], factors))
        for i in range(mat.shape[0]):
            start, end = mat.indptr[i], mat.indptr[i + 1]
            idx = mat.indices[start:end]
            if len(idx) == 0:
                continue
            c = alpha * mat.data[start:end]  # C-1 = alpha*c_ui
            F = fixed[idx]
            A = FtF + F.T @ (F * c[:, None]) + eye
            b = F.T @ (1.0 + c)  # C*p với p=1 tại tương tác
            out[i] = np.linalg.solve(A, b)
        return out

    for _ in range(iters):
        X = solve_side(Y, Cui)
        Y = solve_side(X, Ciu)
    return X, Y


def _build_item_neighbors(
    item_factors: np.ndarray, item_ids: list[int]
) -> dict[int, list[tuple[int, float]]]:
    norms = np.linalg.norm(item_factors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    normed = item_factors / norms
    sims = normed @ normed.T  # dense ~250×250, trivial
    np.fill_diagonal(sims, -1.0)
    topk = min(settings.cf_item_topk, len(item_ids) - 1)
    neighbors: dict[int, list[tuple[int, float]]] = {}
    for i, pid in enumerate(item_ids):
        idx = np.argpartition(-sims[i], topk - 1)[:topk] if topk > 0 else []
        pairs = [
            (item_ids[j], float(sims[i][j]))
            for j in idx
            if sims[i][j] >= settings.cf_min_item_sim
        ]
        pairs.sort(key=lambda x: -x[1])
        if pairs:
            neighbors[pid] = pairs
    return neighbors


def user_scores(cf: CFModel, user_id: int, top_n: int = 60) -> list[tuple[int, float]]:
    """Điểm user-CF cho toàn catalog CF; [] khi user chưa có trong ma trận (cold user)."""
    idx = cf.uid_to_idx.get(user_id)
    if idx is None:
        return []
    scores = cf.user_factors[idx] @ cf.item_factors.T
    order = np.argsort(-scores)[:top_n]
    return [(cf.item_ids[i], float(scores[i])) for i in order if scores[i] > 0]


def item_scores(cf: CFModel, seed_pids: set[int]) -> list[tuple[int, float]]:
    """Cộng dồn item-item neighbors qua các seed (giống cách cart cộng content-based)."""
    agg: dict[int, float] = {}
    for pid in seed_pids:
        for nbr, sim in cf.item_neighbors.get(pid, []):
            agg[nbr] = agg.get(nbr, 0.0) + sim
    return sorted(agg.items(), key=lambda x: -x[1])
