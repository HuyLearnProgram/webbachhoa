"""Popularity: best-seller + trending 7/30 ngày — lưới an toàn luôn bật, không bao giờ rỗng."""

from datetime import datetime, timedelta

import pandas as pd

from app.db import fetch_df

TREND_SQL = """
SELECT od.product_id, SUM(od.quantity) AS qty
FROM order_detail od
JOIN orders o ON o.id = od.order_id
WHERE o.status IN (0, 1, 2) AND o.order_time >= :cutoff
GROUP BY od.product_id
"""


def _minmax(s: pd.Series) -> pd.Series:
    if s.empty or s.max() == s.min():
        return s * 0.0
    return (s - s.min()) / (s.max() - s.min())


def build() -> tuple[list[tuple[int, float]], dict[int, list[tuple[int, float]]], dict[int, int]]:
    """Trả về (popularity sorted desc, popularity theo category, map pid->category).

    Loại sản phẩm hết hàng (quantity = 0) ngay từ nguồn — hết hàng tạm thời vẫn active=1
    nên không gợi ý cho khách sản phẩm không thể mua được (Java hydrate cũng lọc lại lần nữa
    với tồn kho tươi nhất, đây là lớp lọc sớm giúp pool ứng viên không lãng phí chỗ).
    """
    products = fetch_df("SELECT id, sold, category_id FROM products WHERE active = 1 AND quantity > 0")
    if products.empty:
        return [], {}, {}

    def trend(days: int) -> pd.Series:
        cutoff = datetime.now() - timedelta(days=days)
        df = fetch_df(TREND_SQL, {"cutoff": cutoff})
        return df.set_index("product_id")["qty"] if not df.empty else pd.Series(dtype=float)

    products = products.set_index("id")
    score = (
        0.5 * _minmax(products["sold"].astype(float))
        + 0.35 * _minmax(trend(7).reindex(products.index).fillna(0.0))
        + 0.15 * _minmax(trend(30).reindex(products.index).fillna(0.0))
    )
    products["score"] = score

    ranked = products.sort_values("score", ascending=False)
    popularity = [(int(pid), float(s)) for pid, s in ranked["score"].items()]
    pid_to_category = {int(pid) : int(c) for pid, c in products["category_id"].items()}

    by_category: dict[int, list[tuple[int, float]]] = {}
    for cat_id, group in ranked.groupby("category_id"):
        by_category[int(cat_id)] = [(int(pid), float(s)) for pid, s in group["score"].items()]

    return popularity, by_category, pid_to_category
