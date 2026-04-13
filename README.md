# TruyệnHay

TruyệnHay là một đồ án web đọc truyện online, tách riêng `frontend` và `backend`.

- Frontend: HTML, CSS, JavaScript thuần, hiển thị trang chủ, danh sách truyện, chi tiết truyện, trang đọc, hồ sơ cá nhân và trang quản trị.
- Backend: Spring Boot 3, REST API, JWT Authentication, SQL Server.
- Dự án hỗ trợ đăng ký bằng OTP email, đăng nhập, theo dõi truyện, bình luận, đánh giá, lưu tiến độ đọc, coin/VIP và quản trị nội dung.

## Tính năng chính

### Người dùng

- Đăng ký tài khoản qua OTP gửi email.
- Đăng nhập bằng `username/password`, nhận JWT token.
- Xem danh sách truyện, tìm kiếm, lọc theo thể loại, xem truyện hot và truyện mới cập nhật.
- Xem chi tiết truyện, đọc chương, lưu tiến độ đọc.
- Theo dõi truyện và xem lịch sử đọc.
- Đánh giá truyện theo số sao.
- Bình luận theo chương, có hỗ trợ SSE để cập nhật bình luận theo thời gian thực.
- Nạp coin, mua VIP 30 ngày, mở khóa chương trả phí.

### Tác giả / Quản trị viên

- Tạo truyện mới.
- Thêm và sửa chương.
- Sửa thông tin truyện.
- Upload ảnh bìa.
- Quản trị dashboard thống kê.
- Quản lý người dùng, đổi role, xóa truyện, xóa bình luận.

## Công nghệ sử dụng

### Backend

- Java 17
- Spring Boot 3.2.4
- Spring Web
- Spring Data JPA
- Spring Security
- JWT (`jjwt`)
- Spring Mail
- SQL Server
- Maven

### Frontend

- HTML5
- CSS3
- JavaScript thuần
- Google Fonts

## Cấu trúc thư mục

```text
BTL-Java/
|-- backend/
|   |-- pom.xml
|   |-- src/main/java/com/truyenhay/backend/
|   |   |-- config/
|   |   |-- controller/
|   |   |-- dto/
|   |   |-- entity/
|   |   |-- repository/
|   |   |-- security/
|   |   `-- service/
|   `-- src/main/resources/application.properties
|-- frontend/
|   |-- index.html
|   |-- css/
|   |-- js/
|   |-- partials/
|   `-- image/
|-- uploads/
`-- README.md
```

## Cấu hình backend

File cấu hình chính: `backend/src/main/resources/application.properties`

Backend đang đọc các biến môi trường sau:

```properties
DB_URL=jdbc:sqlserver://localhost:1433;databaseName=truyenhay_db;encrypt=true;trustServerCertificate=true;
DB_USERNAME=sa
DB_PASSWORD=123456
JWT_SECRET=your-secret-key
JWT_EXPIRE_MS=86400000
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
UPLOAD_DIR=uploads/covers
```

Giá trị mặc định trong code:

- Database: SQL Server local, database `truyenhay_db`
- Port backend: `8080`
- Thư mục upload ảnh bìa: `uploads/covers`
- Frontend gọi API trực tiếp tới `http://localhost:8080`

## Yêu cầu môi trường

- JDK 17
- Maven hoặc Maven Wrapper
- SQL Server đang chạy local
- Tài khoản Gmail + App Password nếu muốn dùng chức năng OTP email

## Cách chạy dự án

### 1. Chạy backend

Di chuyển vào thư mục `backend`:

```powershell
cd backend
```

Nếu dùng Maven Wrapper trên Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

Hoặc nếu đã cài Maven:

```powershell
mvn spring-boot:run
```

Backend sẽ chạy tại:

```text
http://localhost:8080
```

### 2. Chạy frontend

Frontend là static site, có thể mở bằng Live Server hoặc một HTTP server bất kỳ.

Cách đơn giản:

- Mở thư mục `frontend`
- Chạy bằng VS Code Live Server
- Hoặc phục vụ file tĩnh bằng một local server bất kỳ

Vì frontend dùng `fetch()` tới `http://localhost:8080`, nên nên mở frontend qua HTTP server thay vì mở trực tiếp bằng `file://`.

Ví dụ với Python:

```powershell
cd frontend
python -m http.server 5500
```

Sau đó truy cập:

```text
http://localhost:5500
```

## Phân quyền trong hệ thống

- `USER`: đọc truyện, theo dõi, bình luận, đánh giá, mua VIP, mở khóa chương.
- `AUTHOR`: có thêm quyền tạo và sửa truyện/chương của mình.
- `ADMIN`: quản trị toàn bộ hệ thống và các endpoint `/api/admin/**`.

## Một số API chính

### Xác thực

- `POST /api/auth/register/send-otp`
- `POST /api/auth/register/complete`
- `POST /api/auth/login`
- `PUT /api/auth/update`
- `PUT /api/auth/change-password`
- `DELETE /api/auth/account`

### Truyện và chương

- `GET /api/stories`
- `POST /api/stories`
- `PUT /api/stories/{id}`
- `POST /api/stories/{id}/view`
- `GET /api/chapters/{storyId}`
- `POST /api/chapters`
- `PUT /api/chapters/{chapterId}`

### Tương tác người dùng

- `GET /api/favorites/me`
- `POST /api/favorites/me`
- `DELETE /api/favorites/me/{novelId}`
- `GET /api/progress/me`
- `POST /api/progress/me`
- `GET /api/ratings/{novelId}`
- `POST /api/ratings/{novelId}`
- `GET /api/comments/chapter/{chapterId}`
- `POST /api/comments`
- `DELETE /api/comments/{id}`
- `GET /api/comments/stream/{chapterId}`

### Thanh toán / nội dung trả phí

- `POST /api/payment/topup`
- `POST /api/payment/buy-vip`
- `POST /api/payment/unlock-chapter/{chapterId}`

### Upload

- `POST /api/upload/cover`
- `GET /api/upload/covers/{fileName}`

### Admin

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PUT /api/admin/users/{id}/role`
- `DELETE /api/admin/users/{id}`
- `DELETE /api/admin/stories/{id}`
- `GET /api/admin/comments/recent`
- `DELETE /api/admin/comments/{id}`

## Ghi chú quan trọng

- CORS hiện đang mở rộng (`*`) để frontend gọi API dễ hơn trong môi trường phát triển.
- Hibernate đang để `spring.jpa.hibernate.ddl-auto=update`, phù hợp cho dev nhưng cần cân nhắc khi đưa lên production.
- JWT secret mặc định trong file cấu hình chỉ nên dùng để test, cần thay bằng giá trị an toàn hơn khi triển khai thật.
- Chức năng đăng ký OTP phụ thuộc vào cấu hình `MAIL_USERNAME` và `MAIL_PASSWORD`.
- Upload ảnh bìa sẽ lưu file thực tế trong thư mục `uploads/covers`.

## Kiểm thử

Backend hiện có file test khởi tạo:

```powershell
cd backend
.\mvnw.cmd test
```

## Hướng phát triển tiếp

- Bổ sung tài liệu riêng cho database schema và dữ liệu mẫu.
- Tách cấu hình frontend API base URL ra file config riêng.
- Thêm Docker Compose cho SQL Server + backend + frontend.
- Viết thêm test cho service và controller.

## Ghi nhận

README này được viết dựa trên cấu trúc thư mục và mã nguồn hiện có trong repository.
