package com.truyenhay.backend.repository;

import com.truyenhay.backend.entity.Story;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StoryRepository extends JpaRepository<Story, Long> {

    @Modifying
    @Query("UPDATE Story s SET s.userId = NULL WHERE s.userId = :userId")
    void clearUploaderUserId(@Param("userId") Long userId);
}