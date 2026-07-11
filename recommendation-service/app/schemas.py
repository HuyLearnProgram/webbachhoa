from pydantic import BaseModel


class RecItem(BaseModel):
    product_id: int
    score: float
    source: str  # CONTENT_BASED | CO_PURCHASE | POPULARITY | CF | BANDIT_EXPLORE


class RecResponse(BaseModel):
    # Phase 3: request_id sinh tại Python để join được decision của bandit (SQLite)
    # với recommendation_impressions (Java ghi) khi poll reward. Java dùng lại giá trị này
    # làm requestId của slate thay vì tự sinh UUID.
    request_id: str
    algorithm_source: str
    model_version: str
    items: list[RecItem]


class SearchRankRequest(BaseModel):
    """Smart Search — POST body vì: (1) q tiếng Việt có dấu KHÔNG được đi query param
    (bug dấu đã biết toàn hệ thống), (2) allowed_ids có thể dài. Java là chủ filter:
    allowed_ids đã lọc điều kiện cứng ở DB, Python chỉ xếp hạng bên trong tập này."""

    query: str
    allowed_ids: list[int]
    lexical_ids: list[int] = []
    user_id: int | None = None  # Java resolve từ JWT — không bao giờ nhận từ FE
    session_id: str | None = None
    limit: int = 300


class SearchRankResponse(BaseModel):
    request_id: str
    algorithm_source: str  # SEMANTIC_HYBRID | TFIDF_HYBRID | LEXICAL_ONLY
    model_version: str
    matched: bool  # False = cả lexical lẫn semantic đều rỗng → Java trả NO_MATCH, không fallback LIKE
    items: list[RecItem]  # source per-item: LEXICAL | SEMANTIC | PERSONALIZED
