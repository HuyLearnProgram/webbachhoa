# Website Thương Mại Điện Tử Bách Hóa (Grocery E-commerce)

Dự án xây dựng một hệ thống thương mại điện tử hoàn chỉnh, chuyên cung cấp các mặt hàng bách hóa. Hệ thống được phát triển dựa trên kiến trúc hướng dịch vụ (SOA), giao tiếp thông qua RESTful API, đảm bảo sự linh hoạt, khả năng mở rộng và bảo trì.

## Tổng Quan (Overview)

Đây là một ứng dụng web full-stack bao gồm trang web phía client (Frontend) cho người dùng tương tác và hệ thống phía máy chủ (Backend) để xử lý logic nghiệp vụ, quản lý dữ liệu và xác thực. Dự án được đóng gói bằng Docker để đơn giản hóa quá trình triển khai và đảm bảo tính nhất quán trên các môi trường khác nhau.

## Tính Năng Nổi Bật (Features)

### Chức năng cho người dùng (Client-Side):
-   **Đăng ký / Đăng nhập:** Xác thực người dùng bằng JWT.
-   **Tìm kiếm & lọc sản phẩm nâng cao:** Lọc theo danh mục, khoảng giá, đánh giá, khuyến mãi (chọn nhiều tiêu chí cùng lúc); tìm kiếm hiểu theo ngữ nghĩa/nhu cầu bằng AI, mặc định xếp theo độ liên quan cá nhân hoá (xem mục "Tìm kiếm thông minh").
-   **Xem chi tiết sản phẩm:** Kèm đánh giá/bình luận từ người mua khác.
-   **Khuyến mãi sản phẩm đa dạng:** Giảm giá trực tiếp, mua X tặng Y, mua theo combo giá ưu đãi — tự động áp dụng và tự hết hạn theo thời gian.
-   **Quản lý giỏ hàng:** Thêm, xóa, cập nhật số lượng, chọn sản phẩm muốn đặt hàng bằng checkbox.
-   **Đặt hàng và thanh toán:** Tích hợp VN PAY Sandbox, nhập/chọn mã giảm giá (voucher) có xem trước số tiền được giảm trước khi đặt, tự động gửi email xác nhận đơn hàng.
-   **Flash Sale trang chủ:** Sản phẩm đang giảm giá hiển thị theo 2 khung giờ cố định trong ngày kèm đếm ngược, có trang xem toàn bộ sản phẩm Flash Sale.
-   **Trang cá nhân:**
    +    **Quản lý thông tin cá nhân**.
    +    **Lịch sử mua hàng:** Hủy đơn hàng khi chưa giao; yêu cầu trả hàng/hoàn tiền trong vòng 15 ngày kể từ lúc nhận hàng.
    +    **Danh sách sản phẩm yêu thích**.
    +    **Ví voucher:** Xem voucher đã được tặng, lưu thêm voucher công khai đang chạy.
    +    **Giới thiệu bạn bè:** Mỗi người có 1 mã giới thiệu riêng; cả người giới thiệu lẫn người được giới thiệu đều nhận voucher khi đăng ký/mua hàng thành công.
-   **Ưu đãi tự động & rút thăm may mắn:** Voucher được tự động tặng vào ví theo hành vi mua sắm (chào mừng thành viên mới, đơn hàng đầu tiên, mốc số đơn, sinh nhật, lâu ngày không quay lại, giỏ hàng bị bỏ quên — giảm giá cá nhân có hạn trong ngày), kèm email thông báo; có lượt rút thăm trúng thưởng sau mỗi đơn hàng.
-   **Đánh giá sản phẩm:** Đánh giá theo sao kèm bình luận.
-   **Upload ảnh đại diện:** Qua Cloudinary; ảnh sản phẩm/danh mục phục vụ từ storage riêng của backend.

### Chức năng cho quản trị viên (Admin-Side):
-   **Dashboard tổng quan:** 7 thẻ thống kê + 7 biểu đồ (doanh thu theo chu kỳ tuần, trạng thái đơn/thanh toán, phản hồi, sản phẩm bán chạy...).
-   **Quản lý danh mục sản phẩm:** CRUD, tìm kiếm đồng bộ theo URL.
-   **Quản lý sản phẩm:** CRUD đầy đủ, ẩn/hiện thay vì xoá cứng, nhiều ảnh, quản lý SKU, import/export Excel, trang xem chi tiết (số liệu bán/đánh giá/tỉ lệ hoàn trả), cấu hình khuyến mãi đa loại.
-   **Quản lý đơn hàng:** Cập nhật trạng thái đơn hàng, chỉnh sửa thông tin giao hàng, xuất hóa đơn PDF.
-   **Quản lý người dùng:** CRUD, khoá/mở khoá tài khoản (bắt buộc chọn lý do, không xoá cứng), trang xem chi tiết người dùng, tự động gửi email khi admin chỉnh sửa hộ.
-   **Quản lý mã giảm giá (Voucher):** CRUD, áp dụng toàn đơn hoặc riêng theo danh mục sản phẩm, đánh dấu hiển thị Flash Sale.
-   **Quy tắc trao voucher tự động:** Cấu hình điều kiện/giá trị giảm cho từng loại (chào mừng, đơn hàng đầu tiên, mốc số đơn, sinh nhật, khách lâu không quay lại, giỏ hàng bị bỏ quên, giới thiệu bạn bè...), tìm kiếm/lọc theo loại và danh mục áp dụng.
-   **Rút thăm may mắn:** Quản lý chiến dịch và danh sách giải thưởng.
-   **Quản lý phản hồi:** Ẩn phản hồi sản phẩm.

### Gợi ý sản phẩm bằng AI (tự học liên tục):
-   **Gợi ý cá nhân hoá** ở trang chủ, trang chi tiết sản phẩm ("sản phẩm tương tự") và giỏ hàng ("có thể bạn cũng thích") — dựa trên lịch sử xem/mua/tìm kiếm, sản phẩm hay được mua cùng nhau, xu hướng bán chạy và hành vi của những người dùng có sở thích tương tự.
-   **Chống nhàm chán:** tự động đa dạng hoá danh mục trong mỗi lần gợi ý, tránh lặp lại mãi vài loại sản phẩm quen thuộc; đồng thời thỉnh thoảng thử gợi ý một danh mục mới để phát hiện sở thích chưa biết của khách.
-   **Tự học liên tục:** mô hình học lại định kỳ từ dữ liệu tương tác thật, cải thiện dần theo thời gian sử dụng — không cần huấn luyện thủ công.
-   **Luôn sẵn sàng:** nếu dịch vụ gợi ý AI gặp sự cố, hệ thống tự chuyển sang gợi ý dự phòng (sản phẩm cùng danh mục/bán chạy) — trải nghiệm người dùng không bao giờ bị gián đoạn.
-   **Dashboard đo lường & điều khiển (Admin):** theo dõi tỉ lệ bấm/chuyển đổi theo từng nguồn gợi ý, độ đa dạng, độ phủ sản phẩm được gợi ý, so sánh hiệu quả qua thử nghiệm A/B — và điều chỉnh trực tiếp tỉ lệ thử nghiệm ngay trên dashboard.

### Tìm kiếm thông minh (Smart Search):
-   **Hiểu theo nhu cầu, không chỉ đúng tên:** tìm "đồ ăn vặt", "thực phẩm sạch", "đồ sấy"... vẫn ra kết quả phù hợp dù không khớp tên sản phẩm, nhờ AI hiểu ý nghĩa câu tìm kiếm thay vì chỉ so khớp chữ.
-   **Sắp xếp theo mức độ liên quan (mặc định, kiểu Shopee/Tiki):** kết hợp độ khớp từ khoá, ý nghĩa câu tìm, sở thích cá nhân của khách và độ phổ biến sản phẩm để ưu tiên kết quả khách có khả năng thích nhất lên đầu.
-   **Gợi ý từ khoá "Mọi người cũng tìm":** đề xuất từ khoá phổ biến ngay khi khách đang gõ, dựa trên lịch sử tìm kiếm thật của cộng đồng người dùng.
-   **Luôn có kết quả, không bao giờ vỡ trang:** nếu dịch vụ AI gặp sự cố hoặc câu tìm kiếm không rõ nghĩa, hệ thống tự động chuyển về tìm theo tên như trước — trải nghiệm người dùng không bị gián đoạn.
-   **Dashboard đo lường tìm kiếm (Admin):** theo dõi tỉ lệ bấm theo từng kiểu tìm kiếm, tỉ lệ tìm không ra kết quả, và danh sách từ khoá khách hay tìm nhưng chưa có hàng — gợi ý hướng nhập hàng mới.

### Kiểm thử (Testing):
-   **White Box Testing:** Sử dụng **JUnit** trong Spring Boot để kiểm thử đơn vị (Unit Test), đảm bảo tính đúng đắn của các logic nghiệp vụ ở tầng Backend.
-   **Black Box Testing:** Sử dụng **Selenium** để thực hiện kiểm thử tự động hóa giao diện người dùng (E2E Testing), giả lập các hành vi của người dùng trên trình duyệt.

## Công Nghệ Sử Dụng (Technologies Used)

-   **Backend:**
    -   **Framework:** Spring Boot 3, Spring Web (RESTful API)
    -   **Data Access:** Spring Data JPA, Hibernate
    -   **Security:** Spring Security, JWT
    -   **Build Tool:** Maven
    -   **Language:** Java 21
-   **Frontend:**
    -   **Library:** ReactJS 18
    -   **State Management:** Redux Toolkit
    -   **HTTP Client:** Axios
    -   **Styling:** Tailwind CSS / Material-UI
    -   **Build Tool:** Vite / Create React App
-   **AI Recommendation & Smart Search Service:**
    -   **Framework:** Python 3.12, FastAPI, Uvicorn
    -   **Thuật toán gợi ý:** TF-IDF + Cosine Similarity (content-based), FP-Growth (association rules mua kèm), Collaborative Filtering (ALS), MMR re-ranking (đa dạng hoá), LinUCB Multi-Armed Bandit (explore-exploit)
    -   **Tìm kiếm ngữ nghĩa:** multilingual-e5-small embedding (ONNX Runtime), kết hợp tìm theo từ khoá + ngữ nghĩa + cá nhân hoá
    -   **Scheduling:** APScheduler (huấn luyện lại định kỳ)
-   **Cơ sở dữ liệu (Database):**
    -   MySQL 8
-   **Containerization & Deployment:**
    -   Docker, Docker Compose
-   **Testing:**
    -   JUnit 5, Mockito (Backend)
    -   Selenium WebDriver (E2E)
-   **DevOps Tools:** Docker Hub.

## Hướng Dẫn Cài Đặt và Chạy Ứng Dụng (Local)

### Yêu cầu tiên quyết
-   Git
-   JDK 21 (hoặc phiên bản tương thích)
-   Maven 3.9+
-   Node.js 20+ và npm
-   Docker và Docker Compose

### 1. Clone repository

```bash
# Clone repository về máy
git clone https://github.com/HuyLearnProgram/webbachhoa.git
cd webbachhoa
```

### 2.Database Setup:
```bash
# Tạo database MySQL
mysql -u root -p
CREATE DATABASE webnongsan;
```
Chạy file .sql trong thư mục SQL

### 3.Configuration Backend:
```bash
# Cập nhật application.properties
spring.datasource.url=${DBMS_CONNECTION:jdbc:mysql://localhost:3306/webnongsan}
spring.datasource.username=root
spring.datasource.password=<your_password>
```

### 4.Run Backend:
Chạy trực tiếp trên IntelliJ hoặc dùng lệnh
```bash
# Build và chạy ứng dụng
mvn clean install
mvn spring-boot:run
```
Backend sẽ chạy tại: http://localhost:8080

### 5.Cài đặt Frontend (React JS)
```bash
cd client
npm install
```
### Cấu hình lại file .env:
```bash
VITE_BACKEND_URL = "http://localhost:8080/api/v2"
VITE_BACKEND_TARGET = http://localhost:8080
```
### Run front end:
```bash
npm run dev
```
Frontend sẽ chạy tại: http://localhost:5173

### 6. Cài đặt & chạy AI Recommendation Service (tuỳ chọn)
Không bắt buộc để chạy được website — nếu bỏ qua bước này, backend tự chuyển sang gợi ý dự phòng
(rule-based) mà không lỗi. Chạy bước này nếu muốn trải nghiệm gợi ý AI thật (cá nhân hoá, tự học).
```bash
cd recommendation-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env        # điền mật khẩu MySQL thật vào DB_URL
venv\Scripts\python -m uvicorn app.main:app --port 8000
```
MySQL (`webnongsan`) phải chạy trước. Recommendation service sẽ chạy tại: http://localhost:8000
(backend Java đọc địa chỉ này qua `RECOMMENDATION_SERVICE_URL`, mặc định đúng `http://localhost:8000`).

## Docker Setup
### 1.Create Docker Network:
```bash
docker network create webnongsan-network
```
### 2.Run MySQL Container:
```bash
docker run --network webnongsan-network --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 -e MYSQL_DATABASE=webnongsan -d mysql:8.0.36-debian
```
### 3.Build và Run Backend Container:
```bash
# Build backend image
cd backend
docker build -t webnongsan-backend:0.0.1 .

# Run backend container
docker run --name webnongsan-backend --network webnongsan-network -p 8080:8080 -e DBMS_CONNECTION=jdbc:mysql://mysql:3306/webnongsan webnongsan-backend:0.0.1
```
### 4.Build và Run Frontend Container:
```bash
# Build frontend image
cd frontend
docker build -t webnongsan-frontend:0.0.1 .

# Run frontend container
docker run --name webnongsan-frontend --network webnongsan-network -p 3000:3000 webnongsan-frontend:0.0.1
```
Frontend sẽ chạy tại: http://localhost:3000
### Docker Hub Images
### Pull từ Docker Hub:
```bash
# Pull backend image
docker pull huyprogram/webnongsan-backend:0.0.1

# Run từ Docker Hub image
docker run --name webnongsan-backend --network webnongsan-network -p 8080:8080 -e DBMS_CONNECTION=jdbc:mysql://mysql:3306/webnongsan huyprogram/webnongsan-backend:0.0.1

# Pull frontend image
docker pull huyprogram/webnongsan-frontend:0.0.1
# Run từ Docker Hub image
 docker run -d -p 3000:80 --name webnongsan-frontend huyprogram/webnongsan-frontend:0.0.1
```

## Site Images
### Login, Sign Up & Forget Password
![Login](./screenshots/login.png)
![Signup](./screenshots/signup.png)
![Forgot Password](./screenshots/forgotPass.png)

### Trang chủ
![Trang chủ - Flash Sale](./screenshots/home1.png)
![Trang chủ - Gợi ý dành cho bạn](./screenshots/home2.png)
![Trang chủ - Khuyến mãi & bán chạy](./screenshots/home3.png)
![Quick View Product](./screenshots/quick_product.png)

### Trang tìm kiếm và lọc sản phẩm
![Search](./screenshots/search.png)

### Trang chi tiết sản phẩm
![Product Detail1](./screenshots/product_detail1.png)
![Product Detail2](./screenshots/product_detail2.png.png)

### Trang giỏ hàng
![Cart](./screenshots/cart.png)
![Cart Gift](./screenshots/cart_gift.png)

### Trang thanh toán
![Checkout](./screenshots/checkout.png)
![Chọn mã giảm giá](./screenshots/voucher1.png)
![Đơn hàng đã áp voucher](./screenshots/voucher2.png)

### Trang quản lý thông tin cá nhân
![profile](./screenshots/profile.png)
![buy_history](./screenshots/buy_history.png)
![buy_history_detail1](./screenshots/buy_history_detail1.png)
![buy_history_detail2](./screenshots/buy_history_detail2.png)
![wishlist](./screenshots/wishlist.png)
![Sản phẩm đã xem](./screenshots/product_viewed.png)
![Ví voucher](./screenshots/voucher_wallet.png)
![Giới thiệu bạn bè](./screenshots/friend_introduce.png)

### Trang tổng quan báo cáo doanh thu (Admin):
![admin_dashboard1](./screenshots/admin_dashboard1.png)
![admin_dashboard2](./screenshots/admin_dashboard2.png)

### Trang quản lý danh mục sản phẩm (Admin):
![ma_cate](./screenshots/ma_cate.png)

### Trang quản lý sản phẩm (Admin):
![ma_pro](./screenshots/ma_pro.png)
![ma_pro_add](./screenshots/ma_pro_add.png)
![ma_pro_detail](./screenshots/ma_pro_detail.png)
![ma_pro_edit](./screenshots/ma_pro_edit.png)

### Trang quản lý người dùng (Admin):
![ma_user](./screenshots/ma_user.png)
![ma_user_detail](./screenshots/ma_user_detail1.png)
![ma_user_detail - Chi tiết chi tiêu](./screenshots/ma_user_detail2.png)
![ma_user_edit](./screenshots/ma_user_edit.png)

### Trang quản lý đơn hàng (Admin):
![ma_order](./screenshots/ma_order.png)
![ma_order_detail1](./screenshots/ma_order_detail1.png)
![ma_order_detail2](./screenshots/ma_order_detail2.png)
![ma_order_detail_invoice](./screenshots/ma_order_detail_invoice.png)

### Trang quản lý mã giảm giá - Voucher (Admin):
![ma_voucher](./screenshots/ma_voucher.png)
![ma_voucher_add](./screenshots/ma_voucher_add.png)
![ma_voucher_edit](./screenshots/ma_voucher_edit.png)

### Trang quản lý quy tắc trao voucher tự động (Admin):
![ma_voucher_rule](./screenshots/ma_voucher_rule.png)
![ma_voucher_rule_add](./screenshots/ma_voucher_rule_add.png)
![ma_voucher_rule_edit](./screenshots/ma_voucher_rule_edit.png)

### Trang quản lý rút thăm may mắn (Admin):
![ma_lucky_draw](./screenshots/ma_lucky_draw.png)
![ma_lucky_draw_add](./screenshots/ma_lucky_draw_add.png)
![ma_lucky_draw_edit](./screenshots/ma_lucky_draw_edit.png)

### Trang quản lý feedback (Admin):
![ma_feedback](./screenshots/ma_feedback.png)
![ma_feedback_detail](./screenshots/ma_feedback_detail.png)

### Trang quản lý Gợi ý AI & Tìm kiếm thông minh (Admin):
![ma_ai_recom1](./screenshots/ma_ai_recom1.png)
![ma_ai_recom2](./screenshots/ma_ai_recom2.png)
![ma_ai_recom3 - Chất lượng tìm kiếm](./screenshots/ma_ai_recom3.png)
![ma_ai_recom_detail](./screenshots/ma_ai_recom_detail.png)

