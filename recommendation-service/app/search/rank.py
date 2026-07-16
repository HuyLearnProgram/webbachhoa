"""Xếp hạng Smart Search: candidates = lexical_ids ∪ semantic vượt ngưỡng, TRONG allowed_ids.

score(p) = w_lex·lex(p) + w_sem·sem_norm(p) + w_personal·personal_norm(p) + w_pop·pop_norm(p)

- lex(p) RAW trong [1.0, 1.2] (KHÔNG min-max — item thuộc lexical_ids phải luôn nhận
  đóng góp lexical mạnh; min-max sẽ đè item "khớp đủ từ nhưng không khớp cụm" về 0).
- sem/personal/pop min-max normalize TRONG tập candidate (tái dùng normalize_scores của blend.py).
- Bất biến quan trọng nhất: KHÔNG BAO GIỜ trả product ngoài allowed_ids — filter cứng
  (category/giá/tồn kho...) được Java quyết ở DB, tôn trọng bằng cấu trúc.

Module này THUẦN tính toán, không đụng DB — profile (điểm cá nhân hoá) do caller
(main.py, tái dùng _profile_scores) truyền vào. Trả (items, algorithm_source, matched).
"""

import logging

import numpy as np

from app.blend import normalize_scores
from app.config import settings
from app.search import lexical
from app.search.encoder import encoder
from app.store import ModelArtifacts

logger = logging.getLogger(__name__)

LEXICAL = "LEXICAL"
SEMANTIC = "SEMANTIC"
PERSONALIZED = "PERSONALIZED"

SEMANTIC_HYBRID = "SEMANTIC_HYBRID"
TFIDF_HYBRID = "TFIDF_HYBRID"
LEXICAL_ONLY = "LEXICAL_ONLY"


def _semantic_scores(query: str, allowed: set[int], art: ModelArtifacts) -> tuple[dict[int, float], str]:
    """(pid → cosine) cho các sản phẩm allowed vượt ngưỡng + nhãn nguồn slate.
    Rỗng khi: backend off, model chưa có, hoặc top-1 dưới gate (query rác/xà bần)."""
    backend = encoder.backend()
    if backend == "off":
        return {}, LEXICAL_ONLY

    if backend in ("onnx", "torch") and art.emb_matrix is not None:
        try:
            sims = art.emb_matrix @ encoder.encode_query(query)
        except Exception:  # noqa: BLE001 — encoder lỗi runtime không được giết search
            logger.exception("search: encode query lỗi — bỏ nhánh semantic request này.")
            return {}, LEXICAL_ONLY
        min_sim, top1_gate, label = settings.search_sem_min_sim, settings.search_sem_top1_gate, SEMANTIC_HYBRID
    elif art.tfidf_vectorizer is not None and art.tfidf_matrix is not None:
        # Plan C: TF-IDF query-vector — thang điểm khác hẳn E5, bộ ngưỡng riêng
        try:
            qv = art.tfidf_vectorizer.transform([query])
            sims = np.asarray((art.tfidf_matrix @ qv.T).todense()).ravel()
        except Exception:  # noqa: BLE001
            logger.exception("search: TF-IDF transform lỗi — bỏ nhánh semantic request này.")
            return {}, LEXICAL_ONLY
        min_sim = top1_gate = settings.search_tfidf_min_sim
        label = TFIDF_HYBRID
    else:
        return {}, LEXICAL_ONLY

    allowed_scores = [
        (pid, float(sims[art.pid_to_idx[pid]]))
        for pid in allowed
        if pid in art.pid_to_idx
    ]
    if not allowed_scores:
        return {}, label
    allowed_scores.sort(key=lambda x: -x[1])
    if allowed_scores[0][1] < top1_gate:
        # Semantic "không có tín hiệu" cho query này — chỉ còn lexical quyết định
        return {}, label
    top = [(pid, s) for pid, s in allowed_scores[: settings.search_sem_top_k] if s >= min_sim]
    return dict(top), label


def rank_search(
    query: str,
    allowed_ids: list[int],
    lexical_ids: list[int],
    profile: dict[int, float],
    art: ModelArtifacts,
    limit: int,
) -> tuple[list[tuple[int, float, str]], str, bool]:
    """Trả (items sorted desc, algorithm_source, matched).

    items: [(product_id, score, source)] — source ∈ LEXICAL | SEMANTIC | PERSONALIZED
    (nguồn đóng góp lớn nhất, cùng convention blend.py; popularity chỉ là tie-breaker
    không bao giờ làm nhãn). matched=False khi cả 2 nhánh rỗng (query rác) — Java trả
    NO_MATCH, KHÔNG fallback LIKE (lexical đã rỗng từ DB, gọi lại chỉ phí).
    """
    allowed = set(allowed_ids)
    lex_ids = set(lexical_ids) & allowed  # phòng thủ: lexical phải là tập con allowed

    sem_scores, source_label = _semantic_scores(query, allowed, art)

    candidates = lex_ids | set(sem_scores)
    if not candidates:
        return [], source_label, False

    query_norm = lexical.normalize(query)
    lex_scores = {
        pid: lexical.lexical_score(query_norm, art.name_norm.get(pid, ""))
        for pid in lex_ids
    }
    pop_lookup = art.popularity_lookup

    sem_norm = dict(normalize_scores([(pid, sem_scores[pid]) for pid in candidates if pid in sem_scores]))
    personal_norm = dict(normalize_scores([(pid, profile[pid]) for pid in candidates if pid in profile]))
    pop_norm = dict(normalize_scores([(pid, pop_lookup[pid]) for pid in candidates if pid in pop_lookup]))

    w_lex = settings.w_search_lexical
    w_sem = settings.w_search_semantic
    w_personal = settings.w_search_personal
    w_pop = settings.w_search_popularity

    items: list[tuple[int, float, str]] = []
    for pid in candidates:
        contrib = {
            LEXICAL: w_lex * lex_scores.get(pid, 0.0),
            SEMANTIC: w_sem * sem_norm.get(pid, 0.0),
            PERSONALIZED: w_personal * personal_norm.get(pid, 0.0),
        }
        score = sum(contrib.values()) + w_pop * pop_norm.get(pid, 0.0)
        source = max(contrib, key=contrib.get)
        if contrib[source] <= 0.0:
            # mọi đóng góp có nhãn = 0 (VD candidate semantic duy nhất bị min-max về 0)
            # → nhãn theo đường vào candidate
            source = LEXICAL if pid in lex_ids else SEMANTIC
        items.append((pid, score, source))

    items.sort(key=lambda x: -x[1])
    return items[: min(limit, settings.search_max_ranked)], source_label, True
