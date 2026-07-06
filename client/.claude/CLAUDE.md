# Bách Hóa E-commerce — Frontend (client)

## Tổng quan

Frontend React cho website thương mại điện tử bách hóa (Vietnamese grocery e-commerce). Kiến trúc SOA/REST: frontend này giao tiếp với backend Spring Boot nằm ở `../server` qua RESTful API. Repo: https://github.com/HuyLearnProgram/webbachhoa

## Tech stack

- **React 18** + **Vite** (JS thuần, không TypeScript). Alias `@/* → src/*` (xem `jsconfig.json`).
- **State**: Redux Toolkit + `redux-persist` (persist vào `localStorage`, key `ogani_shop/user`, whitelist `isLoggedIn/token/current`).
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

- `src/utils/axios.js`: 1 `axiosInstance` (`baseURL = VITE_BACKEND_URL`). Request interceptor đọc JWT trực tiếp từ `localStorage['persist:ogani_shop/user']` để gắn `Authorization`. Response interceptor tự refresh token khi 401 qua `GET /auth/refresh`, có gộp các lần refresh đồng thời qua biến `refreshPromise` (xem [Cơ chế refresh token — đã sửa](#cơ-chế-refresh-token--đã-sửa-2026-07-06)).
- `src/apis/{app,category,location,order,product,user}.js`: các hàm gọi API theo domain. `location.js` gọi thẳng API công khai bên ngoài (esgoo.net) cho tỉnh/huyện/xã, không qua `axiosInstance`.

## Tích hợp đáng chú ý

- **VNPay**: `Checkout.jsx` redirect sang trang thanh toán VNPay, lưu tạm dữ liệu đơn vào `localStorage` để trang callback (`PaymentSuccess.jsx`) hoàn tất (cập nhật tồn kho, xoá giỏ hàng, gửi email).
- **Voucher giảm giá**: xử lý inline trong `Checkout.jsx` (`apiGetMyVouchers`, tính % hoặc số tiền cố định).
- **Đánh giá sản phẩm**: `apiRatings`/`apiGetRatingsPage`, hiển thị qua `Votebar`, `Comment`, modal `VoteOption`.
- **Ảnh sản phẩm/avatar**: phục vụ từ storage của backend (`VITE_BACKEND_TARGET/storage/...`), README nhắc Cloudinary nhưng thực tế chưa thấy tích hợp SDK Cloudinary trong `src/`.

## Vấn đề kỹ thuật đã biết (chưa xử lý)

> Lỗi "`utils/axios.js` tham chiếu biến `state` chưa import ⇒ cơ chế refresh token không hoạt động" từng liệt kê ở đây **đã được sửa xong** (2026-07-06) — xem chi tiết đầy đủ ở mục [Cơ chế refresh token — đã sửa](#cơ-chế-refresh-token--đã-sửa-2026-07-06) bên dưới.

> Lỗi "thiếu `<PersistGate>` ⇒ flash sai trạng thái đăng nhập" từng liệt kê ở đây **đã được sửa xong** (2026-07-06) — xem chi tiết ở mục [Thêm PersistGate — đã sửa](#thêm-persistgate--đã-sửa-2026-07-06) bên dưới.

> Lỗi "thunk `getCurrentUser` dùng sai `isRejectedWithValue`" từng liệt kê ở đây **đã được sửa xong** (2026-07-06) — xem chi tiết ở mục [Sửa thunk getCurrentUser — đã sửa](#sửa-thunk-getcurrentuser--đã-sửa-2026-07-06) bên dưới.

> Lỗi "route `Feedback` lồng trong `Admin` bị đăng ký trùng/không thể tới được" từng liệt kê ở đây **đã được sửa xong** (2026-07-06) — xem chi tiết ở mục [Dọn route Feedback trùng — đã sửa](#dọn-route-feedback-trùng--đã-sửa-2026-07-06) bên dưới.

> Lỗi "vệ sinh `package.json`: `client: file:` tự tham chiếu, `npm` bị liệt kê nhầm như dependency" từng liệt kê ở đây **đã được sửa xong** (2026-07-06) — xem chi tiết ở mục [Dọn package.json — đã sửa](#dọn-packagejson--đã-sửa-2026-07-06) bên dưới.

> Lỗi "`src/store/ProviderWrapper.jsx` là dead code" từng liệt kê ở đây **đã được sửa xong** (2026-07-06) — xem chi tiết ở mục [Dọn ProviderWrapper — đã sửa](#dọn-providerwrapper--đã-sửa-2026-07-06) bên dưới.

> Lỗi "`package.json` còn `\"i\"` thừa + `vite-jsconfig-paths` khai báo trùng" từng liệt kê ở đây **đã được sửa xong** (2026-07-06) — xem chi tiết ở mục [Dọn package.json — đã sửa](#dọn-packagejson--đã-sửa-2026-07-06) bên dưới.

> Lỗi "thiếu `.env.example`" từng liệt kê ở đây **đã được sửa xong** (2026-07-06) — đã tạo `client/.env.example` theo đúng format `.env` hiện có, gồm cả `VITE_GOOGLE_CLIENT_ID` (để trống, kèm ghi chú cần khi bật lại Google OAuth). Xác nhận `.gitignore` chỉ chặn `.env` thật, không chặn `.env.example`.

### Tạm hoãn — chờ giải pháp thay thế, không vá code cũ (2026-07-06)

3 mục dưới đây người dùng **chủ động quyết định KHÔNG sửa/vá code hiện tại**, để dành làm lại bằng giải pháp tốt hơn ở phiên sau (chưa chốt giải pháp cụ thể tại thời điểm ghi chú này):

1. `apiGetRecommendedProducts` (`src/apis/product.js`) gọi `axiosInstanceRecommended` — biến này không được import ở đâu cả, biến môi trường `VITE_RECOMMENDED_URL` có vẻ chưa được đấu nối. Tính năng gợi ý sản phẩm đang gãy hoàn toàn.
2. Google OAuth login đã viết (`GoogleLogin`, `apiLoginGoogle`) nhưng đang bị comment out trong `Login.jsx`.
3. `src/pages/admin/EditUser.jsx` chưa hoàn thiện (state/handler tham chiếu biến không tồn tại) và không được route tới — tính năng sửa user từ admin coi như chưa có.

## Cơ chế refresh token — đã sửa (2026-07-06)

Bắt đầu từ lỗi #1 cũ (`state` không tồn tại trong `utils/axios.js`), quá trình sửa + test thủ công trên trình duyệt lần lượt lộ ra tổng cộng **4 lớp lỗi chồng lên nhau** khiến cơ chế refresh token chưa từng hoạt động đúng từ trước tới giờ. Cả 4 đã được sửa và xác nhận qua test thực tế (đăng nhập → phá access token trong localStorage → vào trang cần xác thực → quan sát Network/Console).

### Trạng thái từng lỗi

| # | Lỗi | File | Trạng thái |
|---|-----|------|------------|
| 1 | `if (!state.user.isLoggedIn)` — biến `state` không tồn tại ⇒ `ReferenceError` ngay khi gặp 401, cắt đứt toàn bộ luồng refresh | `client/src/utils/axios.js` | ✅ Sửa thành `store.getState().user.isLoggedIn` |
| 2 | Sau khi refresh xong, retry request gốc bằng `axios(originalRequest)` (axios gốc) thay vì `axiosInstance` ⇒ bỏ qua interceptor unwrap `response.data`, trả sai format mà cả app đang phụ thuộc (`result.statusCode`) | `client/src/utils/axios.js` | ✅ Sửa thành `axiosInstance(originalRequest)` |
| 3 | Backend **không bao giờ trả 401** cho token thiếu/sai/hết hạn — luôn fallback về `Http403ForbiddenEntryPoint` mặc định của Spring Security, vì `CustomAuthenticationEntryPoint` bị comment out hoàn toàn và không có `exceptionHandling()` nào được cấu hình trong filter chain. Hệ quả: điều kiện `status === 401` mà frontend chờ không bao giờ xảy ra trong thực tế | `server/server/.../config/CustomAuthenticationEntryPoint.java`, `SecurityConfiguration.java` | ✅ Viết lại `CustomAuthenticationEntryPoint` (trả JSON 401 theo đúng shape `RestResponse`), wire vào `filterChain` qua `.exceptionHandling(exception -> exception.authenticationEntryPoint(customAuthenticationEntryPoint))` |
| 4 | Race condition: nhiều request xác thực xảy ra gần như đồng thời khi vào trang cá nhân (`TopHeader` gọi `/auth/account`, `Personal.jsx` gọi API user riêng) — cả 2 cùng nhận 401 và **mỗi request tự gọi `/auth/refresh` độc lập**; refresh đầu xoay vòng token trong DB + cookie, refresh sau vẫn gửi cookie cũ ⇒ backend trả `400 "Refresh token không hợp lệ"`. Lỗi này chỉ lộ ra **sau khi** lỗi #1–#3 đã được sửa (trước đó code chưa từng chạy tới đoạn này) | `client/src/utils/axios.js` | ✅ Thêm biến dùng chung `refreshPromise` + hàm `requestNewAccessToken()` để gộp mọi lần gọi `/auth/refresh` đồng thời thành 1 request duy nhất, các request 401 khác chờ chung kết quả |

### Trạng thái: ĐÃ ĐÓNG (2026-07-06)

Người dùng đã test lại lần cuối trên trình duyệt sau fix #4 (đăng nhập → sửa `token` sai trong `localStorage['persist:ogani_shop/user']` → vào `/member/profile`) và xác nhận không còn bất thường (không còn `400`/`403` sai, không còn lỗi JS trong Console). Cơ chế refresh token coi như đã hoạt động đúng hoàn toàn — không cần thao tác gì thêm cho mục này.

Các lỗi kỹ thuật còn lại (#1–#9 ở mục trên) chưa được đụng tới, để dành cho các phiên làm việc sau.

### Quyết định quan trọng & lý do

1. **Sửa backend để trả 401 chuẩn, thay vì chỉ vá frontend bằng cách coi 403 như 401.** Lý do: trong app này, 403 đang dùng chung cho 2 tình huống khác bản chất — (a) chưa xác thực/token hỏng, (b) đã đăng nhập nhưng thiếu quyền (VD user thường gọi API `hasRole("ADMIN")`). Nếu vá frontend để coi mọi 403 là "cần refresh", sẽ gây gọi `/auth/refresh` thừa mỗi khi user thường lỡ chạm API admin, đồng thời làm nhoè ranh giới ngữ nghĩa 401/403 chuẩn REST. Đây là lựa chọn được đưa ra sau khi hỏi và người dùng chọn hướng sửa đúng gốc ở backend.
2. **Đăng ký `CustomAuthenticationEntryPoint` qua `.exceptionHandling(...)` thay vì `.oauth2ResourceServer(...)`.** Bản code cũ bị comment trong `SecurityConfiguration.java` định dùng `oauth2ResourceServer(oauth2 -> oauth2.jwt(...).authenticationEntryPoint(...))`, nhưng app đang dùng `JwtAuthenticationFilter` tự viết tay (không phải cơ chế resource-server chuẩn của Spring dựa trên `jwtDecoder`/`jwtAuthenticationConverter`). Bật `oauth2ResourceServer` sẽ tạo thêm một cơ chế xác thực song song không cần thiết, ngoài phạm vi sửa lỗi. `.exceptionHandling()` là hook tổng quát ở tầng `ExceptionTranslationFilter`, hoạt động đúng bất kể `Authentication` được set bởi filter nào.
3. **Không sửa dòng cuối của response interceptor (`return error.response.data` cho các lỗi không phải 401).** Hành vi "resolve thay vì reject" là chủ đích xuyên suốt toàn app — mọi trang gọi API đều kiểm tra `result.statusCode` thay vì dùng `.catch()` (VD `Login.jsx`). Sửa lại sẽ phá vỡ error-handling ở rất nhiều nơi khác, ngoài phạm vi của lần sửa lỗi refresh token này.
4. **Không tuỳ biến body JSON cho lỗi 403 (`AccessDeniedHandler`).** Yêu cầu chỉ là phân biệt đúng 401 vs 403; giữ nguyên hành vi mặc định của Spring cho trường hợp 403 (thiếu quyền) vì không nằm trong phạm vi lỗi đang sửa.

## Thêm PersistGate — đã sửa (2026-07-06)

**Vấn đề**: `redux-persist` đã tạo sẵn `persistor` (`export const persistor = persistStore(store)` trong `src/store/redux.js`) nhưng chưa từng được dùng — `src/main.jsx` chỉ bọc `<App/>` bằng `<Provider store={store}>`, không có `<PersistGate>`. Vì state khởi tạo của `userSlice` là `isLoggedIn: false, current: null, token: null` (giống hệt trạng thái chưa đăng nhập), mọi component đọc `state.user` ở lần render đầu tiên — trước khi `redux-persist` kịp đọc xong `localStorage` — sẽ thấy sai trạng thái này. Hai hệ quả cụ thể đã xác nhận qua đọc code:
- `TopHeader.jsx`: flash UI — hiện "Đăng nhập hoặc đăng ký" rồi mới nhảy sang "Welcome, {tên}".
- `MemberLayout.jsx`: nghiêm trọng hơn — `if(!isLoggedIn || !current) return <Navigate to="/login"/>` chạy ngay từ render đầu, khiến người dùng **đã đăng nhập** vào thẳng 1 trang member (VD `/member/profile`) rồi F5 sẽ bị đá nhầm về `/login`.

**Đã sửa**: `client/src/main.jsx` — import `persistor` từ `@/store/redux` (không cần sửa `redux.js`, đã export sẵn) và `PersistGate` từ `redux-persist/integration/react`, bọc quanh `<BrowserRouter>`/`<App/>`, bên trong `<Provider>`:

```jsx
<Provider store={store}>
  <PersistGate loading={null} persistor={persistor}>
    <BrowserRouter>
        <App />
    </BrowserRouter>
  </PersistGate>
</Provider>
```

`loading={null}` vì rehydrate từ `localStorage` là đồng bộ/rất nhanh — không cần dựng thêm component loading riêng (dự án cũng chưa có sẵn spinner dùng chung để tái sử dụng).

**Đã xác nhận** qua kiểm tra thủ công trên trình duyệt: không còn flash sai trạng thái đăng nhập, vào thẳng trang member rồi F5 không còn bị đá nhầm về `/login`.

## Sửa thunk getCurrentUser — đã sửa (2026-07-06)

**Vấn đề**: `src/store/user/asyncActions.js` gọi `isRejectedWithValue(...)` — đây là một **type-guard/matcher** của Redux Toolkit (dùng để *kiểm tra* một action có phải "rejected with value" hay không), không phải hàm dùng để tạo rejection. Vì tham số truyền vào không phải action thật, hàm này chỉ trả về `false`, và vì async function không hề `throw`, thunk **luôn resolve thành công** dù request thất bại (403 hoặc lỗi khác). Hệ quả: `getCurrentUser.fulfilled` luôn chạy, set `state.current = false` (sai kiểu dữ liệu) và `state.isLoggedIn = true` — dù request vừa thất bại. Nhánh `getCurrentUser.rejected` trong `userSlice.js` (đã viết đúng logic dọn dẹp state) chưa từng được kích hoạt trong thực tế. Bất kỳ chỗ nào đọc `current.name`/`current.cartLength` (`TopHeader.jsx`, `ProductCard.jsx`, ...) có nguy cơ gặp lỗi runtime vì `current` không phải object.

**Đã sửa**: `client/src/store/user/asyncActions.js` — dùng đúng `rejectWithValue` lấy từ tham số thứ 2 (`thunkAPI`) của payload creator:

```js
export const getCurrentUser = createAsyncThunk("user/current", async (_, { rejectWithValue }) => {
  ...
  return rejectWithValue(new Error("User is not authorized"));
  ...
  return rejectWithValue(response);
```

Bỏ import `isRejectedWithValue` không dùng nữa. Không đổi gì trong `userSlice.js` — nhánh `rejected` ở đó đã đúng sẵn, giờ mới thực sự được kích hoạt.

**Đã xác nhận** qua kiểm tra thủ công trên trình duyệt: khi request xác thực thất bại, app trở về đúng trạng thái "chưa đăng nhập" thay vì trạng thái nửa vời trước đây.

## Dọn route Feedback trùng — đã sửa (2026-07-06)

**Vấn đề**: `App.jsx` khai báo `<Route path={path.ADMIN_LAYOUT} element={<Admin/>}>` với con là `<Route path={path.FEEDBACK} element={<Feedback/>}/>`. Nhưng `path.ADMIN_LAYOUT = "/admin/*"` (có splat `*`) — nghĩa là route này chủ ý nhường toàn bộ định tuyến con cho chính `<Admin/>` tự xử lý bằng `<Routes>` riêng bên trong (`Admin.jsx` dòng 46-64, đã có sẵn đúng route `path.FEEDBACK` ở dòng 57). Vì `<Admin/>` không render `<Outlet/>`, route con khai báo lồng ở `App.jsx` không bao giờ có cơ hội render — là code chết, gây hiểu nhầm khi đọc. Tính năng Feedback trên thực tế vẫn hoạt động bình thường nhờ route đúng trong `Admin.jsx` (sidebar `AdminNavigationPath.js` trỏ tới `path.ADMIN_FEEDBACK`, cùng giá trị `"feedback"` với `path.FEEDBACK`).

**Đã sửa**: `client/src/App.jsx` — xoá route con `path.FEEDBACK` lồng trong `path.ADMIN_LAYOUT` và import `Feedback` không còn dùng tới:

```jsx
// trước
import { Admin, Feedback } from "./pages/admin/index";
...
<Route path={path.ADMIN_LAYOUT} element={<Admin/>}> 
  <Route path={path.FEEDBACK} element={<Feedback />}></Route>   
</Route>

// sau
import { Admin } from "./pages/admin/index";
...
<Route path={path.ADMIN_LAYOUT} element={<Admin/>} />
```

Không đổi gì trong `Admin.jsx` — route feedback thật đã đúng sẵn ở đó.

**Đã xác nhận** qua kiểm tra thủ công trên trình duyệt: trang Feedback trong admin vẫn load bình thường như trước, không có thay đổi hành vi.

## Dọn package.json — đã sửa (2026-07-06)

**Vấn đề**: `dependencies` trong `client/package.json` có 2 mục sai:
- `"client": "file:"` — chính project tự khai là dependency của chính nó (`file:` không trỏ tới đường dẫn cụ thể nào), vô nghĩa, chỉ tồn tại do lỗi thao tác `npm install` trước đó.
- `"npm": "^10.9.0"` — `npm` là package manager, không phải thứ app runtime cần import; liệt kê nó như dependency kéo theo cả bộ CLI của npm (và cây dependency khổng lồ của nó) vào `node_modules` một cách không cần thiết.

**Đã sửa**: xoá cả 2 dòng khỏi `dependencies`, chạy `npm install` để đồng bộ `package-lock.json` — giảm được 244 package không cần thiết khỏi `node_modules` (toàn bộ cây phụ thuộc kéo theo bởi `npm`). Xác nhận không có file nào trong `src/` import từ package `npm`, và `npm run build` vẫn chạy thành công sau khi xoá.

**Đợt 2 (2026-07-06, cùng ngày)** — dọn thêm 2 điểm nhỏ còn lại:
- `"i": "^0.3.7"` trong `dependencies` — không có file nào trong `src/` import từ package `i` (nhiều khả năng cài nhầm do gõ lệnh sai, VD gõ `npm i` tách rời thành 2 lệnh). **Đã xoá**.
- `vite-jsconfig-paths` bị khai báo trùng ở cả `dependencies` lẫn `devDependencies` — package này chỉ được dùng trong `vite.config.js` (công cụ build/dev, không phải code runtime của app), nên chỉ cần nằm ở `devDependencies`. **Đã xoá khỏi `dependencies`**, giữ lại ở `devDependencies`.

Đã chạy `npm install` (đồng bộ lock, giảm thêm 1 package trùng) và `npm run build` — build thành công, alias `@/` vẫn resolve đúng (xác nhận việc chuyển `vite-jsconfig-paths` khỏi `dependencies` không ảnh hưởng gì).

**Chưa xử lý** (phát hiện thêm, ngoài phạm vi yêu cầu ban đầu — xem mục "Vấn đề kỹ thuật đã biết" #5): `"i": "^0.3.7"` trong `dependencies` (nhiều khả năng cài nhầm do gõ lệnh sai, VD gõ `npm i` tách rời thành 2 lệnh) và `vite-jsconfig-paths` bị khai báo trùng ở cả `dependencies` (dòng cuối) lẫn `devDependencies`.

## Dọn ProviderWrapper — đã sửa (2026-07-06)

**Vấn đề**: `src/store/ProviderWrapper.jsx` (chỉ bọc `<Provider store={store}>`, không có `BrowserRouter`/`PersistGate`) nằm trong `src/store/` — thư mục chỉ nên chứa code store thật của app — nhưng `main.jsx` không hề dùng tới nó (app dùng trực tiếp `<Provider>` từ `react-redux`). Nơi duy nhất còn dùng là `src/pages/guest/__tests__/Checkout.test.jsx`, dùng làm `wrapper` cho `render()` của React Testing Library ở cả 6 test case. Vì nằm sai vị trí (trông như code production thật), file này dễ gây hiểu nhầm khi đọc code.

**Đã sửa**: chuyển file thành test utility, đặt cạnh file test duy nhất dùng nó — `src/pages/guest/__tests__/ProviderWrapper.jsx` (nội dung giữ nguyên), xoá file cũ ở `src/store/ProviderWrapper.jsx`, cập nhật import trong `Checkout.test.jsx` từ `@/store/ProviderWrapper` → `./ProviderWrapper`.

**Đã xác nhận**: chạy `npx vitest run src/pages/guest/__tests__/Checkout.test.jsx` — cả 6 test case đều pass; grep toàn bộ `src/` không còn tham chiếu nào tới đường dẫn cũ.

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
