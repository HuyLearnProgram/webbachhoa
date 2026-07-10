# Bách Hóa E-commerce — Frontend (client)

## ƯU TIÊN CAO NHẤT — Đang xây dựng: Hệ thống gợi ý sản phẩm AI tự học

**Đây là hạng mục ưu tiên số 1 hiện tại, tách biệt hoàn toàn khỏi các nợ kỹ thuật ở mục "Vấn đề còn lại"** — không gộp chung khi lên kế hoạch làm việc, luôn ưu tiên phần này trước các mục khác trong file này.

Thay thế hoàn toàn cho nợ cũ "`apiGetRecommendedProducts` gãy" (mục đó đã lỗi thời, xem cập nhật trong "Vấn đề còn lại") — không chỉ sửa lại link chết mà xây hẳn 1 hệ thống gợi ý cá nhân hoá **tự học liên tục** (continual learning), dựa trên lịch sử mua/xem/tìm kiếm/mua chung/bán chạy, bắt buộc có cơ chế chống nhàm chán (không được lặp lại mãi 1 vài category khiến khách chán).

**Tài liệu đầy đủ** (research tham số/signal, thiết kế entity/DB, thuật toán candidate generation + diversity + bandit, ngưỡng dữ liệu từng giai đoạn, rủi ro kỹ thuật đặc thù dự án): `../recommendation-service/AI_Recommendation_Roadmap.docx`.

**Kiến trúc đã chốt**: Python microservice riêng (thư mục `recommendation-service/` ở root repo), Java backend đóng vai trò proxy sang (giữ JWT auth tập trung, không expose Python service ra ngoài trực tiếp). Roadmap bắt buộc theo mốc dữ liệu (không build 1 lần xong) vì dữ liệu tương tác thật hiện gần như bằng 0 (dump DB seed chỉ ~4 đơn hàng, ~2 user, 0 feedback) — chưa đủ điều kiện train ML thật, phải xây hạ tầng thu thập dữ liệu trước rồi mới bật từng phần ML theo ngưỡng.

**Tiến độ** (cập nhật trạng thái ở đây mỗi khi hoàn thành 1 phase, để theo dõi xuyên suốt dự án):
- [x] **Phase 0** — Event tracking mới (`ProductView`, `SearchLog`, `RecommendationImpression`, `CartEvent`; migration `Wishlist.addedAt`; expose `Cart.timestamp` vào `CartItemDTO`), sessionId ẩn danh cho guest + merge khi login, fix tạm "Sản phẩm tương tự" bằng rule-based thuần Java (cùng category, sort `sold`/`rating`). **Đã code xong + verify end-to-end qua API/DB thật, kể cả UI trình duyệt thật** (guest tracking, merge session, cart ADD/UPDATE_QTY/REMOVE, dấu tiếng Việt trong keyword, validation input, similar-products slate, impression qua IntersectionObserver, click-through rail, log search từ trang tìm kiếm). **Hoàn tất — không còn việc tồn đọng.**
  - Sau khi test UI thật phát hiện + đã sửa 2 lỗi ở tầng gán `source`/click-through cho `ProductView`/`RecommendationImpression`: (1) trang Home (`HotDeals`/`FeatureProduct`) và trang danh sách/tìm kiếm (`Product.jsx`) chưa set `viewSource` trước khi điều hướng nên mọi lượt xem đều bị gán `DIRECT` thay vì `HOME_FEED`/`SEARCH_RESULT`/`CATEGORY_PAGE`; (2) `RecommendationRail.jsx` và `Product.jsx` dùng `div onClickCapture` bọc quanh `ProductCard` để log click-through — capture phase fire cho **mọi** click con (kể cả nút Quick View/Add to cart/Wishlist) dù các nút đó đã `stopPropagation()` ở bubble phase, nên bấm các nút phụ đó cũng bị tính nhầm thành click-through/handoff source. Đã fix bằng cách chuyển toàn bộ logic vào đúng `onClick` chính của `ProductCard` qua 2 prop mới `viewSource`/`referrerProductId` + `onBeforeNavigate` (callback chỉ chạy khi thực sự điều hướng) — xem `src/components/products/ProductCard.jsx`, `RecommendationRail.jsx`, `src/utils/viewSourceHandoff.js` (constant `VIEW_SOURCE_HANDOFF_KEY` tách ra file riêng để tránh import vòng).
- [x] **Phase 1** — Python service `recommendation-service/` (FastAPI :8000, venv + uvicorn, đọc thẳng MySQL, xem `../recommendation-service/README.md`): content-based (TF-IDF bigram + price-bucket theo category, top-50 neighbors) + co-purchase (FP-Growth, "chạy im lặng" — dưới 30 transaction thì rules rỗng không lỗi) + popularity (sold/trend7/trend30) + blend theo placement + **MMR diversity bật từ đầu** (λ=0.7 tự hạ theo category-entropy). Retrain nightly 02:00 (APScheduler, atomic swap) + `POST /internal/retrain` cho dev. Java proxy: `RecommendationService` gọi Python qua bean riêng `recommendationRestTemplate` (timeout 2s/2.5s), Python chỉ trả `product_id+score`, Java hydrate `SearchProductDTO` từ DB (giá/khuyến mãi luôn tươi); **mọi lỗi/timeout/rỗng → fallback rule-based/best-seller thuần Java, `algorithmSource=RULE_BASED_FALLBACK`** (đã drill thật: kill Python → 3 endpoint vẫn 200 trong ~100ms, bật lại tự hồi phục không cần restart Java). Endpoint mới `GET recommendations/home` + `recommendations/cart-suggestions` (permitAll, userId chỉ derive từ JWT — không nhận từ client). UI: Home thêm section "Gợi ý dành cho bạn" (`HomeRecommendation.jsx`, ngay sau Banner, refetch khi đổi trạng thái đăng nhập), giỏ hàng thêm "Có thể bạn cũng thích" (key theo danh sách id đã sort — không refetch khi chỉ đổi quantity), PDP giữ nguyên endpoint cũ nhưng nguồn thành `CONTENT_BASED`. **Đã verify E2E qua Selenium trình duyệt thật** (guest popularity → click-through → PDP similar → login merge session → Home chuyển `CONTENT_BASED` → cart rail; impression/click/view ghi đúng user_id + placement + source trong DB). Lưu ý vận hành: cần chạy `recommendation-service` trước backend nếu muốn nguồn AI (không chạy cũng không sao — fallback tự lo); tài khoản test Selenium `user@gmail.com/12345678` đã insert vào DB dev.
  - Probe đã biết, chấp nhận không sửa: `recommendations/cart-suggestions?productIds=abc` (chữ, không phải số) → 500 type-mismatch (hành vi mặc định toàn app với `@RequestParam` sai kiểu, FE không bao giờ gửi được); `products/similar/{id không tồn tại}` → trả popularity thay vì rỗng (fail-safe, trang PDP tự 404 trước đó rồi).
  - **Bug phát hiện sau khi dùng thật, đã sửa**: `SearchProductDTO` (DTO chung cho cả 3 nguồn gợi ý) thiếu field `quantity` → (1) nút "thêm nhanh vào giỏ" trên mọi rail gợi ý luôn báo sai "Sản phẩm đang tạm hết hàng" dù còn hàng, vì `ProductCard.jsx` check `productData?.quantity > 0` luôn `undefined > 0` = false; (2) sản phẩm hết hàng tạm thời (`active=true` nhưng `quantity=0`) vẫn bị gợi ý cho khách vì 3 query recommendation (`findSimilarByCategory`/`findActiveDtoByIdIn`/`findTopSellingActive`) chỉ lọc `active`, không lọc tồn kho. Đã sửa: thêm `quantity` vào `SearchProductDTO` + constructor 13-arg, thêm `p.quantity` vào SELECT và `AND p.quantity > 0` vào WHERE của cả 3 query Java; đồng thời lọc `AND quantity > 0` ngay từ nguồn candidate phía Python (`popularity.py`, `content_based.py`) để pool không lãng phí chỗ cho sản phẩm sẽ bị Java lọc bỏ. Verify qua Selenium: nút thêm nhanh giờ hiện đúng prompt "Vui lòng đăng nhập" (guest) thay vì báo hết hàng sai; sản phẩm quantity=0 xác nhận biến mất khỏi cả 3 endpoint gợi ý.
- [x] **Phase 2** — Collaborative filtering (ALS) thật + category-fatigue decay + time-decay preference vector. **Đã code xong + verify E2E (HTTP trực tiếp + Selenium trình duyệt thật + đủ 4 drill: guard/fatigue/CF-off/fallback).**
  - **Dữ liệu ngưỡng**: đạt bằng seed tạm (`../recommendation-service/scripts/seed_phase2_data.py` — 40 user + 104 đơn PAID + event tracking phân bố 4 tuần; xoá sau này bằng `cleanup_seed_data.py` + manifest JSON cùng thư mục). Sau seed: 284 đơn PAID, 56 user ≥2 đơn. Khi xoá seed CF có thể tụt dưới guard → tự tắt im lặng (đúng thiết kế).
  - **ALS** (`app/candidates/collaborative.py`): purchase (w=5, HL 30d, status 1/2) + cart-add (w=2, HL 14d) + view (w=1, HL 7d), cửa sổ 90d, chỉ user_id (guest không vào CF); guard im lặng ≥50 user đủ tương tác + ≥20 item. Thư viện `implicit` **không build được wheel trên Windows/py3.12/numpy2** (đã thử thật) → backend `auto` tự fallback solver ALS numpy tự viết (Hu-Koren-Volinsky, seed 42) — đây là đường chính thức, `implicit` chỉ là optional trong requirements (dòng comment). Nguồn thứ 4 `"CF"` blend vào cả 3 placement: user-CF cho home, item-item CF (cosine item factors, precompute top-50) cho similar/cart. Cadence hybrid theo quyết định user: volume < 50k interaction → train nightly cùng `train_all()`; vượt → carry-forward model cũ qua atomic swap, tối đa 7 ngày (`/internal/retrain` luôn force tươi).
  - **Fatigue** (`app/rerank/fatigue.py`): exposure user/session-category từ `recommendation_impressions` 14d (chỉ impression `clicked=0`, decay HL 7d), penalty `1/(1+0.15·exposure)` sau blend trước MMR, cả 3 placement. 2 query tách user/session (KHÔNG dùng OR — giết index). Mọi lỗi → bỏ penalty, không 500. Drill thật: 17 impression không-click 1 category → items category đó từ 8/8 còn 4/8; set clicked=1 → hồi 8/8.
  - **Profile đa tín hiệu** (`main._profile_scores` + `_fetch_interactions` UNION ALL): purchase (w=5, τ=720h) + cart-add (w=2, τ=336h) + view (w=1, τ=72h — giữ parity Phase 1); `seen`/exclude CHỈ từ view (grocery mua lặp phải gợi ý lại được). Sửa luôn bug timezone có sẵn `co_purchase.py` (`datetime.now()` local vs `order_time` UTC, lệch 7h).
  - **Java/FE**: mọi placement giờ gửi `session_id`+`user_id` (từ JWT) sang Python — `RecommendationService.appendIdentity()`, `ProductController` similar thêm `@RequestParam sessionId`, `apiGetSimilarProducts` gửi sessionId. Nhãn slate home/similar đổi từ hardcode sang `_majority_source` (ưu tiên CF>CO_PURCHASE>CONTENT>POPULARITY) → phân bố `algorithm_source` trong impressions dịch chuyển từ ngày deploy là expected. `"CF"` pass-through nguyên chuỗi tới impressions (đã verify trong DB: HOME_PERSONALIZED/PDP_SIMILAR + user_id đúng).
  - **Tài liệu**: đã bổ sung "PHẦN III — QUY TRÌNH XÂY DỰNG MÔ HÌNH (PHASE 2)" vào `AI_Recommendation_Roadmap.docx` (viết bằng script `recommendation-service/scripts/docx_assets/append_phase2.py`, tái dùng đúng style Phần II — heading/list/bảng code Consolas/ảnh sơ đồ matplotlib), kèm 2 sơ đồ mới (Sơ đồ 3: pipeline có thêm nguồn CF + bước chống nhàm chán theo lịch sử; Sơ đồ 4: cách ALS học vector từ hành vi).
  - **2 lỗi phát hiện sau khi dùng thật + đã sửa** (người dùng phát hiện qua quan sát thực tế UI và kiến thức mua sắm cá nhân, không phải qua test tự động):
    1. **Danh sách gợi ý ngắn hơn số lượng yêu cầu** (12→10, hoặc 6→ít hơn ở giỏ hàng): `collaborative.py` lấy `product_id` thẳng từ `order_detail`/`cart_events`/`product_views` mà **không lọc `active`/`quantity>0`** như `content_based.py`/`popularity.py` đã làm — nên sản phẩm hết hàng (xác nhận thật: id 21/25/47, 104 liên kết neighbor trỏ tới, VD sản phẩm 1↔47 sim=0.717) lọt vào "vũ trụ" CF, bị Java lọc mất ở bước hydrate cuối, không có gì bù chỗ trống. Đã sửa: JOIN `products` + `WHERE active=1 AND quantity>0` ở cả 3 nhánh UNION trong `INTERACTIONS_SQL`. Verify: quét 40 user/60 sản phẩm/30 giỏ hàng ngẫu nhiên → 0 trường hợp thiếu sau khi sửa (trước đó cf_items 228→225, đúng 3 sản phẩm bị loại).
    2. **Mua thật gần đây không nên là tín hiệu "muốn mua lại" mạnh nhất ngay lập tức** — khách vừa mua thường CHƯA cần mua lại ngay (hiệu ứng no/satiation, đã ghi sẵn trong roadmap Phần I mục C "chu kỳ mua lại" nhưng chưa từng code tới Phase 2). Trước khi sửa: cả `collaborative.py` (w=5, HL 30d) và `_profile_scores` (w=5, τ=720h) đều boost mạnh nhất ngay lúc vừa mua rồi mới giảm dần — ngược hoàn toàn với thực tế. Đã thêm module mới `app/candidates/repurchase.py`: `build_cycle_days()` suy ra chu kỳ mua lại ước tính mỗi sản phẩm (median khoảng cách giữa các lần mua lặp của cùng user, fallback cấp danh mục rồi hằng số mặc định 14 ngày — field mới `ModelArtifacts.repurchase_cycle_days`, tính 1 lần trong `trainer.py`, dùng chung bởi cả 2 nơi); `readiness(age_days, cycle_days)` = 0 ngay sau khi mua → tăng dần tới 1.0 khi gần/qua chu kỳ, nhân vào trọng số mua thật ở cả `collaborative.py` và `main._profile_scores`. Verify bằng số liệu thật: mua 1 giờ trước → giảm 100% trọng số (4.994→0.018); 7 ngày (nửa chu kỳ 14d) → giảm 50%; ≥14 ngày → về lại y hệt trước khi sửa (0% giảm).
  - Config mới đều override được qua `.env` service (nhóm `cf_*`, `fatigue_*`, `profile_*`, `w_*_collaborative`); `time_decay_tau_h` deprecated. `/health` thêm `cf_enabled/cf_users/cf_items/cf_backend`; `/metrics` thêm `fatigue_applied_serves`.
- [ ] **Phase 3** — Bandit explore-exploit (LinUCB/Thompson Sampling) + A/B testing + đo lường continual learning (CTR, diversity, coverage).

Ngưỡng dữ liệu cụ thể để chuyển giai đoạn (số đơn hàng/user/tuần tối thiểu) xem trong file Word ở mục "Roadmap theo mốc dữ liệu".

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
1. ~~`apiGetRecommendedProducts` gọi `axiosInstanceRecommended` không tồn tại — gợi ý sản phẩm gãy hoàn toàn.~~ **Đã nâng cấp thành hạng mục ưu tiên cao nhất** — xem mục "ƯU TIÊN CAO NHẤT" ở đầu file, không sửa lẻ tẻ nữa mà xây hẳn hệ thống gợi ý AI mới.
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
# còn thiếu: VITE_GOOGLE_CLIENT_ID (cần nếu bật lại Google login)
# VITE_RECOMMENDED_URL đã bỏ từ Phase 1 — client không gọi thẳng Python service,
# mọi gợi ý đi qua Java proxy (Java đọc RECOMMENDATION_SERVICE_URL phía server)
```

## Xem thêm

- [rules/tech-defaults.md](rules/tech-defaults.md) — quy ước code mặc định.
- [rules/workflow.md](rules/workflow.md) — cách chạy/build/test.
- [rules/design.md](rules/design.md) — quy ước thiết kế/giao diện.
- `../recommendation-service/AI_Recommendation_Roadmap.docx` — roadmap đầy đủ hệ thống gợi ý AI (ưu tiên cao nhất hiện tại, xem đầu file).
