package com.truyenhay.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "novels")
@Data
public class Story {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ✅ MỚI: Liên kết với người dùng (Người đăng truyện)
    @Column(name = "user_id")
    private Long userId;

    @Column(columnDefinition = "nvarchar(255)", nullable = false)
    private String title;

    @Column(columnDefinition = "nvarchar(100)")
    private String author;

    @Column(columnDefinition = "nvarchar(50)")
    private String genre;

    @Column(columnDefinition = "nvarchar(max)")
    private String description;

    @Column(name = "cover_url", columnDefinition = "nvarchar(500)")
    private String coverUrl;

//    private Integer views = 0;
//    private Double rating = 5.0;

    @Column(columnDefinition = "nvarchar(50)")
    private String status = "Đang Ra";

    private String badge;
    @Transient
    private Integer chapters = 0;

    // ✅ MỚI: Tự động lưu thời gian tạo truyện
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ✅ MỚI: Tự động lưu thời gian cập nhật lần cuối
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Các hàm tự động set thời gian trước khi lưu vào SQL Server
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    @OneToOne(mappedBy = "story", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private NovelStat stats;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
