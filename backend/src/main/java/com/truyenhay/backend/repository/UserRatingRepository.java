package com.truyenhay.backend.repository;

import com.truyenhay.backend.entity.UserRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRatingRepository extends JpaRepository<UserRating, Long> {

    Optional<UserRating> findByUserIdAndNovelId(Long userId, Long novelId);

    List<UserRating> findByNovelId(Long novelId);

    @Query("SELECT AVG(r.stars) FROM UserRating r WHERE r.novelId = :novelId")
    Double getAverageRatingByNovelId(Long novelId);

    @Query("SELECT COUNT(r) FROM UserRating r WHERE r.novelId = :novelId")
    Long countByNovelId(Long novelId);
}
