# Quy ước thiết kế / giao diện

## Theme (Tailwind — `tailwind.config.js`)
- Màu thương hiệu: `main: #10B981` (xanh lá, phù hợp thương hiệu bách hóa/thực phẩm).
- Font chính: `Poppins` (`fontFamily.main`).
- Chiều rộng container chuẩn: `main: 1280px`.
- Animation tuỳ chỉnh có sẵn: `fade-in`, `slide-top`, `slide-top-sm`, `scale-in-center` — ưu tiên tái dùng thay vì viết keyframe mới.
- Plugin `@tailwindcss/forms` đã bật; `@tailwindcss/line-clamp` có trong `package.json` nhưng **chưa** đăng ký vào `plugins` — cần thêm vào config nếu muốn dùng line-clamp.

## Layout gốc
- **Public** (`src/pages/guest/Public.jsx`): `TopHeader` + `Header` + `Navigation` + `Footer` bao quanh `<Outlet/>`. Dùng cho toàn bộ trang khách (chưa đăng nhập).
- **MemberLayout**: sidebar cố định `MemberSidebar` (avatar, menu điều hướng phân cấp) + `<Outlet/>`.
- **AdminLayout**: `TopHeader`/`Header` + sidebar `LeftNavBar` (định nghĩa menu trong `src/utils/AdminNavigationPath.js`) + `<Outlet/>`.

## Quy ước theo khu vực
- **Trang khách hàng**: ưu tiên Tailwind utility classes, tự dựng component (không dùng Ant Design ở đây).
- **Trang admin**: ưu tiên component Ant Design (`Table`, `Modal`, `Dropdown`, `Select`) cho bảng dữ liệu/form quản trị, kết hợp Tailwind cho bố cục tổng thể. Form thêm/sửa dùng `react-hook-form` + `InputFormAdmin.jsx`.

## Component dùng chung cần tái sử dụng khi mở rộng
- Hiển thị sản phẩm: `ProductCard` (grid listing/home/gợi ý), `ProductMiniItem` (dòng gọn trong kết quả tìm kiếm) — giữ nhất quán bố cục ảnh/tên/giá/sao khi thêm nơi hiển thị sản phẩm mới.
- Phân trang: `Pagination` + `PagiItem` (dựa trên hook `usePaginate` trong `src/utils/helper.jsx`) — dùng lại thay vì tự viết logic phân trang mới.
- Modal toàn cục: `src/components/common/Modal.jsx` (xem mục Modal trong `tech-defaults.md`).
- Sao đánh giá: `renderStarFromNumber()` (`src/utils/helper.jsx`) — dùng lại để hiển thị rating nhất quán ở mọi nơi (ProductCard, Comment, FeedbackCard...).
