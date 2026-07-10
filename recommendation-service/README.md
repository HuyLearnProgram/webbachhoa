# recommendation-service

Python microservice gợi ý sản phẩm (Phase 1 + 2 + 3 hệ thống gợi ý AI — xem `AI_Recommendation_Roadmap.docx`).
Chỉ Java backend gọi vào service này (proxy giữ JWT auth tập trung, timeout 2-3s + tự fallback
rule-based khi service down) — **không expose ra ngoài**.

## Kiến trúc

- **Candidate sources** (`app/candidates/`):
  - `content_based.py` — TF-IDF (unigram+bigram) trên tên×3 + category×2 + mô tả + price-bucket
    quintile theo category; top-50 neighbors/sản phẩm. Train nightly.
  - `co_purchase.py` — FP-Growth association rules trên `order_detail` (đơn status 1/2, 180 ngày).
    **Chạy "im lặng"**: dưới 30 transaction → rules rỗng, không lỗi (xem `copurchase_rules` trong `/health`).
  - `popularity.py` — 0.5·sold + 0.35·trend7 + 0.15·trend30 — luôn bật, không bao giờ rỗng.
  - `collaborative.py` (**Phase 2**) — implicit ALS trên purchase (w=5, HL 30d) + cart-add (w=2, HL 14d)
    + view (w=1, HL 7d), cửa sổ 90 ngày, chỉ tương tác có user_id. **Guard im lặng** như co-purchase:
    dưới 50 user đủ tương tác / 20 item → CF tắt, không lỗi. Backend `auto`: thử thư viện `implicit`,
    thiếu wheel (Windows/py3.12) → tự fallback solver ALS numpy tự viết (nguồn `CF` trong response).
    Serve: user-CF cho Home (user đăng nhập), item-item CF (cosine trên item factors) cho PDP/Cart.
- **Blend** (`app/blend.py`): normalize per-source → trọng số theo placement (config `.env`) → pool 80.
- **MMR diversity** (`app/rerank/diversity.py`): bật từ đầu, λ=0.7 tự hạ tới 0.4 theo category-entropy
  của lịch sử xem (user xem hẹp bị ép đa dạng mạnh hơn — cơ chế chống filter bubble).
- **Category-fatigue decay** (`app/rerank/fatigue.py`, **Phase 2**): exposure theo user/session-category
  từ `recommendation_impressions` (14 ngày, chỉ impression chưa click, decay mũ HL 7d);
  penalty `1/(1+0.15·exposure)` áp lên pool sau blend, trước MMR, ở cả 3 placement.
  Lỗi bất kỳ → bỏ penalty, không bao giờ 500.
- **Preference vector đa tín hiệu** (**Phase 2**, `main._profile_scores`): purchase (w=5, τ=720h)
  + cart-add (w=2, τ=336h) + view (w=1, τ=72h) → profile home "dịch chuyển" theo thời gian.
  Exclude (`seen`) chỉ tính từ view — hàng grocery mua lặp vẫn được gợi ý lại.
- **Retrain**: startup train đồng bộ trước khi nhận request; APScheduler cron 02:00 hằng đêm;
  atomic swap toàn bộ artifact (không có trạng thái nửa vời). Dev: `POST /internal/retrain` (force CF tươi).
  **CF hybrid cadence**: volume < `cf_nightly_max_interactions` (50k) → train nightly cùng các nguồn khác;
  vượt ngưỡng → carry-forward model CF cũ qua swap, chỉ train lại khi quá `cf_retrain_max_age_days` (7d).
- **LinUCB bandit** (**Phase 3**, `app/bandit/`): explore 1-2 slot/slate (vị trí 2,7 — không ô cuối)
  thử category "ngoài vùng quen" của user, item mang source `BANDIT_EXPLORE`. Arms = category,
  context d=8 (giờ/thứ sin-cos, session mới/cũ, category-entropy, fatigue của arm). A/B cohort
  bandit-on/off theo `CRC32(user_id|session_id) % 100 < AB_BANDIT_PCT` (50) — deterministic,
  recompute được trong MySQL, không cần cột variant. State (arms A/b + decision log) persist
  SQLite `data/bandit.db` (mất file → học lại, không mất dữ liệu nghiệp vụ). **Reward loop**
  (`rewards.py`, poll mỗi 120s — không message broker): click=+0.2, purchase(=converted, Java ghi
  khi tạo đơn)=+1.0, không click sau 24h=-0.05, không có impression sau 6h → bỏ qua.
  Kill-switch qua `.env`: `BANDIT_ENABLED=false` hoặc `AB_BANDIT_PCT=0` — không cần sửa code.
- **Metrics experiment** (`app/metrics_experiment.py`): CTR/CVR theo placement×source, intra-list
  diversity, entropy shown vs clicked theo tuần, catalog coverage 30d, repeat-no-click theo
  category, so sánh cohort A/B. Xem qua dashboard admin "Gợi ý AI" (Java proxy khoá ADMIN)
  hoặc gọi thẳng `GET /metrics/experiment?days=30` khi dev.

## Chạy (Windows, dev)

```bash
cd recommendation-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env        # rồi điền mật khẩu MySQL thật vào DB_URL
venv\Scripts\python -m uvicorn app.main:app --port 8000
```

MySQL (`webnongsan`) phải chạy trước. Java backend đọc `RECOMMENDATION_SERVICE_URL`
(mặc định `http://localhost:8000`) — service này chết thì Home/PDP/Cart vẫn sống nhờ fallback Java.

## Endpoints

| Endpoint | Mô tả |
|---|---|
| `GET /health` | model_version, products_indexed, copurchase_rules, cf_*, bandit_arms/bandit_pending_decisions/ab_bandit_pct, last_train_seconds |
| `GET /metrics` | counter request theo endpoint/nguồn, copurchase_empty_serves, fatigue_applied_serves, bandit_explore_served, bandit_rewards_applied |
| `GET /metrics/experiment?days=30` | **Phase 3**: CTR/CVR, diversity, entropy, coverage, A/B cohort — Java proxy qua `admin/recommendation-metrics` (ADMIN) |
| `GET /recommend/similar/{product_id}?session_id=&user_id=&k=12` | PDP "Sản phẩm tương tự" (content + item-CF + fatigue; cold-start → trending category) |
| `GET /recommend/home?session_id=&user_id=&k=12` | Home — có history → profile đa tín hiệu + user-CF, guest → popularity |
| `GET /recommend/cart?product_ids=1,2&session_id=&user_id=&k=6` | Giỏ hàng — co-purchase + content + item-CF, fallback popularity |
| `POST /internal/retrain` | Train lại ngay, force CF tươi (dev/test) |

`user_id` luôn do Java derive từ JWT — không bao giờ nhận từ client. Response chỉ chứa
`product_id + score + source` — Java hydrate thành DTO đầy đủ từ DB
(giá/khuyến mãi/active luôn mới nhất, giữ shape `product_name` snake_case cho ProductCard).

## Dữ liệu seed tạm cho Phase 2

`scripts/seed_phase2_data.py` đã bơm ~40 user + ~104 đơn PAID + event tracking để đạt ngưỡng
Phase 2 (manifest `scripts/seed_manifest_*.json`). Khi đủ dữ liệu thật, xoá bằng
`python scripts/cleanup_seed_data.py scripts/seed_manifest_<timestamp>.json` — CF có thể rơi
xuống dưới guard và tự tắt im lặng (đúng thiết kế, không phải bug).

## Dữ liệu seed tạm cho Phase 3

Ngưỡng vào Phase 3 (ổn định 4-8 tuần, ≥2000-3000 impression/tuần từ nguồn AI thật) đạt bằng
`scripts/seed_phase3_gate.py`: bù đủ 8 tuần × ~2600 AI-sourced impression/tuần + 230 conversion
neo vào đơn PAID thật (manifest `scripts/seed_manifest_phase3_*.json`). Xoá bằng cùng
`cleanup_seed_data.py <manifest>`. **Nên xoá seed TRƯỚC khi tin số liệu bandit thật** — trong
thời gian test bandit học trên click/convert của seed. Sau khi xoá, pending decisions trỏ tới
impression đã mất sẽ tự bị discard sau 6h (đúng thiết kế), metrics tụt là hành vi đúng.
