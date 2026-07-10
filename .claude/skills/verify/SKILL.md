---
name: verify
description: Cách build/chạy/drive webbachhoa để verify thay đổi end-to-end qua UI thật
---

# Verify webbachhoa end-to-end

## Khởi động stack (thứ tự)
1. MySQL local đã chạy sẵn như Windows service (DB `webnongsan`, root/123456 — mật khẩu nằm trong `server/server/src/main/resources/application.properties`). mysql CLI không có trong PATH: dùng `"C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -uroot -p123456 -D webnongsan`.
2. Backend: `cd server/server && ./mvnw.cmd -q spring-boot:run` (port 8080). **Backend của user thường đã chạy sẵn với DevTools** — chỉ cần `./mvnw.cmd -q compile` là nó tự hot-restart với code mới, không cần (và không thể, port bận) tự start.
3. Recommendation service (nếu verify tính năng gợi ý): `cd recommendation-service && ./venv/Scripts/python.exe -m uvicorn app.main:app --port 8000`. Health: `curl :8000/health`. Không chạy cũng không vỡ — Java fallback `RULE_BASED_FALLBACK`.
4. Frontend: `cd client && npm run dev` (port 5173).

## Drive UI bằng Selenium (đã có sẵn, KHÔNG cần Playwright)
- Python hệ thống (3.12) có `selenium` 4.33 global; venv của recommendation-service cũng cài được nhanh. Selenium Manager tự lo chromedriver.
- Headless: `--headless=new`, window 1600x1000, screenshot vào scratchpad.
- Tài khoản test: `user@gmail.com` / `12345678` (đã có trong DB dev; nếu mất, hash bcrypt + info trong `Selenium/cách chạy.txt`, role_id=1, status=1).
- Selector đã dùng ổn: login qua `By.NAME "email"/"password"` + button `contains(@class,'bg-main') and contains(text(),'Đăng nhập')`; nút PDP `contains(text(),'Thêm vào giỏ hàng')`; heading section là `<h2>` chứa title.
- Rail gợi ý log impression qua IntersectionObserver threshold 0.3 — phải `scrollIntoView` + chờ ~2.5s rồi mới query DB đối chiếu.
- Verify feedback loop bằng cách so `MAX(id)` các bảng `recommendation_impressions`/`product_views` trước-sau thao tác.
- Script mẫu hoàn chỉnh của Phase 1 từng chạy PASS: xem lịch sử — luồng guest Home rail → click-through → PDP similar → login (merge session) → add to cart → cart rail.

## Gotchas
- Terminal hiển thị tiếng Việt từ mysql.exe bị mojibake — vô hại, đừng sửa charset.
- `git diff` cảnh báo LF→CRLF ồn ào — vô hại.
- Java compile output nằm im nếu `-q`; check `echo $?`.
