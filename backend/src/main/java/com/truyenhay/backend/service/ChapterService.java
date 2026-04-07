package com.truyenhay.backend.service;

import com.truyenhay.backend.entity.Chapter;
import com.truyenhay.backend.repository.ChapterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ChapterService {

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private com.truyenhay.backend.repository.CommentRepository commentRepository;

    public List<Chapter> getChaptersByStory(Long storyId) {
        List<Chapter> chapters = chapterRepository.findByStoryIdOrderByChapterIndexAsc(storyId);
        if (chapters.isEmpty()) return chapters;

        // Lấy danh sách ID của các chương
        List<Long> chapterIds = chapters.stream().map(Chapter::getId).toList();

        // Đếm số comment gom nhóm bằng query cho hiệu suất tối đa (chống lỗi N+1 Query)
        List<Object[]> counts = commentRepository.countCommentsByChapterIds(chapterIds);
        Map<Long, Integer> countMap = new java.util.HashMap<>();
        for (Object[] row : counts) {
            Long cId = ((Number) row[0]).longValue();
            Integer cCount = ((Number) row[1]).intValue();
            countMap.put(cId, cCount);
        }

        // Gán vào DTO/Entity để đẩy về FrontEnd
        for (Chapter ch : chapters) {
            ch.setCommentCount(countMap.getOrDefault(ch.getId(), 0));
        }

        return chapters;
    }

    public Chapter addChapter(Chapter chapter) {
        return chapterRepository.save(chapter);
    }

    public Chapter getChapterById(Long id) {
        return chapterRepository.findById(id).orElse(null);
    }

    public Chapter saveChapter(Chapter chapter) {
        return chapterRepository.save(chapter);
    }
}