from pydantic import BaseModel


class RecItem(BaseModel):
    product_id: int
    score: float
    source: str  # CONTENT_BASED | CO_PURCHASE | POPULARITY


class RecResponse(BaseModel):
    algorithm_source: str
    model_version: str
    items: list[RecItem]
