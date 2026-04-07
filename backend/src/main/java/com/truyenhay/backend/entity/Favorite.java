package com.truyenhay.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "favorites")
@IdClass(Favorite.FavoriteId.class)
public class Favorite {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "novel_id")
    private Long novelId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Favorite(Long userId, Long novelId) {
        this.userId = userId;
        this.novelId = novelId;
    }

    @Data
    @NoArgsConstructor
    public static class FavoriteId implements Serializable {
        private Long userId;
        private Long novelId;

        public FavoriteId(Long userId, Long novelId) {
            this.userId = userId;
            this.novelId = novelId;
        }
    }
}
