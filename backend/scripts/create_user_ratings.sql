-- Tạo bảng user_ratings để lưu đánh giá sao của từng user cho từng truyện
-- Hibernate sẽ tự tạo bảng nếu spring.jpa.hibernate.ddl-auto=update
-- Nếu không, chạy script này thủ công:

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_ratings' AND xtype='U')
CREATE TABLE user_ratings (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    novel_id    BIGINT NOT NULL,
    stars       INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    created_at  DATETIME2 DEFAULT GETDATE(),
    updated_at  DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_user_novel UNIQUE (user_id, novel_id),
    CONSTRAINT FK_rating_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT FK_rating_novel FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);
