package com.truyenhay.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "chapters")
@Data
public class Chapter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "novel_id")
    private Long storyId;

    @Column(name = "chapter_index", nullable = false)
    private Integer chapterIndex;

    @Column(columnDefinition = "nvarchar(255)")
    private String title;

    // QUAN TRỌNG: Đổi TEXT thành nvarchar(max) để lưu tiếng Việt và nội dung dài
    @Column(columnDefinition = "nvarchar(max)")
    private String content;

    @Transient
    private int commentCount;

    @Column(name = "price", nullable = false)
    private Integer price = 0;

    @Transient
    private Boolean isLocked = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}