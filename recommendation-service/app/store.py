import threading
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ModelArtifacts:
    """Toàn bộ artifact của 1 lần train — swap nguyên khối, không có trạng thái nửa vời."""

    model_version: str
    # Content-based
    tfidf_matrix: Any  # scipy sparse, hàng thứ i ứng với product_ids[i], đã l2-normalize
    product_ids: list[int]
    pid_to_idx: dict[int, int]
    neighbors: dict[int, list[tuple[int, float]]]  # pid -> [(pid2, cosine)] top-K
    # Co-purchase
    rules: dict[int, list[tuple[int, float]]]  # pid -> [(pid2, score)]
    # Popularity
    popularity: list[tuple[int, float]]  # sorted desc, không bao giờ rỗng khi có catalog
    popularity_by_category: dict[int, list[tuple[int, float]]]
    pid_to_category: dict[int, int]
    # Collaborative filtering (Phase 2) — CFModel | None (Any tránh import vòng);
    # None = guard chưa đủ dữ liệu / tắt, mọi nơi dùng phải chịu được None.
    cf: Any = None
    # Chu kỳ mua lại ước tính mỗi sản phẩm (ngày) — dùng chung bởi collaborative.py (lúc train)
    # và main._profile_scores (lúc serve) để hãm tín hiệu mua thật ngay sau khi mua.
    repurchase_cycle_days: dict = field(default_factory=dict)
    # Meta
    last_train_seconds: float = 0.0
    extras: dict = field(default_factory=dict)


class ModelStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._artifacts: ModelArtifacts | None = None

    def get(self) -> ModelArtifacts | None:
        with self._lock:
            return self._artifacts

    def swap(self, artifacts: ModelArtifacts) -> None:
        with self._lock:
            self._artifacts = artifacts


store = ModelStore()
