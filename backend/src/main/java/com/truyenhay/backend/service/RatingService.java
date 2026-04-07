package com.truyenhay.backend.service;

import com.truyenhay.backend.dto.RatingResponseDTO;
import com.truyenhay.backend.entity.NovelStat;
import com.truyenhay.backend.entity.Story;
import com.truyenhay.backend.entity.UserRating;
import com.truyenhay.backend.repository.StoryRepository;
import com.truyenhay.backend.repository.UserRatingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class RatingService {

    @Autowired
    private UserRatingRepository userRatingRepository;

    @Autowired
    private StoryRepository storyRepository;

    /**
     * Lấy thông tin rating của một truyện (bao gồm rating của user hiện tại nếu có)
     */
    public RatingResponseDTO getRating(Long novelId, Long userId) {
        Double avg = userRatingRepository.getAverageRatingByNovelId(novelId);
        Long count = userRatingRepository.countByNovelId(novelId);
        Integer userStars = null;

        if (userId != null) {
            Optional<UserRating> existing = userRatingRepository.findByUserIdAndNovelId(userId, novelId);
            if (existing.isPresent()) {
                userStars = existing.get().getStars();
            }
        }

        return new RatingResponseDTO(
            avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0,
            count != null ? count : 0L,
            userStars
        );
    }

    /**
     * User chấm sao cho truyện (1-5). Nếu đã chấm trước đó thì cập nhật.
     * Sau khi chấm, cập nhật lại trung bình vào bảng novel_stats.
     */
    @Transactional
    public RatingResponseDTO submitRating(Long userId, Long novelId, int stars) {
        if (stars < 1 || stars > 5) {
            throw new IllegalArgumentException("Chỉ được chấm từ 1 đến 5 sao.");
        }

        // Tìm hoặc tạo mới
        UserRating rating = userRatingRepository.findByUserIdAndNovelId(userId, novelId)
                .orElse(new UserRating());

        rating.setUserId(userId);
        rating.setNovelId(novelId);
        rating.setStars(stars);
        userRatingRepository.save(rating);

        // Cập nhật trung bình vào novel_stats
        Double newAvg = userRatingRepository.getAverageRatingByNovelId(novelId);
        Long newCount = userRatingRepository.countByNovelId(novelId);

        Story story = storyRepository.findById(novelId).orElse(null);
        if (story != null) {
            NovelStat stat = story.getStats();
            if (stat != null) {
                stat.setRating(newAvg != null ? Math.round(newAvg * 10.0) / 10.0 : 0.0);
                storyRepository.save(story);
            }
        }

        return new RatingResponseDTO(
            newAvg != null ? Math.round(newAvg * 10.0) / 10.0 : 0.0,
            newCount != null ? newCount : 0L,
            stars
        );
    }
}
