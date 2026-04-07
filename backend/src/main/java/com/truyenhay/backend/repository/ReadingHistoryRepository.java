package com.truyenhay.backend.repository;

import com.truyenhay.backend.entity.ReadingHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReadingHistoryRepository extends JpaRepository<ReadingHistory, Long> {
    Optional<ReadingHistory> findByUserIdAndNovelIdAndChapterId(Long userId, Long novelId, Long chapterId);
    List<ReadingHistory> findByUserIdOrderByUpdatedAtDesc(Long userId);

    void deleteByUserId(Long userId);

    void deleteByNovelId(Long novelId);
}

