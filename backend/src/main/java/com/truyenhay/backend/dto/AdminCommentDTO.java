package com.truyenhay.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminCommentDTO {
    private Integer id;
    private Long chapterId;
    private Long userId;
    private String username;     // Load từ UserRepository
    private String content;
    private LocalDateTime createdAt;
    private Boolean isDeleted;
}
