# Bách Hóa E-commerce — Frontend (client)

## Tổng quan

Frontend React cho website thương mại điện tử bách hóa (Vietnamese grocery e-commerce). Kiến trúc SOA/REST: frontend này giao tiếp với backend Spring Boot nằm ở `../server` qua RESTful API. Repo: https://github.com/HuyLearnProgram/webbachhoa

## Tech stack

- **React 18** + **Vite** (JS thuần, không TypeScript). Alias `@/* → src/*` (xem `jsconfig.json`).
- **State**: Redux Toolkit + `redux-persist` (persist vào `localStorage`, key `ogani_shop/user`, whitelist `isLoggedIn/token/current`), có `<PersistGate>` bọc app trong `main.jsx`.
- **Routing**: `react-router-dom` v6, 3 layout lồng nhau — `Public`, `MemberLayout`, `Admin`.
- **HTTP**: một `axiosInstance` dùng chung (`src/utils/axios.js`).
- **UI**: Tailwind CSS (trang khách hàng) + Ant Design (chủ yếu trang admin) + styled-components.
- **Khác**: `react-hook-form`, `chart.js`/`react-chartjs-2` (dashboard doanh thu), `html2canvas` + `jspdf` (xuất hóa đơn PDF admin), `sweetalert2`, `react-toastify`, `@react-oauth/google` (hiện đang tắt).

## Cấu trúc thư mục chính

```
src/
├── apis/            # hàm gọi API theo domain: app, category, location, order, product, user
├── components/
│   ├── admin/        # component riêng cho admin (bảng, form, chart, layout)
│   ├── cart/ orders/ wishlist/ feedbacks/ vote/   # component theo tính năng
│   ├── navigation/ headers/ footer/ sidebar/       # layout/điều hướng
│   ├── input/ common/ paginate/ products/          # component dùng chung
├── hocs/            # withBaseComponent.jsx — inject navigate/dispatch/location
├── pages/
│   ├── guest/       # Home, Login, Product, ProductDetail, CartDetail, Checkout, payment/*
│   ├── member/      # MemberLayout (route guard), Personal, History, Wishlist
│   └── admin/       # Admin.jsx (route guard), Overview, Product, Category, Order, User, Feedback, Add/
├── store/
│   ├── app/         # appSlice: categories, modal, loading
│   └── user/        # userSlice: auth, current user
└── utils/           # axios.js, path.js, constants.jsx, helper.jsx, icons.jsx
```

## Routing & phân quyền

- `Public` layout: trang khách (chưa đăng nhập) — Home, danh sách/chi tiết sản phẩm, giỏ hàng, checkout, kết quả thanh toán.
- `MemberLayout`: guard tự viết ngay trong component — redirect `/login` nếu `!isLoggedIn`.
- `Admin` (`src/pages/admin/Admin.jsx`): guard tự viết trong `useEffect`, đọc `state.user`, redirect `/login` nếu chưa đăng nhập, redirect `/` nếu `role.roleName !== 'admin'`. **Không có** HOC/route-guard tái sử dụng chung (`src/hocs/` chỉ có `withBaseComponent.jsx`, không liên quan auth).

## State management

- **`app` slice**: `categories` (load 1 lần khi `App.jsx` mount qua thunk `getCategories()`), `isLoading`, `isShowModal` + `modalChildren` (điều khiển modal toàn cục qua component `Modal.jsx`), `errorCode`.
- **`user` slice**: `isLoggedIn`, `current` (user hiện tại, gồm `cartLength`), `token`, `message` (dùng cho thông báo hết phiên — `setExpiredMessage()`).

## API layer

- `src/utils/axios.js`: 1 `axiosInstance` (`baseURL = VITE_BACKEND_URL`). Request interceptor đọc JWT trực tiếp từ `localStorage['persist:ogani_shop/user']` để gắn `Authorization`. Response interceptor tự refresh token khi 401 qua `GET /auth/refresh`, gộp các lần refresh đồng thời qua biến `refreshPromise`.
- `src/apis/{app,category,location,order,product,user}.js`: các hàm gọi API theo domain. `location.js` gọi thẳng API công khai bên ngoài (esgoo.net) cho tỉnh/huyện/xã, không qua `axiosInstance`.

## Tích hợp đáng chú ý

- **VNPay**: `Checkout.jsx` redirect sang trang thanh toán VNPay, lưu tạm dữ liệu đơn vào `localStorage` để trang callback (`PaymentSuccess.jsx`) hoàn tất (cập nhật tồn kho, xoá giỏ hàng, gửi email). Backend verify chữ ký HMAC-SHA512 + đối chiếu `vnp_TxnRef` (gắn `orderId`) + số tiền trước khi set `paymentStatus=PAID` — không tin trực tiếp `vnp_ResponseCode`.
- **Voucher giảm giá**: xử lý inline trong `Checkout.jsx` (`apiGetMyVouchers`, tính % hoặc số tiền cố định).
- **Đánh giá sản phẩm**: `apiRatings`/`apiGetRatingsPage`, hiển thị qua `Votebar`, `Comment`, modal `VoteOption`.
- **Ảnh sản phẩm/avatar**: phục vụ từ storage của backend (`VITE_BACKEND_TARGET/storage/...`), README nhắc Cloudinary nhưng thực tế chưa thấy tích hợp SDK Cloudinary trong `src/`.
- **Khuyến mãi sản phẩm**: `Product.promotionType` (`NONE|PRICE_DISCOUNT|BUY_X_GET_Y|BUNDLE_PRICE`) + hạn dùng (`promotionExpiresAt`, tự revert qua scheduler mỗi giờ). Công thức tính tiền tồn tại **song song** ở backend (`PromotionService`, nguồn tính tiền thật) và frontend (`src/utils/promotion.js`, chỉ để hiển thị) — sửa 1 bên phải sửa bên kia. Quà tặng "Mua X tặng Y" luôn là chính sản phẩm đó, không trừ tồn kho riêng nhưng có cộng vào lượng tồn kho cần trừ khi validate.
- **Snapshot khuyến mãi**: `OrderDetail` lưu snapshot khuyến mãi tại thời điểm đặt hàng (`lineTotal`, `promotionType`, `freeUnits`, `originalPrice`...) — trang chi tiết đơn/hoá đơn/email **luôn** đọc từ snapshot này, không bao giờ đọc lại `Product` hiện tại (vì giá/khuyến mãi có thể đã đổi hoặc hết hạn).

## Trạng thái các module admin/khách hàng

Tất cả các mục dưới đây coi như **đã hoàn thành và đã xác nhận qua UI thật**, trừ khi ghi chú khác:

- **Product admin**: CRUD đầy đủ, ẩn/hiện thay hard-delete, gallery nhiều ảnh, SKU + import/export Excel (Apache POI), trang "Xem chi tiết sản phẩm" (số liệu bán/đánh giá/tỉ lệ hoàn trả), hệ thống khuyến mãi đa loại. Chưa làm (chủ động bỏ qua): giá vốn, hạn sử dụng, barcode nâng cao, tab "Đơn hàng chứa sản phẩm" ở trang chi tiết.
- **Category admin**: CRUD, tìm kiếm + đồng bộ URL, layout đồng bộ với Product/User admin. Đã fix Broken Access Control (POST/PUT/DELETE trước đó không khoá ADMIN).
- **User admin**: CRUD, khoá/mở khoá (không hard-delete, bắt buộc chọn lý do), trang "Xem chi tiết người dùng", email thông báo tự động khi admin sửa hộ. Chưa làm: đổi avatar trong form sửa (chủ động theo yêu cầu).
- **Order & thanh toán**: state machine `paymentStatus` (`UNPAID/PENDING_PAYMENT/PAID/PAYMENT_FAILED/REFUND_PENDING/REFUNDED`), trả hàng hoàn tiền trong 15 ngày kể từ `deliveryTime`, ownership check đầy đủ cho mọi transition tự-phục vụ của khách.
- **Overview dashboard admin**: 7 stat card + 7 chart (doanh thu tuần, trạng thái đơn/thanh toán, feedback, top sản phẩm...). Đã fix bảo mật `/api/v2/admin/**` (trước đó không khoá ADMIN) + sửa stored procedure `GetRevenueByWeekCycle` (trước đó cộng nhầm doanh thu đơn chưa `PAID`).
- **Tìm kiếm & lọc sản phẩm khách hàng** (`pages/guest/Product.jsx`): panel lọc cố định (danh mục/giá/đánh giá/khuyến mãi, multi-select qua query param), tìm kiếm đa từ né bug dấu tiếng Việt (xem mục Lưu ý kỹ thuật).
- **Email xác nhận đơn hàng**: đọc lại `Order`/`OrderDetail` từ DB theo `orderId` (không tin dữ liệu client gửi), đầy đủ khuyến mãi/voucher.

## Lưu ý kỹ thuật quan trọng (rút ra từ các lần sửa lỗi — tránh lặp lại)

- **Thứ tự rule trong `SecurityConfiguration.java`**: Spring Security `authorizeHttpRequests` khớp theo **thứ tự khai báo**, rule đầu tiên khớp thắng (không phải rule cụ thể nhất thắng). Rule `hasRole("ADMIN")` cho 1 sub-path phải đặt **trước** rule `permitAll()` tổng quát của path cha, nếu không sẽ bị "nuốt" mất (đã xảy ra thật với `products/export`).
- **Toán tử phủ định của `spring-filter`**: dùng `<>` chứ **không phải** `!=` (ANTLR grammar lỗi với `!=`).
- **Dấu tiếng Việt trong query filter/param bị backend làm hỏng** (root cause chưa xác định — nghi charset servlet hoặc thư viện `spring-filter` 3.1.7): mọi giá trị có dấu gửi qua `filter=` hoặc `@RequestParam` đều có thể trả sai/0 kết quả. Workaround hiện tại: gọi `stripDiacritics()` (`src/utils/helper.jsx`) trước khi build chuỗi filter — tận dụng collation MySQL accent-insensitive. Cần nhớ áp dụng ở mọi ô search/filter mới.
- **`ddl-auto=update` chỉ set default ở Java-side, không set `DEFAULT` ở DB** — cột mới thêm vào entity có giá trị mặc định Java sẽ có `NULL` ở các dòng cũ trong DB, làm filter `=` sai. Cần khai `@Column(columnDefinition = "... DEFAULT '...'")` + backfill SQL 1 lần cho dữ liệu cũ.
- **Không đọc lại thông tin lịch sử (giá, khuyến mãi) từ entity hiện tại** — nếu dữ liệu đó có thể đổi/hết hạn theo thời gian (giá sản phẩm, khuyến mãi), phải snapshot tại thời điểm phát sinh giao dịch, không suy luận ngược từ trạng thái hiện tại.
- **`FormatResponse.java`** (global `ResponseBodyAdvice`) tự bọc mọi response thành công vào `RestResponse{...}` — controller **không được** tự bọc thêm 1 lớp `RestResponse` nữa ở nhánh thành công (gây lồng 2 lớp, `response.data` phía frontend sai). Trả raw value, để `FormatResponse` bọc đúng 1 lần.
- **Không bind thẳng JPA entity từ `@RequestBody` cho input do client kiểm soát nhiều field** (rủi ro mass-assignment — client tự gửi `id`/`role`/`status`). Dùng DTO input riêng, chỉ nhận field hợp lệ.
- **`SecurityUtil.getUserRole()`/`getUserId()` đã bị xoá hẳn** (từng chết/sai vì giả định principal là `Jwt` trong khi thực tế là `String`) — đọc role/id qua `SecurityContextHolder...getAuthorities()` / `SecurityUtil.getCurrentUserLogin()`.
- **Mọi endpoint `hasRole("ADMIN")` hiện trả `401` thay vì `403`** khi user đã đăng nhập nhưng sai quyền (nghi `AccessDeniedException` bị route nhầm qua entry point 401) — hành vi cũ toàn hệ thống, chưa sửa, xem "Vấn đề còn lại".
- **UI Select controlled với option giả `{value:"default"}`** làm placeholder hiện như giá trị thật (chữ đậm) — dùng `value={state || undefined}` + `placeholder` thật thay vì option giả.
- **`??` không fallback được cột DB có `DEFAULT 0`** (chỉ coi `null`/`undefined` là thiếu) — dùng `||` khi muốn coi cả `0` là "chưa có dữ liệu".
- **Method `@Async` không giữ được Hibernate session của request gốc** — truy cập field `FetchType.LAZY` bên trong sẽ ném `LazyInitializationException` bị nuốt âm thầm (log console, không lỗi HTTP). Thêm `@Transactional(readOnly = true)`.
- **State/`Set` dùng chung cho toàn danh sách** (VD `pendingUpdates` cho cả giỏ hàng) để gate UI dễ gây block nhầm — chỉ nên gate theo đúng item liên quan, không theo toàn danh sách.
- **Nhiều nơi tự dựng `OrderDTO` thủ công** (`findOrder`, `convertToOrderDTO`, `cancelOrder`...) thay vì dùng chung 1 hàm convert — thêm field mới vào `OrderDetailDTO` cần rà lại tất cả các nơi này.

## Vấn đề còn lại — bước tiếp theo

**Tạm hoãn, chờ giải pháp thay thế (người dùng chủ động chọn không vá):**
1. `apiGetRecommendedProducts` gọi `axiosInstanceRecommended` không tồn tại — gợi ý sản phẩm gãy hoàn toàn.
2. Google OAuth login đã viết nhưng bị comment out trong `Login.jsx` (thiếu `VITE_GOOGLE_CLIENT_ID`).
3. Đăng ký tài khoản chưa xác thực OTP qua email.

**Cần dành 1 phiên riêng:**
4. Sửa mã HTTP `401→403` cho mọi endpoint `hasRole("ADMIN")` khi user thiếu quyền (không phải chưa đăng nhập).
5. Xác định root cause thật của bug dấu tiếng Việt trong query filter (đang chỉ workaround ở frontend).
6. Rà thêm các ô search/filter admin còn lại xem có dính bug dấu tiếng Việt chưa vá (đã vá: `Product.jsx`, `Category.jsx`; chưa rà: `Feedback.jsx` và các search khác).

**Nợ kỹ thuật nhỏ, chưa xử lý:**
7. `EditUserForm.jsx`: `initialUserData` không cập nhật sau khi lưu (đông cứng lúc mount).
8. `OrderService.applyVoucherToOrder()` — gọi `userVoucher.getIsUsed()` trước khi check `null`, có thể NPE với voucher public chưa có `UserVoucher` riêng.
9. `PromotionExpiryScheduler` (cron mỗi giờ) chưa test real-time, chỉ qua code review — theo dõi log/DB sau khi deploy.
10. Bug reset trang khi đổi filter lúc đang ở trang phân trang >1 (`pages/guest/Product.jsx`) — biết từ trước, ngoài phạm vi các lần sửa gần đây.
11. `active=true` cho `GET /products` công khai hiện chỉ ép ở phía client — chưa xác nhận backend có mặc định chặn `active=false` cho request không xác thực hay không.

**Quyết định còn mở (thảo luận dừng giữa chừng):**
12. Cơ chế xử lý khi gửi email thất bại (retry lỗi gửi thật/log có ngữ cảnh/chặn domain test/lưu DB để admin gửi lại) — đã đề xuất 4 hướng, chưa chốt.

**Chủ động không làm (theo yêu cầu người dùng):**
13. Tab "Đơn hàng chứa sản phẩm" ở trang chi tiết sản phẩm admin (cần endpoint mới join `Order`/`OrderDetail` theo `productId`).

## Biến môi trường (`.env`)

```
VITE_BACKEND_URL = "http://localhost:8080/api/v2"
VITE_BACKEND_TARGET = http://localhost:8080
VITE_RECOMMENDED_URL = http://localhost:8000
# còn thiếu: VITE_GOOGLE_CLIENT_ID (cần nếu bật lại Google login)
```

## Xem thêm

- [rules/tech-defaults.md](rules/tech-defaults.md) — quy ước code mặc định.
- [rules/workflow.md](rules/workflow.md) — cách chạy/build/test.
- [rules/design.md](rules/design.md) — quy ước thiết kế/giao diện.
