# ROX Lease - Real Estate & Space Management System

**ROX Lease** là một hệ thống quản lý cho thuê không gian và bất động sản toàn diện, được thiết kế theo kiến trúc Client-Server hiện đại. Dự án nổi bật với hệ thống phân quyền động **Dynamic RBAC (Role-Based Access Control)** chặt chẽ, cho phép quản trị viên cấu hình quyền truy cập (View/Edit) đến từng phân hệ và ứng dụng nhỏ nhất.

---

## Tính năng nổi bật

### Xác thực & Bảo mật (Authentication & Security)
* **Đăng nhập / Đăng xuất:** Sử dụng Token-based authentication (JWT/Opaque Token) với cơ chế lưu trữ phiên làm việc (Active Session).
* **Quên mật khẩu (Forgot Password):** Tích hợp gửi email chứa đường link xác thực bảo mật (chỉ sử dụng 1 lần, có thời hạn 15 phút).
* **Đổi mật khẩu:** Yêu cầu mật khẩu mạnh (chứa chữ hoa, chữ thường, số, ký tự đặc biệt).

### Phân quyền động (Dynamic RBAC)
* **Cấu trúc 3 lớp:** Module (Lớp 1) ➔ Application (Lớp 2) ➔ Action (VIEW / EDIT).
* **Giao diện tự động thích ứng:** * Thanh Navigation (Sidebar) tự động ẩn/hiện các chức năng dựa trên quyền của User.
    * Nếu User chỉ có quyền `VIEW`, toàn bộ form nhập liệu, nút thêm/sửa/xóa sẽ tự động bị khóa (Disabled / Read-only) hoặc ẩn đi.
* **Gán quyền thông minh (Assign Permission):** Giao diện 2 bảng (Assigned / Available). Tự động mapping (Tick `EDIT` tự động cấp `VIEW`, bỏ `VIEW` tự động thu hồi `EDIT`).

### Quản trị Hệ thống (System Management)
* **Quản lý User:** Thêm, sửa, khóa (Lock/Unlock) tài khoản nhân viên.
* **Import/Export Excel:** Xuất danh sách User ra file `.xlsx` và Import hàng loạt User mới từ Excel (tích hợp Apache POI).
* **Quản lý Role:** Tạo các vai trò (VD: System Admin, Space Manager) và gắn cờ System Role. Ngăn chặn xóa Role nếu đang có người dùng sử dụng.
* **Quản lý Permission:** Tạo các mã quyền tự động generate theo chuẩn (VD: `SYSTEM_USER_EDIT`).

---

## Công nghệ sử dụng (Tech Stack)

**Frontend:**
* [React.js](https://react.dev/) (Vite)
* [Tailwind CSS](https://tailwindcss.com/) (Thiết kế UI/UX hiện đại, Responsive)
* [React Router DOM](https://reactrouter.com/) (Nested Routing cho các Layout)
* [Axios](https://axios-http.com/) (Giao tiếp HTTP API)

**Backend:**
* [Java 17+](https://openjdk.org/)
* [Spring Boot 3](https://spring.io/projects/spring-boot)
* [Spring Security](https://spring.io/projects/spring-security) (Bảo mật luồng API)
* [Spring Data MongoDB](https://spring.io/projects/spring-data-mongodb) (Tương tác Database)
* **Apache POI** (Xử lý file Excel)
* **JavaMailSender** (Gửi Email SMTP)

**Database:**
* [MongoDB](https://www.mongodb.com/) (NoSQL)

---

## Hướng dẫn Cài đặt & Chạy dự án

### 1. Yêu cầu môi trường (Prerequisites)
* Đã cài đặt **Node.js** (v16 trở lên).
* Đã cài đặt **Java JDK 17** và **Maven**.
* Đã cài đặt và đang chạy **MongoDB** (Localhost port 27017 hoặc MongoDB Atlas).

### 2. Cài đặt Backend (Spring Boot)
1. Mở terminal, di chuyển vào thư mục gốc của Backend.
2. Mở file `src/main/resources/application.properties` và cấu hình các biến môi trường:
   ```properties
   # Kết nối Database
   spring.data.mongodb.uri=mongodb://localhost:27017/roxlease_db
   
   # Server Port
   server.port=8080

   # JWT Secret Key (Base64)
   jwt.secret=ChuoiBaoMatCuaBan...
   jwt.expiration=86400000

   # Cấu hình Email (Dùng App Password của Gmail)
   spring.mail.host=smtp.gmail.com
   spring.mail.port=587
   spring.mail.username=your-email@gmail.com
   spring.mail.password=your-app-password
   spring.mail.properties.mail.smtp.auth=true
   spring.mail.properties.mail.smtp.starttls.enable=true
* Chạy lệnh cài đặt thư viện và khởi động Server:

```
Bash
mvn clean install
mvn spring-boot:run
```
* Server Backend sẽ chạy tại: http://localhost:8080


3. Cài đặt Frontend (ReactJS)
* Mở một terminal mới, di chuyển vào thư mục frontend:
```
Bash
cd frontend
```
* Cài đặt các package phụ thuộc:
``
Bash
npm install
```
* Khởi động môi trường dev:
```
Bash
npm run dev
``
Giao diện Web sẽ chạy tại: http://localhost:5173

* Khởi tạo Dữ liệu (Seeding Data)
Để có thể trải nghiệm toàn bộ tính năng phân quyền, bạn cần thêm danh sách Permissions gốc vào MongoDB.

Mở MongoDB Compass.

Kết nối vào roxlease_db ➔ Chọn collection permissions.

Chọn chế độ Insert JSON và dán mảng dữ liệu sau:

```JSON
[
  { "_id": "SYSTEM_USER_VIEW", "code": "SYSTEM_USER_VIEW", "module": "SYSTEM", "application": "USER", "action": "VIEW", "description": "Chỉ xem danh sách người dùng" },
  { "_id": "SYSTEM_USER_EDIT", "code": "SYSTEM_USER_EDIT", "module": "SYSTEM", "application": "USER", "action": "EDIT", "description": "Thêm, sửa, khóa người dùng" },
  { "_id": "SYSTEM_ROLE_VIEW", "code": "SYSTEM_ROLE_VIEW", "module": "SYSTEM", "application": "ROLE", "action": "VIEW", "description": "Xem danh sách Role" },
  { "_id": "SYSTEM_ROLE_EDIT", "code": "SYSTEM_ROLE_EDIT", "module": "SYSTEM", "application": "ROLE", "action": "EDIT", "description": "Quản lý Role" },
  { "_id": "SYSTEM_PERMISSION_VIEW", "code": "SYSTEM_PERMISSION_VIEW", "module": "SYSTEM", "application": "PERMISSION", "action": "VIEW", "description": "Xem quyền" },
  { "_id": "SYSTEM_PERMISSION_EDIT", "code": "SYSTEM_PERMISSION_EDIT", "module": "SYSTEM", "application": "PERMISSION", "action": "EDIT", "description": "Quản lý quyền" },
  { "_id": "SYSTEM_ASSIGN_EDIT", "code": "SYSTEM_ASSIGN_EDIT", "module": "SYSTEM", "application": "ASSIGN", "action": "EDIT", "description": "Gán quyền cho Role" }
]
```
Sau đó, bạn chỉ cần tạo một User, gán cho họ một Role, và cấp các mã Quyền tương ứng để thấy sự thay đổi giao diện theo thời gian thực!

* Cấu trúc Thư mục chính
```
frontend/src/
├── api/
├── assets/
├── components/
│   └── system/
│       ├── UserModal.jsx
│       ├── RoleModal.jsx
│       └── PermissionModal.jsx
├── layouts/
│   ├── DashboardLayout.jsx
│   └── SystemLayout.jsx
├── pages/
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── ForgotPassword.jsx
│   │   └── ResetPassword.jsx
│   ├── system/
│   │   ├── UserManagement.jsx
│   │   ├── RoleManagement.jsx
│   │   └── ...
│   └── space/ (Để trống)
├── App.jsx
└── main.jsx
```
