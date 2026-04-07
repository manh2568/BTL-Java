package com.truyenhay.backend.repository;

import com.truyenhay.backend.entity.Chapter;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    // Đổi Integer → Long
    List<Chapter> findByStoryIdOrderByChapterIndexAsc(Long storyId);
    java.util.Optional<Chapter> findByStoryIdAndChapterIndex(Long storyId, Integer chapterIndex);
    int countByStoryId(Long storyId);

    @Query("SELECT c FROM Chapter c WHERE c.storyId = :storyId ORDER BY c.updatedAt DESC, c.id DESC")
    List<Chapter> findLatestChaptersForStory(@Param("storyId") Long storyId, Pageable pageable);

    List<Long> findIdsByStoryId(Long storyId);

    void deleteByStoryId(Long storyId);
}