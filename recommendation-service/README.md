# recommendation-service

Python microservice gợi ý sản phẩm (Phase 1 hệ thống gợi ý AI — xem `AI_Recommendation_Roadmap.docx`).
Chỉ Java backend gọi vào service này (proxy giữ JWT auth tập trung, timeout 2-3s + tự fallback
rule-based khi service down) — **không expose ra ngoài**.

## Kiến trúc Phase 1

- **Candidate sources** (`app/candidates/`):
  - `content_based.py` — TF-IDF (unigram+bigram) trên tên×3 + category×2 + mô tả + price-bucket
    quintile theo category; top-50 neighbors/sản phẩm. Train nightly.
  - `co_purchase.py` — FP-Growth association rules trên `order_detail` (đơn status 1/2, 180 ngày).
    **Chạy "im lặng"**: dưới 30 transaction → rules rỗng, không lỗi (xem `copurchase_rules` trong `/health`).
  - `popularity.py` — 0.5·sold + 0.35·trend7 + 0.15·trend30 — luôn bật, không bao giờ rỗng.
- **Blend** (`app/blend.py`): normalize per-source → trọng số theo placement (config `.env`) → pool 80.
- **MMR diversity** (`app/rerank/diversity.py`): bật từ đầu, λ=0.7 tự hạ tới 0.4 theo category-entropy
  của lịch sử xem (user xem hẹp bị ép đa dạng mạnh hơn — cơ chế chống filter bubble).
- **Retrain**: startup train đồng bộ trước khi nhận request; APScheduler cron 02:00 hằng đêm;
  atomic swap toàn bộ artifact (không có trạng thái nửa vời). Dev: `POST /internal/retrain`.

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
| `GET /health` | model_version, products_indexed, copurchase_rules, last_train_seconds |
| `GET /metrics` | counter request theo endpoint/nguồn, copurchase_empty_serves |
| `GET /recommend/similar/{product_id}?k=12` | PDP "Sản phẩm tương tự" (content-based; cold-start → trending category) |
| `GET /recommend/home?session_id=&user_id=&k=12` | Home — có history → cá nhân hoá time-decay, guest → popularity |
| `GET /recommend/cart?product_ids=1,2&k=6` | Giỏ hàng — co-purchase + content, fallback popularity |
| `POST /internal/retrain` | Train lại ngay (dev/test) |

Response chỉ chứa `product_id + score + source` — Java hydrate thành DTO đầy đủ từ DB
(giá/khuyến mãi/active luôn mới nhất, giữ shape `product_name` snake_case cho ProductCard).

## Ngưỡng chuyển Phase 2 (xem roadmap docx)

~200-300 đơn hợp lệ VÀ ~50 user có ≥2 đơn VÀ 4-8 tuần tích luỹ view/impression liên tục —
trước đó **không** bật collaborative filtering (ma trận quá thưa cho kết quả nhiễu).
