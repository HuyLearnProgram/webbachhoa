"""Metrics đo lường continual learning (Phase 3) — tính từ recommendation_impressions.

6 khối theo roadmap mục 4 "Đo lường hiệu quả": CTR/CVR theo placement×source, intra-list
diversity (1 − mean pairwise cosine cùng requestId), category entropy shown vs clicked theo
tuần, catalog coverage 30d, repeat-impression-no-click theo category, so sánh cohort A/B.

Mỗi khối try/except riêng — 1 khối lỗi trả None, không giết cả report. Cache in-memory TTL
ngắn vì các query GROUP BY quét bảng impressions ngày càng phình (dashboard admin refresh
thoải mái không đập DB).

A/B cohort recompute bằng CRC32 ngay trong MySQL — trùng chuẩn zlib.crc32 phía serve
(explore.py), nên không cần cột variant trong DB.
"""

import logging
import math
import threading
import time
from datetime import datetime, timedelta, timezone

import numpy as np

from app.config import settings
from app.db import fetch_df

logger = logging.getLogger(__name__)

_cache_lock = threading.Lock()
_cache: dict[int, tuple[float, dict]] = {}  # days -> (fetched_at, report)


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _ctr_by_placement_source(cutoff: datetime) -> list[dict]:
    df = fetch_df(
        """
        SELECT placement, algorithm_source,
               COUNT(*) AS impressions, SUM(clicked) AS clicks, SUM(converted) AS conversions
        FROM recommendation_impressions
        WHERE shown_at >= :cutoff
        GROUP BY placement, algorithm_source
        ORDER BY placement, impressions DESC
        """,
        {"cutoff": cutoff},
    )
    rows = []
    for r in df.itertuples(index=False):
        imp = int(r.impressions)
        rows.append({
            "placement": r.placement,
            "algorithm_source": r.algorithm_source,
            "impressions": imp,
            "clicks": int(r.clicks or 0),
            "conversions": int(r.conversions or 0),
            "ctr": round((r.clicks or 0) / imp, 4) if imp else 0.0,
            "cvr": round((r.conversions or 0) / imp, 4) if imp else 0.0,
        })
    return rows


def _intra_list_diversity(art) -> list[dict]:
    """1 − mean pairwise cosine (TF-IDF, đã l2-norm → gram = cosine) mỗi slate ≥2 item,
    trung bình theo placement. Lấy mẫu ~5000 impression gần nhất để bound chi phí."""
    df = fetch_df(
        """
        SELECT request_id, product_id, placement
        FROM recommendation_impressions
        ORDER BY id DESC LIMIT 5000
        """,
        {},
    )
    if df.empty or art.tfidf_matrix is None:
        return []
    per_placement: dict[str, list[float]] = {}
    for (placement, _), grp in df.groupby(["placement", "request_id"]):
        idx = [art.pid_to_idx[int(p)] for p in grp["product_id"] if int(p) in art.pid_to_idx]
        if len(idx) < 2:
            continue
        sub = art.tfidf_matrix[idx]
        gram = (sub @ sub.T).toarray()
        n = gram.shape[0]
        off_diag = (gram.sum() - np.trace(gram)) / (n * (n - 1))
        per_placement.setdefault(placement, []).append(1.0 - float(off_diag))
    return [
        {"placement": pl, "diversity": round(sum(v) / len(v), 4), "slates": len(v)}
        for pl, v in sorted(per_placement.items())
    ]


def _weekly_entropy(cutoff: datetime) -> list[dict]:
    df = fetch_df(
        """
        SELECT YEARWEEK(ri.shown_at, 3) AS yw, p.category_id, ri.clicked, COUNT(*) AS n
        FROM recommendation_impressions ri
        JOIN products p ON p.id = ri.product_id
        WHERE ri.shown_at >= :cutoff
        GROUP BY yw, p.category_id, ri.clicked
        """,
        {"cutoff": cutoff},
    )
    if df.empty:
        return []

    def entropy(counts: dict[int, int]) -> float:
        total = sum(counts.values())
        if total == 0:
            return 0.0
        return round(-sum((c / total) * math.log2(c / total) for c in counts.values() if c), 4)

    weeks: dict[int, dict] = {}
    for r in df.itertuples(index=False):
        wk = weeks.setdefault(int(r.yw), {"shown": {}, "clicked": {}})
        cat, n = int(r.category_id), int(r.n)
        wk["shown"][cat] = wk["shown"].get(cat, 0) + n
        if r.clicked:
            wk["clicked"][cat] = wk["clicked"].get(cat, 0) + n
    return [
        {"yearweek": yw, "entropy_shown": entropy(d["shown"]), "entropy_clicked": entropy(d["clicked"]),
         "impressions": sum(d["shown"].values())}
        for yw, d in sorted(weeks.items())
    ]


def _catalog_coverage_30d() -> dict:
    cutoff = _now() - timedelta(days=30)
    df = fetch_df(
        """
        SELECT
          (SELECT COUNT(DISTINCT product_id) FROM recommendation_impressions WHERE shown_at >= :cutoff)
            AS covered,
          (SELECT COUNT(*) FROM products WHERE active = 1) AS total_active
        """,
        {"cutoff": cutoff},
    )
    covered, total = int(df.iloc[0]["covered"]), int(df.iloc[0]["total_active"])
    return {
        "covered_products": covered,
        "total_active_products": total,
        "coverage": round(covered / total, 4) if total else 0.0,
    }


def _repeat_no_click_by_category(cutoff: datetime) -> list[dict]:
    """Tỉ lệ impression lặp lại (lần thứ 2+ của cùng identity×product) mà vẫn không có click
    — phải giảm dần sau khi fatigue-decay chạy production (roadmap mục 4)."""
    df = fetch_df(
        """
        SELECT p.category_id, t.n, t.any_click
        FROM (
          SELECT product_id, COALESCE(CAST(user_id AS CHAR), session_id) AS identity,
                 COUNT(*) AS n, MAX(clicked) AS any_click
          FROM recommendation_impressions
          WHERE shown_at >= :cutoff
          GROUP BY product_id, identity
        ) t
        JOIN products p ON p.id = t.product_id
        """,
        {"cutoff": cutoff},
    )
    if df.empty:
        return []
    agg: dict[int, dict] = {}
    for r in df.itertuples(index=False):
        a = agg.setdefault(int(r.category_id), {"repeat_no_click": 0, "total": 0})
        n = int(r.n)
        a["total"] += n
        if n > 1 and not r.any_click:
            a["repeat_no_click"] += n - 1
    return [
        {"category_id": cat, "rate": round(v["repeat_no_click"] / v["total"], 4), "impressions": v["total"]}
        for cat, v in sorted(agg.items())
        if v["total"] > 0
    ]


def _ab_cohorts(cutoff: datetime) -> dict:
    df = fetch_df(
        """
        SELECT (CRC32(COALESCE(CAST(user_id AS CHAR), session_id)) % 100 < :pct) AS bandit_on,
               COUNT(*) AS impressions, SUM(clicked) AS clicks, SUM(converted) AS conversions
        FROM recommendation_impressions
        WHERE shown_at >= :cutoff AND (user_id IS NOT NULL OR session_id IS NOT NULL)
        GROUP BY bandit_on
        """,
        {"cutoff": cutoff, "pct": settings.ab_bandit_pct},
    )
    cohorts = {}
    for r in df.itertuples(index=False):
        imp = int(r.impressions)
        cohorts["bandit_on" if r.bandit_on else "bandit_off"] = {
            "impressions": imp,
            "clicks": int(r.clicks or 0),
            "conversions": int(r.conversions or 0),
            "ctr": round((r.clicks or 0) / imp, 4) if imp else 0.0,
            "cvr": round((r.conversions or 0) / imp, 4) if imp else 0.0,
        }
    return {
        "ab_bandit_enabled": settings.ab_bandit_enabled,
        "ab_bandit_pct": settings.ab_bandit_pct,
        "cohorts": cohorts,
    }


def build_report(days: int, art) -> dict:
    with _cache_lock:
        cached = _cache.get(days)
        if cached and time.time() - cached[0] < settings.metrics_experiment_cache_ttl_s:
            return cached[1]

    cutoff = _now() - timedelta(days=days)
    report: dict = {"days": days, "generated_at": _now().isoformat(timespec="seconds")}
    blocks = {
        "ctr_by_placement_source": lambda: _ctr_by_placement_source(cutoff),
        "intra_list_diversity": lambda: _intra_list_diversity(art),
        "weekly_entropy": lambda: _weekly_entropy(cutoff),
        "catalog_coverage_30d": _catalog_coverage_30d,
        "repeat_no_click_by_category": lambda: _repeat_no_click_by_category(cutoff),
        "ab_cohorts": lambda: _ab_cohorts(cutoff),
    }
    for name, fn in blocks.items():
        try:
            report[name] = fn()
        except Exception:
            logger.exception("Metrics block %s lỗi — trả null, không giết cả report.", name)
            report[name] = None

    with _cache_lock:
        _cache[days] = (time.time(), report)
    return report
