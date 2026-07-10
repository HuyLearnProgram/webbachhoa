"""Reward loop của LinUCB (Phase 3) — poll recommendation_impressions định kỳ.

Không message broker (roadmap chốt: over-engineering ở quy mô này). Poll theo pending-decision
set trong SQLite chứ KHÔNG theo watermark id — vì impressions bị UPDATE tại chỗ (clicked/
converted flip sau khi insert), watermark sẽ bỏ lỡ transition.

State machine mỗi decision:
  - Không có impression row & quá bandit_impression_wait_h  → DELETE (rail chưa lọt viewport,
    không phải feedback — không thưởng không phạt).
  - converted=1  → reward purchase (+click nếu chưa thưởng) → FINAL.
  - clicked=1 chưa thưởng click → reward click, giữ PENDING chờ conversion (tới TTL).
  - clicked=0 & quá bandit_negative_after_h → reward âm nhẹ → FINAL
    (conversion đến sau thời điểm này bị bỏ qua — hiếm, đổi lấy chống double-count tuyệt đối).
Chống double-count: flag click_rewarded + status FINAL trong SQLite.
"""

import logging

from app.bandit.linucb import linucb
from app.bandit.state import state, _utcnow
from app.config import settings
from app.db import fetch_df
from app.metrics import metrics

logger = logging.getLogger(__name__)

_CHUNK = 500  # IN (...) theo chunk — trúng index idx_ri_request


def _fetch_impressions(request_ids: list[str]):
    """{(request_id, product_id): (clicked, converted)} cho các slot BANDIT_EXPLORE."""
    result: dict[tuple[str, int], tuple[bool, bool]] = {}
    for i in range(0, len(request_ids), _CHUNK):
        chunk = request_ids[i:i + _CHUNK]
        placeholders = ",".join(f":r{j}" for j in range(len(chunk)))
        params = {f"r{j}": rid for j, rid in enumerate(chunk)}
        df = fetch_df(
            f"SELECT request_id, product_id, clicked, converted FROM recommendation_impressions "
            f"WHERE request_id IN ({placeholders}) AND algorithm_source = 'BANDIT_EXPLORE'",
            params,
        )
        for row in df.itertuples(index=False):
            result[(str(row.request_id), int(row.product_id))] = (bool(row.clicked), bool(row.converted))
    return result


def process_rewards() -> None:
    purged = state.purge_older_than(settings.bandit_decision_ttl_days)
    pending = state.pending_decisions()
    if not pending:
        return

    impressions = _fetch_impressions(sorted({d["request_id"] for d in pending}))
    now = _utcnow()
    n_click = n_purchase = n_negative = n_discarded = 0

    for d in pending:
        key = (d["request_id"], d["product_id"])
        age_h = (now - d["created_at"]).total_seconds() / 3600.0
        x, arm = d["context"], d["category_id"]

        if key not in impressions:
            # FE chỉ log impression khi rail thật sự lọt viewport — chưa thấy thì không phải feedback
            if age_h > settings.bandit_impression_wait_h:
                state.delete(*key)
                n_discarded += 1
            continue

        clicked, converted = impressions[key]
        if converted:
            reward = settings.bandit_reward_purchase
            if clicked and not d["click_rewarded"]:
                reward += settings.bandit_reward_click
                n_click += 1
            linucb.update(arm, x, reward)
            state.finalize(*key)
            n_purchase += 1
        elif clicked:
            if not d["click_rewarded"]:
                linucb.update(arm, x, settings.bandit_reward_click)
                state.mark_click_rewarded(*key)
                n_click += 1
            # giữ PENDING chờ conversion tới TTL
        elif age_h > settings.bandit_negative_after_h:
            linucb.update(arm, x, settings.bandit_reward_no_click)
            state.finalize(*key)
            n_negative += 1

    if n_click or n_purchase or n_negative or n_discarded or purged:
        metrics.inc_bandit_reward("click", n_click)
        metrics.inc_bandit_reward("purchase", n_purchase)
        metrics.inc_bandit_reward("no_click", n_negative)
        metrics.inc_bandit_reward("discarded", n_discarded)
        logger.info(
            "Bandit rewards: +click=%d, +purchase=%d, -no_click=%d, discarded=%d, ttl_purged=%d "
            "(pending còn %d)",
            n_click, n_purchase, n_negative, n_discarded, purged, state.count_pending(),
        )
