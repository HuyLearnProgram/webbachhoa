"""Chu kỳ mua lại (repurchase cycle) mỗi sản phẩm — feature đặc thù grocery đã ghi trong
roadmap (Phần I mục C) nhưng chưa từng làm tới Phase 2.

Vấn đề: khách vừa mua 1 sản phẩm thường CHƯA cần mua lại ngay (đã có hàng dùng) — tín hiệu
"mua thật" không nên mạnh nhất ngay lúc vừa mua rồi giảm dần, mà phải yếu ngay sau khi mua rồi
tăng dần khi gần tới lúc hàng sắp hết. Module này suy ra "chu kỳ mua lại" ước tính (số ngày)
cho từng sản phẩm từ khoảng cách trung vị giữa các lần mua lặp lại của cùng 1 khách; sản phẩm
ít lần mua lặp (cold-start) fallback về trung vị cấp danh mục, rồi fallback về hằng số mặc định
ở nơi gọi (readiness()).
"""
import logging

import pandas as pd

from app.config import settings
from app.db import fetch_df

logger = logging.getLogger(__name__)

PURCHASE_GAPS_SQL = """
SELECT o.user_id AS user_id, od.product_id AS product_id, o.order_time AS ts,
       p.category_id AS category_id
FROM order_detail od
JOIN orders o ON o.id = od.order_id
JOIN products p ON p.id = od.product_id
WHERE o.user_id IS NOT NULL AND o.status IN (1, 2)
"""


def build_cycle_days() -> dict[int, float]:
    """product_id -> chu kỳ mua lại ước tính (ngày), đã áp fallback cấp danh mục.
    Rỗng ({}) khi chưa đủ dữ liệu — caller (readiness()) tự fallback hằng số mặc định."""
    df = fetch_df(PURCHASE_GAPS_SQL)
    if df.empty:
        return {}

    df = df.sort_values(["user_id", "product_id", "ts"])
    gap_days = df.groupby(["user_id", "product_id"])["ts"].diff().dt.total_seconds() / 86400.0
    df = df.assign(gap_days=gap_days)
    gaps = df.dropna(subset=["gap_days"])
    gaps = gaps[gaps["gap_days"] > 0]
    if gaps.empty:
        logger.info("Chu kỳ mua lại: chưa có khách nào mua lặp lại cùng sản phẩm, dùng mặc định.")
        return {}

    product_median = gaps.groupby("product_id")["gap_days"].median()
    product_count = gaps.groupby("product_id")["gap_days"].count()
    category_median = gaps.groupby("category_id")["gap_days"].median()
    pid_to_category = df.drop_duplicates("product_id").set_index("product_id")["category_id"]

    cycle: dict[int, float] = {}
    for pid, cat in pid_to_category.items():
        pid, cat = int(pid), int(cat)
        if pid in product_median.index and product_count.get(pid, 0) >= settings.repurchase_min_pairs:
            cycle[pid] = float(product_median[pid])
        elif cat in category_median.index:
            cycle[pid] = float(category_median[cat])
    logger.info("Chu kỳ mua lại: ước tính được cho %d sản phẩm.", len(cycle))
    return cycle


def readiness(age_days: float, cycle_days: float | None) -> float:
    """0 ngay sau khi mua -> tăng dần tới 1.0 khi gần/đã qua chu kỳ mua lại ước tính.
    Không suy diễn khi cycle_days rỗng/<=0 (trả 1.0 — hành vi y hệt trước khi có tính năng này)."""
    cycle = cycle_days if cycle_days and cycle_days > 0 else settings.repurchase_default_days
    if cycle <= 0:
        return 1.0
    return min(max(age_days, 0.0) / cycle, 1.0)
