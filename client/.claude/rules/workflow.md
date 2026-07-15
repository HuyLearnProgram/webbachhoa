# Workflow chạy / build / test (frontend)

## Cài đặt
```bash
cd client
npm install
```

## Cấu hình môi trường
Tạo/kiểm tra file `.env` tại `client/`:
```
VITE_BACKEND_URL = "http://localhost:8080/api/v2"
VITE_BACKEND_TARGET = http://localhost:8080
```
Backend Spring Boot (`../server`) phải chạy trước ở `http://localhost:8080` để frontend gọi API được.
Muốn gợi ý dùng nguồn AI thật (không fallback): chạy thêm `../recommendation-service` (uvicorn :8000,
xem README trong đó) — không chạy cũng không vỡ gì, Java tự fallback rule-based.

**Trước khi chạy `uvicorn` cho `recommendation-service`, kiểm tra port 8000 chưa bị chiếm** —
tiến trình uvicorn của phiên làm việc trước rất dễ bị bỏ quên chạy nền (không có auto-reload/kill khi
đóng terminal), lần chạy sau sẽ load xong toàn bộ model/train nhưng bind port thất bại
(`[Errno 10048] only one usage of each socket address`), dễ nhầm tưởng service lỗi. Kiểm tra + xử lý:
```bash
netstat -ano | findstr ":8000"                          # xem PID đang LISTENING
powershell -Command "Get-Process -Id <PID>"              # xác nhận đúng là python/uvicorn cũ
powershell -Command "Stop-Process -Id <PID> -Force"      # tắt rồi chạy lại uvicorn mới
```
Áp dụng tương tự nếu nghi port 8080 (Spring Boot)/5173 (Vite) bị chiếm bởi tiến trình cũ.

## Chạy dev
```bash
npm run dev
```
Mặc định tại http://localhost:5173. Dev server có proxy `/api/v2` → `VITE_BACKEND_TARGET` (cấu hình trong `vite.config.js`).

## Build & preview
```bash
npm run build      # build production vào dist/
npm run preview    # xem thử bản build
```

## Lint
```bash
npm run lint
```

## Test
```bash
npm run test       # Vitest
npm run test:ui    # Vitest UI
```
Setup test tại `src/setupTests.js` (Testing Library + jsdom). Hiện có test mẫu: `src/pages/guest/__tests__/Checkout.test.jsx`.

## Lưu ý khi thêm tính năng
- Sau khi sửa `src/apis/*` hoặc `src/store/*`, chạy lại `npm run dev` và kiểm tra thủ công luồng liên quan (đăng nhập, giỏ hàng, checkout, trang admin tương ứng) vì dự án chưa có test bao phủ rộng.
- Trước khi coi một thay đổi UI là xong, mở trình duyệt kiểm tra thực tế theo golden path — nhiều trang (VD: `Checkout`, `ProductDetail`) có logic điều kiện phức tạp (đăng nhập, tồn kho, voucher) dễ vỡ khi sửa nhỏ.
