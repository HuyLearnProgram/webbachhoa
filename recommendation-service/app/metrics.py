import threading
from collections import defaultdict


class Metrics:
    """Counter in-process đơn giản — đủ cho Phase 1, chưa cần Prometheus."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._requests: dict[str, int] = defaultdict(int)
        self._served_by_source: dict[str, int] = defaultdict(int)
        self._copurchase_empty_serves = 0
        self.last_train_at: str | None = None
        self.last_train_seconds: float | None = None

    def inc_request(self, endpoint: str, algorithm_source: str | None = None) -> None:
        with self._lock:
            self._requests[endpoint] += 1
            if algorithm_source:
                self._served_by_source[algorithm_source] += 1

    def inc_copurchase_empty(self) -> None:
        with self._lock:
            self._copurchase_empty_serves += 1

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "requests": dict(self._requests),
                "served_by_source": dict(self._served_by_source),
                "copurchase_empty_serves": self._copurchase_empty_serves,
                "last_train_at": self.last_train_at,
                "last_train_seconds": self.last_train_seconds,
            }


metrics = Metrics()
