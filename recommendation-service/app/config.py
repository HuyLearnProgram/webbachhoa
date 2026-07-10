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
    # Deprecated từ Phase 2 — thay bằng profile_tau_view_h (giữ để .env cũ không vỡ).
    time_decay_tau_h: float = 72.0

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

    # Collaborative filtering (ALS) — Phase 2, guard "im lặng" như co-purchase
    cf_enabled: bool = True
    cf_backend: str = "auto"  # auto | implicit | numpy
    cf_factors: int = 16  # nhỏ vì ~60 user hiện tại; nâng qua .env khi user tăng
    cf_regularization: float = 0.1  # code ép floor 0.01 chống singular solve
    cf_iterations: int = 15
    cf_alpha: float = 20.0
    cf_window_days: int = 90
    cf_w_purchase: float = 5.0
    cf_hl_purchase_days: float = 30.0
    cf_w_cart: float = 2.0
    cf_hl_cart_days: float = 14.0
    cf_w_view: float = 1.0
    cf_hl_view_days: float = 7.0
    cf_confidence_cap: float = 30.0
    cf_min_users: int = 50  # guard: số user có >= cf_min_user_interactions
    cf_min_user_interactions: int = 2
    cf_min_items: int = 20
    cf_item_topk: int = 50
    cf_min_item_sim: float = 0.05
    # Hybrid cadence: dưới ngưỡng interaction này retrain nightly,
    # từ ngưỡng trở lên chỉ retrain khi model cũ quá cf_retrain_max_age_days.
    cf_nightly_max_interactions: int = 50000
    cf_retrain_max_age_days: int = 7
    w_home_collaborative: float = 0.5
    w_similar_collaborative: float = 0.4
    w_cart_collaborative: float = 0.5

    # Category-fatigue decay (chống nhàm chán) từ recommendation_impressions
    fatigue_enabled: bool = True
    fatigue_window_days: int = 14
    fatigue_half_life_days: float = 7.0
    fatigue_beta: float = 0.15  # penalty = 1 / (1 + beta * exposure)
    fatigue_max_rows: int = 500

    # Preference vector đa tín hiệu (Phase 2) — weight = w_kind * exp(-age_h / tau_kind)
    profile_w_view: float = 1.0
    profile_tau_view_h: float = 72.0  # = time_decay_tau_h cũ, giữ parity Phase 1
    profile_w_cart: float = 2.0
    profile_tau_cart_h: float = 336.0  # 14 ngày
    profile_w_purchase: float = 5.0
    profile_tau_purchase_h: float = 720.0  # 30 ngày
    profile_view_limit: int = 30
    profile_cart_limit: int = 20
    profile_purchase_limit: int = 30

    # Chu kỳ mua lại (repurchase cycle) — hãm tín hiệu mua thật ngay sau khi mua, vì khách vừa
    # mua thường CHƯA cần mua lại ngay (roadmap Phần I mục C, chưa làm tới Phase 2 này)
    repurchase_min_pairs: int = 3  # số cặp mua liên tiếp tối thiểu để tin median cấp sản phẩm
    repurchase_default_days: float = 14.0  # fallback khi thiếu cả dữ liệu sản phẩm lẫn danh mục

    # Nightly retrain
    retrain_cron_hour: int = 2


settings = Settings()
