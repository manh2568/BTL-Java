package com.truyenhay.backend.controller;

import com.truyenhay.backend.entity.Chapter;
import com.truyenhay.backend.entity.Story;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.StoryRepository;
import com.truyenhay.backend.repository.UserRepository;
import com.truyenhay.backend.service.ChapterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chapters")
@CrossOrigin(origins = "*")
public class ChapterController {

    @Autowired
    private ChapterService chapterService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StoryRepository storyRepository;

    @Autowired
    private com.truyenhay.backend.repository.TransactionRepository transactionRepository;

    @GetMapping("/{storyId}")
    public ResponseEntity<List<Chapter>> getChaptersByStory(
            @PathVariable Long storyId, Authentication authentication) {
        
        List<Chapter> chapters = chapterService.getChaptersByStory(storyId);
        
        User user = null;
        if (authentication != null && authentication.getName() != null) {
            user = userRepository.findByUsername(authentication.getName()).orElse(null);
        }
        
        boolean isVip = false;
        if (user != null && user.getVipExpiresAt() != null && user.getVipExpiresAt().isAfter(java.time.LocalDateTime.now())) {
            isVip = true;
        }

        java.util.Set<Long> boughtIds = new java.util.HashSet<>();
        if (user != null && !isVip) {
            List<com.truyenhay.backend.entity.Transaction> txs = transactionRepository.findByUserIdAndType(user.getId(), "UNLOCK_CHAPTER");
            for (com.truyenhay.backend.entity.Transaction tx : txs) {
                if (tx.getChapterId() != null) {
                    boughtIds.add(tx.getChapterId());
                }
            }
        }

        for (Chapter ch : chapters) {
            if (ch.getPrice() != null && ch.getPrice() > 0) {
                // Tác giả/Admin được xem hết
                boolean autoAccess = false;
                if (user != null && (user.getRole().name().equals("ADMIN") || (user.getId().equals(storyRepository.findById(storyId).get().getUserId())))) {
                    autoAccess = true;
                }

                if (!isVip && !autoAccess && !boughtIds.contains(ch.getId())) {
                    ch.setContent("Nội dung chương thu phí..."); // Hoặc làm trống
                    ch.setIsLocked(true);
                }
            }
        }

        return ResponseEntity.ok(chapters);
    }
    // Thêm chương mới — chỉ chủ truyện (AUTHOR) hoặc ADMIN mới được
    @PreAuthorize("hasAnyRole('AUTHOR','ADMIN')")
    @PostMapping
    public ResponseEntity<?> addChapter(@RequestBody Chapter chapter, Authentication authentication) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
            }
            User user = userRepository.findByUsername(authentication.getName()).orElse(null);
            if (user == null) {
                return ResponseEntity.status(401).body("Không tìm thấy tài khoản.");
            }
            
            if (chapter.getStoryId() == null) {
                return ResponseEntity.badRequest().body("storyId bị trống.");
            }
            
            // Kiểm tra story có tồn tại và thuộc về user đang đăng nhập
            Story story = storyRepository.findById(chapter.getStoryId()).orElse(null);
            if (story == null) {
                return ResponseEntity.badRequest().body("Truyện không tồn tại.");
            }
            
            // ADMIN được quyền thêm, hoặc tác giả
            if (!user.getId().equals(story.getUserId()) && !user.getRole().name().equals("ADMIN")) {
                return ResponseEntity.status(403).body("Bạn không có quyền thêm chương cho truyện này.");
            }
            
            Chapter saved = chapterService.addChapter(chapter);
            
            // Cập nhật ngày thay đổi của Truyện để nó lên Top Mới Cập Nhật
            story.setUpdatedAt(java.time.LocalDateTime.now());
            storyRepository.save(story);
            
            return ResponseEntity.ok(saved);
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi Server: " + ex.getMessage());
        }
    }

    // ✅ Sửa chương — chỉ chủ truyện hoặc ADMIN
    @PreAuthorize("hasAnyRole('AUTHOR','ADMIN')")
    @PutMapping("/{chapterId}")
    public ResponseEntity<?> updateChapter(@PathVariable Long chapterId, @RequestBody Chapter updated, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }
        User user = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(401).body("Không tìm thấy tài khoản.");

        Chapter existing = chapterService.getChapterById(chapterId);
        if (existing == null) return ResponseEntity.badRequest().body("Chương không tồn tại.");

        Story story = storyRepository.findById(existing.getStoryId()).orElse(null);
        if (story == null) return ResponseEntity.badRequest().body("Truyện không tồn tại.");

        if (!user.getId().equals(story.getUserId()) && !user.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body("Bạn không có quyền sửa chương này.");
        }

        if (updated.getTitle() != null) existing.setTitle(updated.getTitle());
        if (updated.getContent() != null) existing.setContent(updated.getContent());
        if (updated.getChapterIndex() != null) existing.setChapterIndex(updated.getChapterIndex());
        if (updated.getPrice() != null && updated.getPrice() >= 0) existing.setPrice(updated.getPrice());

        Chapter saved = chapterService.saveChapter(existing);
        return ResponseEntity.ok(saved);
    }
}
