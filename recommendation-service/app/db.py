import pandas as pd
from sqlalchemy import create_engine, text

from app.config import settings

# Service chỉ SELECT — mọi ghi event đều đi qua Java backend.
engine = create_engine(settings.db_url, pool_pre_ping=True, pool_recycle=3600)


def fetch_df(sql: str, params: dict | None = None) -> pd.DataFrame:
    with engine.connect() as conn:
        return pd.read_sql(text(sql), conn, params=params)
