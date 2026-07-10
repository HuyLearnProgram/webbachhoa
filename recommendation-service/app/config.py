from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Cấu hình service, override qua file .env hoặc biến môi trường."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    db_url: str = "mysql+pymysql://root:@localhost:3306/webnongsan"

    # Candidate pool & re-rank
    pool_size: int = 80
    top_k_neighbors: int = 50
    mmr_lambda: float = 0.7  # λ mặc định (guest / không history)
    mmr_lambda_min: float = 0.4
    time_decay_tau_h: float = 72.0  # half-life (giờ) cho time-decay view history

    # Co-purchase (chạy "im lặng" tới khi đủ dữ liệu)
    copurchase_window_days: int = 180
    copurchase_min_transactions: int = 30
    copurchase_min_pair_orders: int = 5
    copurchase_min_confidence: float = 0.1
    copurchase_min_lift: float = 1.2

    # Blend weights theo placement (normalize per-source trước khi nhân)
    w_similar_content: float = 1.0
    w_similar_copurchase: float = 0.5
    w_similar_popularity: float = 0.2
    w_home_content: float = 0.65
    w_home_popularity: float = 0.35
    w_cart_content: float = 0.4
    w_cart_copurchase: float = 1.0
    w_cart_popularity: float = 0.2

    # Nightly retrain
    retrain_cron_hour: int = 2


settings = Settings()
