package com.truyenhay.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class StoryListDto {
    private Long id;
    private Long userId;
    private String title;
    private String author;
    private String genre;
    private String description;
    private String coverUrl;
    private String status;
    private String badge;
    private Integer chapters;
    private List<LatestChapterDto> latestChapters;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer views;
    private Double rating;
}
