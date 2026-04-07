package com.truyenhay.backend.dto;

import lombok.Data;

@Data
public class CommentRequest {
    private Long chapterId;
    private String text;
    private String parentId;
}
