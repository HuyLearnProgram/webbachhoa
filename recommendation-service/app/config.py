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

    # ===== Phase 3 — LinUCB bandit (explore-exploit) =====
    bandit_enabled: bool = True
    bandit_alpha: float = 1.0  # hệ số UCB — càng lớn càng ưu tiên explore arm ít dữ liệu
    bandit_explore_positions: str = "2,7"  # vị trí chèn slot explore (không để ô cuối — position bias)
    bandit_min_slate_for_two_slots: int = 8  # slate ngắn hơn ngưỡng này chỉ explore 1 slot
    bandit_pick_top_n: int = 5  # weighted-random trong top-N popularity của arm được chọn
    bandit_max_slate_category_items: int = 2  # category đã có >= N item organic thì loại khỏi eligible arms
    bandit_new_session_max_interactions: int = 3  # dưới ngưỡng này coi là "session mới" (context feature)
    bandit_state_path: str = "data/bandit.db"  # SQLite — arms + decision log, sống sót qua restart

    # Reward polling (đọc recommendation_impressions định kỳ — không message broker)
    bandit_poll_interval_s: int = 120
    bandit_impression_wait_h: float = 6.0  # decision không có impression sau N giờ → bỏ (rail chưa được nhìn thấy)
    bandit_negative_after_h: float = 24.0  # impression không click sau N giờ → reward âm nhẹ
    bandit_reward_click: float = 0.2
    bandit_reward_purchase: float = 1.0
    bandit_reward_no_click: float = -0.05  # thay cho dismiss=-0.5 roadmap (UI không có nút dismiss)
    bandit_decision_ttl_days: int = 7

    # A/B testing: cohort bandit-on/off theo hash CRC32 identity (user_id ưu tiên, guest theo session)
    ab_bandit_enabled: bool = True
    ab_bandit_pct: int = 50  # % identity vào cohort bandit-on
    # Mốc thời gian (ISO string) lần cuối ab_bandit_pct bị đổi qua dashboard admin — dùng để dashboard
    # biết "vừa đổi gần đây, chưa đủ dữ liệu để đề xuất lại" (xem POST /internal/ab-config).
    ab_pct_applied_at: str | None = None

    # Metrics experiment (CTR/diversity/coverage/A-B) — endpoint /metrics/experiment
    metrics_experiment_cache_ttl_s: int = 300
    metrics_experiment_days_default: int = 30

    # ===== Smart Search (Phase A) — semantic + lexical + personal + popularity =====
    search_embedding_backend: str = "auto"  # auto | onnx | torch | tfidf | off (pattern cf_backend)
    search_model_dir: str = "data/models/multilingual-e5-small"
    # Cosine E5 dồn cụm 0.7-0.95 → gate 2 tầng thay vì 1 ngưỡng đơn. ĐÃ calibrate trên
    # catalog thật 236 sản phẩm (scripts/calibrate_search.py, 2026-07-11): top-1 query nhu cầu
    # thật 0.836-0.894, query rác 0.785-0.809 → gate 0.82 nằm giữa khoảng tách (chặn nhầm 0/15,
    # lọt rác 0/5); sàn 0.80 cắt "dải nhiễu" 0.78-0.81 của vùng điểm query rác.
    search_sem_top1_gate: float = 0.82  # top-1 trong allowed < gate → semantic không có tín hiệu
    search_sem_min_sim: float = 0.80  # sàn từng candidate lọt nhánh semantic
    search_sem_top_k: int = 100
    search_tfidf_min_sim: float = 0.05  # bộ ngưỡng riêng khi backend=tfidf (thang điểm khác hẳn)
    search_max_ranked: int = 500  # trần số item trả cho Java phân trang
    # Khớp tên chính xác phải thắng semantic; personal kéo hàng hợp gu lên đầu TRONG nhóm
    # liên quan nhưng không lật item khớp tên; popularity chỉ là tie-breaker.
    w_search_lexical: float = 1.0
    w_search_semantic: float = 0.8
    w_search_personal: float = 0.5
    w_search_popularity: float = 0.15


settings = Settings()
