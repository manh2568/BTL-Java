package com.truyenhay.backend.repository;

import com.truyenhay.backend.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Integer> {
    List<Comment> findByChapterIdOrderByCreatedAtDesc(Long chapterId);

    void deleteByUserId(Long userId);

    void deleteByChapterId(Long chapterId);

    // Admin: thống kê và quản lý comment
    long countByIsDeletedFalse();

    List<Comment> findTop50ByIsDeletedFalseOrderByCreatedAtDesc();

    @Query("SELECT c.chapterId, COUNT(c) FROM Comment c WHERE c.chapterId IN :chapterIds AND c.isDeleted = false GROUP BY c.chapterId")
    List<Object[]> countCommentsByChapterIds(@org.springframework.data.repository.query.Param("chapterIds") List<Long> chapterIds);
}
