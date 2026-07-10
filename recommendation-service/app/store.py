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
