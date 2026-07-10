import threading
from collections import defaultdict


class Metrics:
    """Counter in-process đơn giản — đủ cho Phase 1, chưa cần Prometheus."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._requests: dict[str, int] = defaultdict(int)
        self._served_by_source: dict[str, int] = defaultdict(int)
        self._copurchase_empty_serves = 0
        self._fatigue_applied_serves = 0
        self._bandit_explore_served = 0
        self._bandit_rewards_applied: dict[str, int] = defaultdict(int)
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

    def inc_fatigue_applied(self) -> None:
        with self._lock:
            self._fatigue_applied_serves += 1

    def inc_bandit_explore(self, n: int = 1) -> None:
        with self._lock:
            self._bandit_explore_served += n

    def inc_bandit_reward(self, kind: str, n: int = 1) -> None:
        """kind: click | purchase | no_click | discarded"""
        with self._lock:
            self._bandit_rewards_applied[kind] += n

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "requests": dict(self._requests),
                "served_by_source": dict(self._served_by_source),
                "copurchase_empty_serves": self._copurchase_empty_serves,
                "fatigue_applied_serves": self._fatigue_applied_serves,
                "bandit_explore_served": self._bandit_explore_served,
                "bandit_rewards_applied": dict(self._bandit_rewards_applied),
                "last_train_at": self.last_train_at,
                "last_train_seconds": self.last_train_seconds,
            }


metrics = Metrics()
