package com.truyenhay.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminStatsDTO {
    private long totalUsers;
    private long totalStories;
    private long totalChapters;
    private long totalComments;
}
