package com.truyenhay.backend.service;

import com.truyenhay.backend.dto.LatestChapterDto;
import com.truyenhay.backend.dto.StoryListDto;
import com.truyenhay.backend.entity.Chapter;
import com.truyenhay.backend.entity.NovelStat;
import com.truyenhay.backend.entity.Story;
import com.truyenhay.backend.repository.ChapterRepository;
import com.truyenhay.backend.repository.StoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
@Service
public class StoryService {

    @Autowired
    private StoryRepository storyRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    public List<StoryListDto> getAllStories() {
        List<Story> stories = storyRepository.findAll();
        return stories.stream().map(this::toStoryListDto).collect(Collectors.toList());
    }

    private StoryListDto toStoryListDto(Story s) {
        StoryListDto dto = new StoryListDto();
        dto.setId(s.getId());
        dto.setUserId(s.getUserId());
        dto.setTitle(s.getTitle());
        dto.setAuthor(s.getAuthor());
        dto.setGenre(s.getGenre());
        dto.setDescription(s.getDescription());
        dto.setCoverUrl(s.getCoverUrl());
        dto.setStatus(s.getStatus());
        dto.setBadge(s.getBadge());
        dto.setCreatedAt(s.getCreatedAt());
        dto.setUpdatedAt(s.getUpdatedAt());

        int count = chapterRepository.countByStoryId(s.getId());
        dto.setChapters(count);

        List<Chapter> latest = chapterRepository.findLatestChaptersForStory(
                s.getId(), PageRequest.of(0, 2));
        dto.setLatestChapters(latest.stream().map(ch -> {
            LatestChapterDto d = new LatestChapterDto();
            d.setChapterIndex(ch.getChapterIndex());
            d.setTitle(ch.getTitle());
            return d;
        }).collect(Collectors.toList()));

        NovelStat stats = s.getStats();
        if (stats != null) {
            dto.setViews(stats.getViews());
            dto.setRating(stats.getRating());
        } else {
            dto.setViews(0);
            dto.setRating(0.0);
        }
        return dto;
    }
    public Story addStory(Story story) {
        // 1. Khởi tạo một bảng thống kê trống (0 view, 0 like, 0 rating)
        NovelStat stats = new NovelStat();

        // 2. Móc nối 2 chiều (Cực kỳ quan trọng để Hibernate hiểu khóa ngoại)
        stats.setStory(story); // Báo cho Stats biết nó thuộc về Truyện nào
        story.setStats(stats); // Báo cho Truyện biết Stats của nó là ai

        // 3. Lưu Truyện xuống Database
        // Nhờ có CascadeType.ALL trong entity, nó sẽ tự động chạy 2 lệnh INSERT:
        // Lệnh 1: Lưu bảng novels
        // Lệnh 2: Lưu bảng novel_stats với khóa ngoại tương ứng
        return storyRepository.save(story);
    }

    public void incrementView(Long storyId) {
        Story s = storyRepository.findById(storyId).orElse(null);
        if (s != null) {
            NovelStat stats = s.getStats();
            if (stats == null) {
                stats = new NovelStat();
                stats.setStory(s);
                s.setStats(stats);
            }
            stats.setViews((stats.getViews() == null ? 0 : stats.getViews()) + 1);
            storyRepository.save(s);
        }
    }

    public Story getStoryById(Long id) {
        return storyRepository.findById(id).orElse(null);
    }

    public Story saveStory(Story story) {
        return storyRepository.save(story);
    }
}