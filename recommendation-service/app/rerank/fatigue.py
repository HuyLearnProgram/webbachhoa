"""Category-fatigue decay (Phase 2): phạt category bị hiển thị nhiều mà không click.

Exposure tính live từ recommendation_impressions (cửa sổ fatigue_window_days, chỉ dòng
clicked = 0, decay mũ theo tuổi impression). Penalty nhân 1/(1 + beta*exposure) lên điểm
đã blend, trước MMR. Mọi lỗi → exposure rỗng, tuyệt đối không 500 request gợi ý.
"""

import logging
import math
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.db import fetch_df
from app.metrics import metrics

logger = logging.getLogger(__name__)

# Hằng số cho decay mũ half-life (~1k lần/request) — tránh gọi lại math.log(2) trong vòng lặp nóng.
_LN2 = math.log(2)

# 2 query tách riêng theo user/session — không dùng OR vì OR vô hiệu cả 2 index
# trên bảng impressions đang phình (21k+ dòng). Double-count sau session-merge chấp nhận
# được: penalty đơn điệu, beta nhỏ.
EXPOSURE_SQL_USER = """
SELECT product_id, shown_at FROM recommendation_impressions
WHERE user_id = :uid AND clicked = 0 AND shown_at >= :cutoff
ORDER BY shown_at DESC LIMIT :lim
"""
EXPOSURE_SQL_SESSION = """
SELECT product_id, shown_at FROM recommendation_impressions
WHERE session_id = :sid AND clicked = 0 AND shown_at >= :cutoff
ORDER BY shown_at DESC LIMIT :lim
"""


def category_exposure(user_id: int | None, session_id: str | None, art) -> dict[int, float]:
    """exposure[category_id] = Σ exp(-age_days*ln2/half_life) trên impression chưa click."""
    if not settings.fatigue_enabled or (user_id is None and not session_id):
        return {}
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)  # shown_at lưu UTC (Instant)
        cutoff = now - timedelta(days=settings.fatigue_window_days)
        frames = []
        if user_id is not None:
            frames.append(fetch_df(
                EXPOSURE_SQL_USER,
                {"uid": user_id, "cutoff": cutoff, "lim": settings.fatigue_max_rows},
            ))
        if session_id:
            frames.append(fetch_df(
                EXPOSURE_SQL_SESSION,
                {"sid": session_id, "cutoff": cutoff, "lim": settings.fatigue_max_rows},
            ))

        exposure: dict[int, float] = {}
        half_life = settings.fatigue_half_life_days
        for df in frames:
            for row in df.itertuples(index=False):
                cat = art.pid_to_category.get(int(row.product_id))
                if cat is None:
                    continue
                age_days = max((now - row.shown_at.to_pydatetime()).total_seconds() / 86400.0, 0.0)
                exposure[cat] = exposure.get(cat, 0.0) + math.exp(-age_days * _LN2 / half_life)
        if exposure:
            metrics.inc_fatigue_applied()
        return exposure
    except Exception:
        logger.exception("Fatigue lỗi — bỏ qua penalty kỳ này.")
        return {}


def apply_fatigue(
    pool: list[tuple[int, float, str]], exposure: dict[int, float], art
) -> list[tuple[int, float, str]]:
    """Nhân penalty 1/(1 + beta*exposure[category]) rồi sort lại. Exposure rỗng → giữ nguyên."""
    if not exposure:
        return pool
    beta = settings.fatigue_beta
    penalized = [
        (pid, score / (1.0 + beta * exposure.get(art.pid_to_category.get(pid), 0.0)), src)
        for pid, score, src in pool
    ]
    penalized.sort(key=lambda x: -x[1])
    return penalized
