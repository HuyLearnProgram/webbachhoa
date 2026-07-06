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

- `src/utils/axios.js`: 1 `axiosInstance` (`baseURL = VITE_BACKEND_URL`). Request interceptor đọc JWT trực tiếp từ `localStorage['persist:ogani_shop/user']` để gắn `Authorization`. Response interceptor tự refresh token khi 401 qua `GET /auth/refresh`, gộp các lần refresh đồng thời qua biến `refreshPromise` (đã xử lý xong, xem lịch sử bên dưới).
- `src/apis/{app,category,location,order,product,user}.js`: các hàm gọi API theo domain. `location.js` gọi thẳng API công khai bên ngoài (esgoo.net) cho tỉnh/huyện/xã, không qua `axiosInstance`.

## Tích hợp đáng chú ý

- **VNPay**: `Checkout.jsx` redirect sang trang thanh toán VNPay, lưu tạm dữ liệu đơn vào `localStorage` để trang callback (`PaymentSuccess.jsx`) hoàn tất (cập nhật tồn kho, xoá giỏ hàng, gửi email).
- **Voucher giảm giá**: xử lý inline trong `Checkout.jsx` (`apiGetMyVouchers`, tính % hoặc số tiền cố định).
- **Đánh giá sản phẩm**: `apiRatings`/`apiGetRatingsPage`, hiển thị qua `Votebar`, `Comment`, modal `VoteOption`.
- **Ảnh sản phẩm/avatar**: phục vụ từ storage của backend (`VITE_BACKEND_TARGET/storage/...`), README nhắc Cloudinary nhưng thực tế chưa thấy tích hợp SDK Cloudinary trong `src/`.

## Lịch sử các phần đã hoàn thành (tóm tắt)

Các mục dưới đây **đã xử lý xong và xác nhận qua test**, không cần xem xét lại — chỉ giữ tóm tắt để biết bối cảnh, không đi sâu chi tiết.

- **Cơ chế refresh token** — 4 lỗi chồng lên nhau (biến `state` undefined trong `axios.js`, dùng sai axios instance khi retry, backend không bao giờ trả 401 do thiếu `CustomAuthenticationEntryPoint`, race condition khi nhiều request cùng gọi `/auth/refresh`) đều đã sửa. *Quyết định*: sửa backend trả đúng 401 thay vì vá frontend coi 403 như 401, để giữ đúng ngữ nghĩa REST (401 = chưa xác thực, 403 = thiếu quyền).
- **PersistGate** — thiếu `<PersistGate>` gây flash sai trạng thái đăng nhập + đá nhầm về `/login` khi F5 trang member. Đã thêm vào `main.jsx`.
- **Thunk `getCurrentUser`** — dùng sai `isRejectedWithValue` (type-guard) thay vì `rejectWithValue` (từ `thunkAPI`) khiến thunk không bao giờ reject đúng khi lỗi. Đã sửa.
- **Dọn code chết/cấu hình sai**: route `Feedback` trùng lồng trong `App.jsx` (không thể tới được, đã xoá) · `package.json` xoá `"client": "file:"`, `"npm"`, `"i"` (dependency thừa/cài nhầm), `vite-jsconfig-paths` chỉ giữ ở `devDependencies` · `ProviderWrapper.jsx` chuyển từ `src/store/` sang thư mục test (chỉ dùng cho `Checkout.test.jsx`) · đã thêm `.env.example`.
- **Quản lý người dùng (User) trong admin** — xây mới hoàn chỉnh: trang Edit User (`EditUser.jsx` + `EditUserForm.jsx`), tìm kiếm/lọc trong `User.jsx` (sửa 2 lỗi ẩn: thiếu `paramsSerializer` ở frontend + `UserService.fetchAllUser()` bỏ quên tham số `Specification` ở backend), email thông báo tự động khi admin sửa thông tin/khoá tài khoản (phân biệt rõ với user tự sửa qua `SecurityUtil.getCurrentUserLogin()`), bắt buộc chọn lý do khi khoá tài khoản, chặn admin tự khoá chính mình, polish layout form + nút "Quay về" (`TurnBackHeader.jsx`, dùng chung 6 trang admin). *Quyết định*: bỏ hẳn chức năng Xoá cứng user (rủi ro vỡ ràng buộc khoá ngoại với đơn hàng/đánh giá vì không có `cascade`, dùng Khoá/Active thay thế); chọn gửi email minh bạch-sau-khi-sửa thay vì audit log (chỉ truy vết được sau sự việc) hoặc cơ chế xin-phép-trước qua toggle (có lỗi logic con-gà-quả-trứng: user cần admin sửa giúp nhiều nhất chính là lúc họ không tự bật được toggle đó).

## Vấn đề còn lại — bước tiếp theo

**Tạm hoãn, chờ giải pháp thay thế (người dùng chủ động chọn không vá code cũ):**
1. `apiGetRecommendedProducts` (`src/apis/product.js`) gọi `axiosInstanceRecommended` không tồn tại — tính năng gợi ý sản phẩm gãy hoàn toàn.
2. Google OAuth login đã viết (`GoogleLogin`, `apiLoginGoogle`) nhưng bị comment out trong `Login.jsx`.

**Nợ kỹ thuật nhỏ từ trang User admin (chưa xử lý):**
3. `EditUserForm.jsx`: `initialUserData` là snapshot đông cứng lúc mount, không cập nhật sau khi lưu — hiếm khi gây sai nếu lưu nhiều lần liên tiếp không rời trang.
4. `EditUser.jsx` không xử lý lỗi khi `getUserById` thất bại — đứng ở "Loading..." vĩnh viễn, không báo lỗi.
5. `EditUserForm.jsx` chưa có chức năng đổi avatar (chỉ xem).
6. "Loading..." ở `EditUser.jsx` là text thô, nên đổi sang `<Spin/>` của Ant Design cho đồng bộ.

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
