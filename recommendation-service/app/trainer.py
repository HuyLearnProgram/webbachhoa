"""train_all(): build toàn bộ artifact rồi swap nguyên khối vào ModelStore."""

import logging
import time
from datetime import datetime

from app.candidates import co_purchase, content_based, popularity
from app.config import settings
from app.metrics import metrics
from app.store import ModelArtifacts, store

logger = logging.getLogger(__name__)


def train_all() -> ModelArtifacts:
    t0 = time.perf_counter()

    matrix, product_ids, pid_to_idx, neighbors = content_based.build(settings.top_k_neighbors)
    rules = co_purchase.build()
    pop, pop_by_category, pid_to_category = popularity.build()

    elapsed = time.perf_counter() - t0
    artifacts = ModelArtifacts(
        model_version=datetime.now().isoformat(timespec="seconds"),
        tfidf_matrix=matrix,
        product_ids=product_ids,
        pid_to_idx=pid_to_idx,
        neighbors=neighbors,
        rules=rules,
        popularity=pop,
        popularity_by_category=pop_by_category,
        pid_to_category=pid_to_category,
        last_train_seconds=round(elapsed, 2),
    )
    store.swap(artifacts)
    metrics.last_train_at = artifacts.model_version
    metrics.last_train_seconds = artifacts.last_train_seconds
    logger.info(
        "Train xong trong %.2fs: %d sản phẩm, %d co-purchase antecedent.",
        elapsed, len(product_ids), len(rules),
    )
    return artifacts
