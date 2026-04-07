package com.truyenhay.backend.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "novel_stats")
@Data
public class NovelStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne
    @JoinColumn(name = "novel_id", referencedColumnName = "id", nullable = false)
    @JsonIgnore
    private Story story;

    @Column(columnDefinition = "int default 0")
    private Integer likes = 0;

    @Column(columnDefinition = "int default 0")
    private Integer views = 0;

    @Column(columnDefinition = "decimal(3,2) default 0.0")
    private Double rating = 0.0;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
