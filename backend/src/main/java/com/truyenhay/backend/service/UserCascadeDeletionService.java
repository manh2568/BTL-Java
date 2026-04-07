package com.truyenhay.backend.service;

import com.truyenhay.backend.repository.CommentRepository;
import com.truyenhay.backend.repository.FavoriteRepository;
import com.truyenhay.backend.repository.ReadingHistoryRepository;
import com.truyenhay.backend.repository.StoryRepository;
import com.truyenhay.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Xóa user và dữ liệu tham chiếu, tránh khóa ngoại khiến DELETE users thất bại
 * (trường hợp xóa tay trong SSMS hay đăng ký lại vẫn báo email đã tồn tại).
 */
@Service
public class UserCascadeDeletionService {

    private final FavoriteRepository favoriteRepository;
    private final ReadingHistoryRepository readingHistoryRepository;
    private final CommentRepository commentRepository;
    private final StoryRepository storyRepository;
    private final UserRepository userRepository;

    public UserCascadeDeletionService(
            FavoriteRepository favoriteRepository,
            ReadingHistoryRepository readingHistoryRepository,
            CommentRepository commentRepository,
            StoryRepository storyRepository,
            UserRepository userRepository) {
        this.favoriteRepository = favoriteRepository;
        this.readingHistoryRepository = readingHistoryRepository;
        this.commentRepository = commentRepository;
        this.storyRepository = storyRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void deleteUserById(Long userId) {
        if (userId == null) return;
        favoriteRepository.deleteByUserId(userId);
        readingHistoryRepository.deleteByUserId(userId);
        commentRepository.deleteByUserId(userId);
        storyRepository.clearUploaderUserId(userId);
        userRepository.deleteById(userId);
    }
}
