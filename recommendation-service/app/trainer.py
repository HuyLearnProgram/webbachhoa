"""train_all(): build toàn bộ artifact rồi swap nguyên khối vào ModelStore."""

import logging
import time
from datetime import datetime, timezone

from app.candidates import co_purchase, collaborative, content_based, popularity, repurchase
from app.config import settings
from app.metrics import metrics
from app.search import embeddings, lexical
from app.store import ModelArtifacts, store

logger = logging.getLogger(__name__)


def train_all(force_cf: bool = False) -> ModelArtifacts:
    t0 = time.perf_counter()

    matrix, product_ids, pid_to_idx, neighbors, vectorizer, catalog_df = content_based.build(
        settings.top_k_neighbors
    )
    rules = co_purchase.build()
    pop, pop_by_category, pid_to_category = popularity.build()
    cf, cycle_days = _train_cf(force_cf)
    emb_matrix = _build_embeddings(catalog_df, product_ids)
    name_norm = (
        {int(pid): lexical.normalize(name) for pid, name in
         zip(catalog_df["id"], catalog_df["product_name"])}
        if not catalog_df.empty else {}
    )

    elapsed = time.perf_counter() - t0
    artifacts = ModelArtifacts(
        # UTC naive — nhất quán với mọi timestamp khác trong codebase (collaborative.py/fatigue.py/
        # main.py đều dùng datetime.now(timezone.utc).replace(tzinfo=None)), tránh nhầm lẫn khi debug
        # trên server múi giờ khác UTC (trước đây dùng giờ local).
        model_version=datetime.now(timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds"),
        tfidf_matrix=matrix,
        product_ids=product_ids,
        pid_to_idx=pid_to_idx,
        neighbors=neighbors,
        rules=rules,
        popularity=pop,
        popularity_by_category=pop_by_category,
        pid_to_category=pid_to_category,
        cf=cf,
        popularity_lookup=dict(pop),
        repurchase_cycle_days=cycle_days,
        emb_matrix=emb_matrix,
        name_norm=name_norm,
        tfidf_vectorizer=vectorizer,
        last_train_seconds=round(elapsed, 2),
    )
    store.swap(artifacts)
    metrics.last_train_at = artifacts.model_version
    metrics.last_train_seconds = artifacts.last_train_seconds
    logger.info(
        "Train xong trong %.2fs: %d sản phẩm, %d co-purchase antecedent, CF %s.",
        elapsed, len(product_ids), len(rules),
        "off" if cf is None else f"{len(cf.uid_to_idx)}u/{len(cf.item_ids)}i ({cf.backend})",
    )
    return artifacts


def _build_embeddings(catalog_df, product_ids: list[int]):
    """Embedding catalog cho Smart Search — lỗi encode KHÔNG được giết các artifact khác
    (giống pattern _train_cf). Carry-forward emb cũ CHỈ khi danh sách product_ids y hệt
    (ma trận thẳng hàng theo vị trí — catalog đổi là phải build lại, cache npz lo phần rẻ)."""
    try:
        return embeddings.build(catalog_df)
    except Exception:
        logger.exception("Search embedding build lỗi — nhánh semantic tắt kỳ này.")
        prev = store.get()
        if prev is not None and prev.emb_matrix is not None and prev.product_ids == product_ids:
            logger.info("Search embedding: carry-forward ma trận cũ (catalog không đổi).")
            return prev.emb_matrix
        return None


def _train_cf(force_cf: bool):
    """Hybrid cadence: dữ liệu ít → retrain nightly; volume vượt cf_nightly_max_interactions
    → giữ model cũ (carry-forward qua swap) tới khi quá cf_retrain_max_age_days.
    Lỗi CF không bao giờ được giết các nguồn còn lại. Trả về (cf, repurchase_cycle_days) —
    2 thứ luôn đi cùng nhau vì collaborative.build() dùng cycle_days để hãm tín hiệu mua thật."""
    if not settings.cf_enabled:
        return None, {}
    prev = store.get()
    prev_cf = prev.cf if prev else None
    prev_cycle_days = prev.repurchase_cycle_days if prev else {}
    try:
        if not force_cf and prev_cf is not None:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            age_days = (now - prev_cf.trained_at).total_seconds() / 86400.0
            if (
                prev_cf.n_interactions >= settings.cf_nightly_max_interactions
                and age_days < settings.cf_retrain_max_age_days
            ):
                logger.info("CF: reuse model cũ (%.1f ngày tuổi, volume lớn — cadence weekly).", age_days)
                return prev_cf, prev_cycle_days
        cycle_days = repurchase.build_cycle_days()
        return collaborative.build(cycle_days=cycle_days), cycle_days
    except Exception:
        logger.exception("CF train lỗi — nguồn CF tắt kỳ này, các nguồn khác không ảnh hưởng.")
        return prev_cf, prev_cycle_days  # giữ model cũ nếu có còn hơn mất hẳn
