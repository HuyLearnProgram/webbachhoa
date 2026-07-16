"""Blend layer: min-max normalize từng nguồn → nhân trọng số → cộng dồn → dedupe → pool."""

from app.config import settings


def normalize_scores(items: list[tuple[int, float]]) -> list[tuple[int, float]]:
    if not items:
        return []
    scores = [s for _, s in items]
    lo, hi = min(scores), max(scores)
    if hi == lo:
        return [(pid, 1.0) for pid, _ in items]
    return [(pid, (s - lo) / (hi - lo)) for pid, s in items]


def blend(
    sources: dict[str, list[tuple[int, float]]],
    weights: dict[str, float],
    exclude: set[int] | None = None,
    pool_size: int | None = None,
) -> list[tuple[int, float, str]]:
    """sources: {source_name: [(pid, raw_score)]}. Trả về [(pid, score, top_source)] sorted desc.

    source của item = nguồn đóng góp điểm lớn nhất (dùng gán algorithmSource khi log impression).
    """
    exclude = exclude or set()
    pool_size = pool_size or settings.pool_size

    combined: dict[int, float] = {}
    top_contrib: dict[int, tuple[str, float]] = {}
    for name, items in sources.items():
        weight = weights.get(name, 0.0)
        if weight <= 0:
            continue
        for pid, norm_score in normalize_scores(items):
            if pid in exclude:
                continue
            contribution = weight * norm_score
            combined[pid] = combined.get(pid, 0.0) + contribution
            if pid not in top_contrib or contribution > top_contrib[pid][1]:
                top_contrib[pid] = (name, contribution)

    ranked = sorted(combined.items(), key=lambda x: -x[1])[:pool_size]
    return [(pid, score, top_contrib[pid][0]) for pid, score in ranked]
