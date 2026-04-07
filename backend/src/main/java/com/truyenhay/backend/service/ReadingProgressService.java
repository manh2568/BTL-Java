package com.truyenhay.backend.service;

import com.truyenhay.backend.dto.ReadingProgressDto;
import com.truyenhay.backend.entity.Chapter;
import com.truyenhay.backend.entity.ReadingHistory;
import com.truyenhay.backend.repository.ChapterRepository;
import com.truyenhay.backend.repository.ReadingHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class ReadingProgressService {

    private final ReadingHistoryRepository readingHistoryRepository;
    private final ChapterRepository chapterRepository;

    public ReadingProgressService(
            ReadingHistoryRepository readingHistoryRepository,
            ChapterRepository chapterRepository
    ) {
        this.readingHistoryRepository = readingHistoryRepository;
        this.chapterRepository = chapterRepository;
    }

    @Transactional
    public void saveProgress(Long userId, Long novelId, Long chapterId, Integer chapterIndex) {
        if (userId == null || novelId == null) {
            throw new IllegalArgumentException("Thiếu userId hoặc novelId.");
        }

        Long chapterValue = resolveChapterId(novelId, chapterId, chapterIndex);
        if (chapterValue == null) {
            throw new IllegalArgumentException(
                    "Truyện chưa có chương trên hệ thống hoặc không map được chương — không lưu tiến độ.");
        }

        ReadingHistory history = readingHistoryRepository
                .findByUserIdAndNovelIdAndChapterId(userId, novelId, chapterValue)
                .orElseGet(() -> {
                    ReadingHistory item = new ReadingHistory();
                    item.setUserId(userId);
                    item.setNovelId(novelId);
                    item.setChapterId(chapterValue);
                    return item;
                });

        // Force dirty state to ensure Hibernate triggers UPDATE statement
        history.setUpdatedAt(java.time.LocalDateTime.now());
        readingHistoryRepository.save(history);
    }

    public List<ReadingProgressDto> getUserProgress(Long userId) {
        List<ReadingHistory> rows = readingHistoryRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        Map<Long, List<ReadingHistory>> byNovel = rows.stream()
                .collect(Collectors.groupingBy(
                        ReadingHistory::getNovelId,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        return byNovel.entrySet().stream().map(entry -> {
            Long novelId = entry.getKey();
            List<ReadingHistory> list = entry.getValue();
            Map<Long, Integer> chapterIdToIndex = buildChapterIdToIndexMap(novelId);

            ReadingProgressDto dto = new ReadingProgressDto();
            dto.setNovelId(novelId);
            dto.setRead(list.stream()
                    .map(item -> {
                        Long cId = item.getChapterId();
                        if (cId != null && cId < 0) return (int)(-cId - 1);
                        return chapterIdToIndex.get(cId);
                    })
                    .filter(Objects::nonNull)
                    .distinct()
                    .sorted()
                    .toList());

            int last = list.stream()
                    .max(Comparator.comparing(ReadingHistory::getUpdatedAt))
                    .map(item -> {
                        Long cId = item.getChapterId();
                        if (cId != null && cId < 0) return (int)(-cId - 1);
                        return chapterIdToIndex.get(cId);
                    })
                    .filter(Objects::nonNull)
                    .orElse(-1);
            dto.setLast(last);
            return dto;
        }).toList();
    }

    private Long resolveChapterId(Long novelId, Long chapterId, Integer chapterIndex) {
        List<Chapter> ordered = chapterRepository.findByStoryIdOrderByChapterIndexAsc(novelId);
        if (ordered.isEmpty()) {
            return null;
        }

        if (chapterId != null && chapterId > 0) {
            Optional<Long> byId = chapterRepository.findById(chapterId)
                    .filter(ch -> Objects.equals(ch.getStoryId(), novelId))
                    .map(Chapter::getId);
            if (byId.isPresent()) {
                return byId.get();
            }
        }

        if (chapterIndex == null || chapterIndex < 0) {
            return ordered.get(0).getId();
        }

        Optional<Chapter> exactMatch = chapterRepository.findByStoryIdAndChapterIndex(novelId, chapterIndex);
        if (exactMatch.isPresent()) {
            return exactMatch.get().getId();
        }

        // Frontend index thường 0-based; DB có thể dùng chapter_index bắt đầu từ 1
        Optional<Chapter> plusOneMatch = chapterRepository.findByStoryIdAndChapterIndex(novelId, chapterIndex + 1);
        if (plusOneMatch.isPresent()) {
            return plusOneMatch.get().getId();
        }

        // Coi idx là vị trí 0-based trong danh sách chương đã sắp xếp (giống thứ tự API trả về)
        int i = Math.min(chapterIndex, ordered.size() - 1);
        return ordered.get(Math.max(i, 0)).getId();
    }

    private Map<Long, Integer> buildChapterIdToIndexMap(Long novelId) {
        List<Chapter> chapters = chapterRepository.findByStoryIdOrderByChapterIndexAsc(novelId);
        return IntStream.range(0, chapters.size()).boxed()
                .collect(Collectors.toMap(i -> chapters.get(i).getId(), i -> i));
    }
}
