"""LinUCB disjoint (Phase 3) — arms = category_id, chọn category để explore mỗi slate.

UCB(arm, x) = θᵀx + α·√(xᵀA⁻¹x)   với θ = A⁻¹b, A = I + Σxxᵀ, b = Σr·x
Cold-start: A=I, b=0 → θ=0 → mọi arm chỉ khác nhau qua uncertainty term ≈ nhau
→ tie-break random = explore đều các category, không cần warm-up riêng.

Context vector d=8 (roadmap chốt: giờ/ngày, session mới/cũ, category-entropy, fatigue):
  [bias, sin(2πh/24), cos(2πh/24), sin(2πdow/7), cos(2πdow/7),
   is_new_session, entropy_norm, arm_fatigue_norm]
Chỉ arm_fatigue_norm phụ thuộc arm — LinUCB tự học "fatigue cao → reward thấp"
(damping tự nhiên với vòng lặp fatigue × explore, không cần rule riêng).
"""

import logging
import math
import random
import threading
from collections import Counter
from datetime import datetime, timezone

import numpy as np

from app.bandit.state import state
from app.config import settings

logger = logging.getLogger(__name__)

DIM = 8


def build_context_base() -> np.ndarray:
    """6 chiều đầu (không phụ thuộc arm) — giờ/ngày mã hoá sin/cos giữ tính tuần hoàn."""
    now = datetime.now(timezone.utc)
    h, dow = now.hour, now.weekday()
    return np.array([
        1.0,
        math.sin(2 * math.pi * h / 24), math.cos(2 * math.pi * h / 24),
        math.sin(2 * math.pi * dow / 7), math.cos(2 * math.pi * dow / 7),
        0.0,  # is_new_session — điền sau
    ], dtype=np.float64)


def entropy_norm(category_ids: list[int], n_categories: int) -> float:
    """Entropy phân phối category của lịch sử tương tác, chuẩn hoá về [0,1]."""
    if not category_ids:
        return 0.0
    counts = Counter(category_ids)
    total = sum(counts.values())
    entropy = -sum((c / total) * math.log2(c / total) for c in counts.values())
    max_entropy = math.log2(max(n_categories, 2))
    return min(entropy / max_entropy, 1.0)


def make_context(base: np.ndarray, is_new_session: bool, entropy: float, arm_fatigue: float) -> np.ndarray:
    x = np.empty(DIM, dtype=np.float64)
    x[:6] = base
    x[5] = 1.0 if is_new_session else 0.0
    x[6] = entropy
    x[7] = min(arm_fatigue, 5.0) / 5.0
    return x


class LinUCB:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        # {category_id: [A (8×8), b (8,), n_updates]}
        self._arms: dict[int, list] = {
            cat: [a, b, n] for cat, (a, b, n) in state.load_arms(DIM).items()
        }
        if self._arms:
            logger.info("LinUCB nạp %d arms từ state.", len(self._arms))

    def _get_arm(self, category_id: int) -> list:
        if category_id not in self._arms:
            self._arms[category_id] = [np.eye(DIM), np.zeros(DIM), 0]
        return self._arms[category_id]

    def ucb(self, category_id: int, x: np.ndarray) -> float:
        with self._lock:
            a, b, _ = self._get_arm(category_id)
            # Gộp 2 lần np.linalg.solve(a, ...) (cho theta và cho bonus term) thành 1 lần solve với
            # 2 vế phải cùng lúc (chia sẻ chung 1 lần phân rã LU của ma trận a) — kết quả numeric
            # giống hệt (cùng thuật toán LAPACK gesv bên dưới), chỉ giảm số lần factorize ma trận.
            sol = np.linalg.solve(a, np.column_stack([b, x]))
            theta, a_inv_x = sol[:, 0], sol[:, 1]
            return float(theta @ x + settings.bandit_alpha * math.sqrt(max(x @ a_inv_x, 0.0)))

    def select(self, scored_arms: list[tuple[int, np.ndarray]]) -> list[int]:
        """Trả danh sách arm sort theo UCB giảm dần (tie-break random) — caller thử lần
        lượt tới khi tìm được sản phẩm hợp lệ."""
        scored = [(self.ucb(cat, x), random.random(), cat) for cat, x in scored_arms]
        scored.sort(key=lambda t: (-t[0], t[1]))
        return [cat for _, _, cat in scored]

    def update(self, category_id: int, x: np.ndarray, reward: float) -> None:
        with self._lock:
            arm = self._get_arm(category_id)
            arm[0] += np.outer(x, x)
            arm[1] += reward * x
            arm[2] += 1
            # .copy() — a/b nếu không copy là alias của arm[0]/arm[1], save_arm() chạy NGOÀI lock nên
            # 1 update() khác (nếu kiến trúc sau này cho phép chạy đồng thời) có thể mutate in-place
            # trước khi serialize xong. Hiện tại scheduler chạy max_instances=1 nên an toàn, đây là
            # phòng vệ cho tương lai, không đổi giá trị số học nào.
            a, b, n = arm[0].copy(), arm[1].copy(), arm[2]
        state.save_arm(category_id, a, b, n)

    def n_arms(self) -> int:
        with self._lock:
            return len(self._arms)


linucb = LinUCB()
