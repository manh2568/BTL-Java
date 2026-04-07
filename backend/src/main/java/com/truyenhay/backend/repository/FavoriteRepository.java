package com.truyenhay.backend.repository;

import com.truyenhay.backend.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Favorite.FavoriteId> {

    List<Favorite> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Favorite> findByUserIdAndNovelId(Long userId, Long novelId);

    void deleteByUserIdAndNovelId(Long userId, Long novelId);

    boolean existsByUserIdAndNovelId(Long userId, Long novelId);

    void deleteByUserId(Long userId);

    void deleteByNovelId(Long novelId);
}
