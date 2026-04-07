-- ============================================================
-- PATCH: Thêm cột role vào bảng users (chạy 1 lần)
-- Hibernate ddl-auto=update sẽ tự thêm cột, nhưng DEFAULT NULL
-- Script này đảm bảo mọi user cũ có role hợp lệ.
-- ============================================================

-- Bước 1: Đảm bảo cột tồn tại (nếu Hibernate chưa chạy)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
)
BEGIN
    ALTER TABLE users ADD role NVARCHAR(20) NOT NULL DEFAULT 'USER';
END
GO

-- Bước 2: Patch tất cả user cũ (NULL hoặc chuỗi rỗng) thành USER
UPDATE users
SET role = 'USER'
WHERE role IS NULL OR role = '';
GO

-- Bước 3: Đặt tài khoản admin1 và admin2 thành ADMIN
UPDATE users
SET role = 'ADMIN'
WHERE username IN ('admin1', 'admin2');
GO

-- Kiểm tra kết quả
SELECT id, username, email, role FROM users ORDER BY role, username;
GO
