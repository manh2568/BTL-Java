package com.truyenhay.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SseMessageDTO {
    private String type; // "COMMENT_NEW", "COMMENT_DEL"
    private Object data; // CommentDTO hoặc id của comment bị xoá
}
