"""MMR diversity re-rank — bắt buộc từ Phase 1 (chống filter bubble ngay từ đầu).

MMR(i) = λ·rel(i) − (1−λ)·max_{j∈đã chọn} cos(i, j)
λ tự hạ theo category-entropy: user có lịch sử hẹp (entropy thấp) bị ép đa dạng mạnh hơn.
"""

import math
from collections import Counter

from app.config import settings
from app.store import ModelArtifacts


def adaptive_lambda(view_category_ids: list[int]) -> float:
    """λ = clamp(0.4 + 0.3·H, λ_min, λ_default); không history → λ mặc định."""
    if not view_category_ids:
        return settings.mmr_lambda
    counts = Counter(view_category_ids)
    total = sum(counts.values())
    entropy = -sum((c / total) * math.log2(c / total) for c in counts.values())
    lam = 0.4 + 0.3 * entropy
    return max(settings.mmr_lambda_min, min(settings.mmr_lambda, lam))


def _pair_sim(pid_a: int, pid_b: int, art: ModelArtifacts) -> float:
    ia, ib = art.pid_to_idx.get(pid_a), art.pid_to_idx.get(pid_b)
    if ia is not None and ib is not None and art.tfidf_matrix is not None:
        # TF-IDF đã l2-normalize → dot = cosine
        return float(art.tfidf_matrix[ia].multiply(art.tfidf_matrix[ib]).sum())
    # Fallback khi thiếu vector: cùng category coi như trùng lặp hoàn toàn
    return 1.0 if art.pid_to_category.get(pid_a) == art.pid_to_category.get(pid_b) else 0.0


def mmr_rerank(
    candidates: list[tuple[int, float, str]],
    k: int,
    lam: float,
    art: ModelArtifacts,
) -> list[tuple[int, float, str]]:
    """candidates: [(pid, relevance, source)] đã sort desc. Trả về k item đa dạng hoá."""
    if not candidates:
        return []
    max_rel = max(score for _, score, _ in candidates) or 1.0
    pool = [(pid, score / max_rel, source) for pid, score, source in candidates]

    selected: list[tuple[int, float, str]] = []
    remaining = list(pool)
    while remaining and len(selected) < k:
        best_idx, best, best_val = None, None, -math.inf
        for idx, cand in enumerate(remaining):
            pid, rel, _ = cand
            max_sim = max((_pair_sim(pid, s[0], art) for s in selected), default=0.0)
            val = lam * rel - (1 - lam) * max_sim
            if val > best_val:
                best_idx, best, best_val = idx, cand, val
        selected.append(best)
        # pop(idx) thay remove(best) — tránh quét lại toàn bộ remaining lần 2 để tìm lại đúng phần tử
        # bằng so sánh equality (tuple có float) khi đã biết sẵn vị trí từ vòng lặp trên.
        remaining.pop(best_idx)
    return selected
