package com.truyenhay.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentDTO {
    private String id;
    private String username;
    private String avatarEmoji;
    private String avatarPhoto;
    private String text;
    private Long time;
    private int likes;
    private String parentId;
    private boolean isDeleted;
    // We omit likedBy array for now since no likes supported in DB
}
