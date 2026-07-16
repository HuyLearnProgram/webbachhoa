"""Chèn slot explore của LinUCB vào slate sau MMR (Phase 3).

Explore 1-2 slot/slate để thử category NGOÀI vùng quen của user (chống filter bubble
chủ động — khác fatigue là phản ứng thụ động). Item explore mang source=BANDIT_EXPLORE,
FE log per-item để poll reward join lại qua (request_id, product_id).

A/B gate: cohort bandit-on/off theo CRC32(identity) % 100 — deterministic, recompute được
trong MySQL lúc phân tích (CRC32 MySQL trùng chuẩn zlib), không cần cột DB mới.

Mọi exception → trả slate nguyên vẹn. Bandit không bao giờ được phép làm hỏng gợi ý chính.
"""

import logging
import random
import zlib
from collections import Counter

from app.bandit.linucb import build_context_base, entropy_norm, linucb, make_context
from app.bandit.state import state
from app.config import settings
from app.metrics import metrics

logger = logging.getLogger(__name__)

BANDIT_EXPLORE = "BANDIT_EXPLORE"


def in_bandit_cohort(user_id: int | None, session_id: str | None) -> bool:
    """True nếu identity thuộc cohort bandit-on. Ưu tiên user_id (ổn định qua thiết bị),
    guest theo session_id. Không identity → không bandit (không log decision được)."""
    key = str(user_id) if user_id is not None else session_id
    if not key:
        return False
    if not settings.ab_bandit_enabled:
        return True  # tắt A/B = bật bandit cho mọi người (vẫn cần bandit_enabled)
    return zlib.crc32(key.encode("utf-8")) % 100 < settings.ab_bandit_pct


def _explore_positions(k: int, n_items: int) -> list[int]:
    n_slots = 1 if k < settings.bandit_min_slate_for_two_slots else 2
    positions = []
    for raw in settings.bandit_explore_positions.split(",")[:n_slots]:
        try:
            pos = int(raw.strip())
        except ValueError:
            continue
        positions.append(min(pos, max(n_items - 1, 0)))
    if not positions:
        # Toàn bộ entry trong bandit_explore_positions parse lỗi (VD gõ nhầm "2_7" thay vì "2,7") —
        # explore bị tắt HOÀN TOÀN từ đây trở đi mà không có dấu hiệu gì khác (bandit_enabled vẫn
        # True trên dashboard), dễ đánh lừa người vận hành tưởng bandit vẫn chạy bình thường.
        logger.warning(
            "bandit_explore_positions='%s' không parse được vị trí nào hợp lệ — explore đang bị tắt.",
            settings.bandit_explore_positions,
        )
    return sorted(set(positions))


def maybe_explore(
    items: list[tuple[int, float, str]],
    k: int,
    user_id: int | None,
    session_id: str | None,
    art,
    exposure: dict[int, float],
    interaction_categories: list[int],
    exclude: set[int],
    request_id: str,
    interaction_count: int,
) -> list[tuple[int, float, str]]:
    """Thay 1-2 item cuối slate (điểm thấp nhất) bằng item explore chèn vào vị trí giữa
    (không để ô cuối — position bias đè CTR explore). Trả items mới hoặc nguyên vẹn."""
    try:
        if not settings.bandit_enabled or len(items) < 4:
            return items
        if not in_bandit_cohort(user_id, session_id):
            return items

        # Eligible arms: category còn "ngoài vùng quen" — loại category đã chiếm nhiều chỗ
        # trong slate organic. popularity_by_category đã lọc active=1 AND quantity>0 lúc train.
        slate_cats = Counter(
            art.pid_to_category.get(pid) for pid, _, _ in items if pid in art.pid_to_category
        )
        eligible = [
            cat for cat in art.popularity_by_category
            if slate_cats.get(cat, 0) < settings.bandit_max_slate_category_items
        ]
        if not eligible:
            return items

        base = build_context_base()
        is_new = interaction_count < settings.bandit_new_session_max_interactions
        ent = entropy_norm(interaction_categories, len(art.popularity_by_category))
        contexts = {
            cat: make_context(base, is_new, ent, exposure.get(cat, 0.0)) for cat in eligible
        }
        ranked_arms = linucb.select(list(contexts.items()))

        positions = _explore_positions(k, len(items))
        if not positions:
            return items

        new_items = list(items)
        used_pids = {pid for pid, _, _ in new_items} | set(exclude)
        used_cats: set[int] = set()
        inserted = 0
        for pos in positions:
            picked = None
            for cat in ranked_arms:
                if cat in used_cats:
                    continue
                pool = [
                    (pid, s) for pid, s in art.popularity_by_category.get(cat, [])[: settings.bandit_pick_top_n]
                    if pid not in used_pids
                ]
                if not pool:
                    continue
                weights = [max(s, 1e-6) for _, s in pool]
                pid = random.choices([p for p, _ in pool], weights=weights)[0]
                picked = (cat, pid)
                break
            if picked is None:
                continue  # hết arm hợp lệ — bỏ slot này
            cat, pid = picked
            # Bỏ item cuối (điểm thấp nhất sau MMR) để giữ nguyên độ dài slate
            new_items.pop()
            insert_at = min(pos, len(new_items))
            new_items.insert(insert_at, (pid, 0.0, BANDIT_EXPLORE))
            used_pids.add(pid)
            used_cats.add(cat)
            state.add_decision(request_id, pid, cat, contexts[cat])
            inserted += 1

        if inserted:
            metrics.inc_bandit_explore(inserted)
        return new_items
    except Exception:
        logger.exception("Bandit explore lỗi — trả slate nguyên vẹn.")
        return items
