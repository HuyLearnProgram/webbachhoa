"""Co-purchase: association rules (FP-Growth) trên order_detail theo order_id.

Chạy "im lặng": thiếu dữ liệu → rules rỗng, không lỗi, log info. Chỉ tính đơn đã cam kết
(status 1 = đang giao, 2 = thành công) — loại đơn hủy (3) và trả hàng (4, negative signal).
"""

import logging
from datetime import datetime, timedelta, timezone

from mlxtend.frequent_patterns import association_rules, fpgrowth
from mlxtend.preprocessing import TransactionEncoder
import pandas as pd

from app.config import settings
from app.db import fetch_df

logger = logging.getLogger(__name__)

BASKET_SQL = """
SELECT od.order_id, od.product_id
FROM order_detail od
JOIN orders o ON o.id = od.order_id
WHERE o.status IN (1, 2) AND o.order_time >= :cutoff
"""


def build() -> dict[int, list[tuple[int, float]]]:
    # order_time lưu Instant (UTC naive) — so bằng UTC, không dùng giờ local (lệch 7h ở VN)
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
        days=settings.copurchase_window_days
    )
    df = fetch_df(BASKET_SQL, {"cutoff": cutoff})

    transactions = [
        sorted(set(g)) for _, g in df.groupby("order_id")["product_id"] if g.nunique() >= 2
    ]
    if len(transactions) < settings.copurchase_min_transactions:
        logger.info(
            "Co-purchase im lặng: %d transaction (< %d) — rules rỗng, chờ đủ dữ liệu.",
            len(transactions), settings.copurchase_min_transactions,
        )
        return {}

    encoder = TransactionEncoder()
    onehot = pd.DataFrame(
        encoder.fit_transform(transactions), columns=encoder.columns_
    )
    min_support = max(settings.copurchase_min_pair_orders / len(transactions), 0.001)
    frequent = fpgrowth(onehot, min_support=min_support, use_colnames=True, max_len=2)
    if frequent.empty:
        logger.info("Co-purchase: không có itemset đạt min_support %.4f.", min_support)
        return {}

    rules_df = association_rules(
        frequent, metric="confidence", min_threshold=settings.copurchase_min_confidence
    )
    rules_df = rules_df[
        (rules_df["antecedents"].map(len) == 1)
        & (rules_df["consequents"].map(len) == 1)
        & (rules_df["lift"] > settings.copurchase_min_lift)
    ]

    rules: dict[int, list[tuple[int, float]]] = {}
    for _, row in rules_df.iterrows():
        antecedent = int(next(iter(row["antecedents"])))
        consequent = int(next(iter(row["consequents"])))
        score = float(row["confidence"]) * min(float(row["lift"]), 3.0) / 3.0
        rules.setdefault(antecedent, []).append((consequent, score))
    for pid in rules:
        rules[pid].sort(key=lambda x: -x[1])

    logger.info("Co-purchase: %d rule từ %d transaction.", len(rules_df), len(transactions))
    return rules
