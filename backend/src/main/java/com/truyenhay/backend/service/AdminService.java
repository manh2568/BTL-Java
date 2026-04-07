package com.truyenhay.backend.service;

import com.truyenhay.backend.dto.AdminCommentDTO;
import com.truyenhay.backend.dto.AdminStatsDTO;
import com.truyenhay.backend.entity.Comment;
import com.truyenhay.backend.entity.Role;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final StoryRepository storyRepository;
    private final ChapterRepository chapterRepository;
    private final CommentRepository commentRepository;
    private final FavoriteRepository favoriteRepository;
    private final ReadingHistoryRepository readingHistoryRepository;

    public AdminService(
            UserRepository userRepository,
            StoryRepository storyRepository,
            ChapterRepository chapterRepository,
            CommentRepository commentRepository,
            FavoriteRepository favoriteRepository,
            ReadingHistoryRepository readingHistoryRepository) {
        this.userRepository = userRepository;
        this.storyRepository = storyRepository;
        this.chapterRepository = chapterRepository;
        this.commentRepository = commentRepository;
        this.favoriteRepository = favoriteRepository;
        this.readingHistoryRepository = readingHistoryRepository;
    }

    /** Lấy danh sách tất cả user */
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /** Thống kê tổng quát cho Dashboard */
    public AdminStatsDTO getStats() {
        long totalUsers    = userRepository.count();
        long totalStories  = storyRepository.count();
        long totalChapters = chapterRepository.count();
        long totalComments = commentRepository.countByIsDeletedFalse();
        return new AdminStatsDTO(totalUsers, totalStories, totalChapters, totalComments);
    }

    /** 50 comment gần nhất (chưa xóa), kèm username */
    public List<AdminCommentDTO> getRecentComments() {
        List<Comment> comments = commentRepository.findTop50ByIsDeletedFalseOrderByCreatedAtDesc();

        // Load tất cả userId liên quan — batch 1 query
        List<Long> userIds = comments.stream()
                .map(Comment::getUserId)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, String> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));

        return comments.stream().map(c -> {
            AdminCommentDTO dto = new AdminCommentDTO();
            dto.setId(c.getId());
            dto.setChapterId(c.getChapterId());
            dto.setUserId(c.getUserId());
            dto.setUsername(userMap.getOrDefault(c.getUserId(), "?"));
            dto.setContent(c.getContent());
            dto.setCreatedAt(c.getCreatedAt());
            dto.setIsDeleted(c.getIsDeleted());
            return dto;
        }).collect(Collectors.toList());
    }

    /** Thay đổi role của user */
    public User changeUserRole(Long userId, Role newRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user ID=" + userId));
        user.setRole(newRole);
        return userRepository.save(user);
    }

    /**
     * Xóa truyện hoàn toàn (cascade thủ công để tránh lỗi FK):
     * reading_history → favorites → comments (của các chapter) → chapters → novel_stats (cascade JPA) → novel
     */
    @Transactional
    public void deleteStory(Long storyId) {
        if (!storyRepository.existsById(storyId)) {
            throw new IllegalArgumentException("Không tìm thấy truyện ID=" + storyId);
        }
        // 1. Xóa reading_history của truyện
        readingHistoryRepository.deleteByNovelId(storyId);
        // 2. Xóa favorites của truyện
        favoriteRepository.deleteByNovelId(storyId);
        // 3. Xóa tất cả chapter → JPA cascade sẽ xóa comments theo chapterId không có cascade nên xóa thủ công
        List<Long> chapterIds = chapterRepository.findIdsByStoryId(storyId);
        chapterIds.forEach(chId -> commentRepository.deleteByChapterId(chId));
        chapterRepository.deleteByStoryId(storyId);
        // 4. Xóa truyện (JPA cascade ALL sẽ tự xóa novel_stats)
        storyRepository.deleteById(storyId);
    }
}
