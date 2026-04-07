package com.truyenhay.backend.dto;

import lombok.Data;

@Data
public class SaveReadingProgressRequest {
    private Long novelId;
    private Long chapterId;
    private Integer chapterIndex;
}
