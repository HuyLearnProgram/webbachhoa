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
