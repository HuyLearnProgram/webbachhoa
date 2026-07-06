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
VITE_RECOMMENDED_URL = http://localhost:8000
```
Backend Spring Boot (`../server`) phải chạy trước ở `http://localhost:8080` để frontend gọi API được.

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
