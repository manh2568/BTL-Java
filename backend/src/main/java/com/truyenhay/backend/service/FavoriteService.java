package com.truyenhay.backend.service;

import com.truyenhay.backend.entity.Favorite;
import com.truyenhay.backend.repository.FavoriteRepository;
import com.truyenhay.backend.repository.StoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final StoryRepository storyRepository;

    public FavoriteService(FavoriteRepository favoriteRepository, StoryRepository storyRepository) {
        this.favoriteRepository = favoriteRepository;
        this.storyRepository = storyRepository;
    }

    /**
     * Lấy danh sách novelId mà user đã theo dõi
     */
    public List<Long> getFollowedNovelIds(Long userId) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(Favorite::getNovelId)
                .collect(Collectors.toList());
    }

    /**
     * Theo dõi truyện
     */
    public void follow(Long userId, Long novelId) {
        if (!storyRepository.existsById(novelId)) {
            throw new IllegalArgumentException("Truyện không tồn tại.");
        }
        if (favoriteRepository.existsByUserIdAndNovelId(userId, novelId)) {
            return; // Đã theo dõi rồi
        }
        favoriteRepository.save(new Favorite(userId, novelId));
    }

    /**
     * Bỏ theo dõi truyện
     */
    @Transactional
    public void unfollow(Long userId, Long novelId) {
        favoriteRepository.deleteByUserIdAndNovelId(userId, novelId);
    }

    /**
     * Kiểm tra user đã theo dõi truyện này chưa
     */
    public boolean isFollowing(Long userId, Long novelId) {
        return favoriteRepository.existsByUserIdAndNovelId(userId, novelId);
    }
}
