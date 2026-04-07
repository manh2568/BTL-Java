package com.truyenhay.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingResponseDTO {
    private Double averageRating;  // Trung bình sao (1.0 - 5.0)
    private Long totalRatings;     // Tổng số lượt đánh giá
    private Integer userRating;    // Sao mà user hiện tại đã chấm (null nếu chưa)
}
