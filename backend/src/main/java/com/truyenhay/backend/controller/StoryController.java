package com.truyenhay.backend.controller;

import com.truyenhay.backend.dto.StoryListDto;
import com.truyenhay.backend.entity.Story;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.UserRepository;
import com.truyenhay.backend.service.StoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stories")
@CrossOrigin(origins = "*") // Cho phép Frontend gọi API
public class StoryController {

    @Autowired
    private StoryService storyService;

    @Autowired
    private UserRepository userRepository;

    // API lấy danh sách tất cả truyện: GET http://localhost:8080/api/stories
    @GetMapping
    public ResponseEntity<List<StoryListDto>> getAllStories() {
        List<StoryListDto> stories = storyService.getAllStories();
        return ResponseEntity.ok(stories);
    }
    // ✅ Chỉ AUTHOR / ADMIN mới được đăng truyện mới
    @PreAuthorize("hasAnyRole('AUTHOR','ADMIN')")
    @PostMapping
    public ResponseEntity<?> addStory(@RequestBody Story story, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }
        try {
            // Lấy userId từ JWT, không tin request body
            User user = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản."));
            story.setUserId(user.getId());
            Story savedStory = storyService.addStory(story);
            return ResponseEntity.ok(savedStory);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Không thể thêm truyện: " + e.getMessage());
        }
    }

    // API tăng lượt xem: POST http://localhost:8080/api/stories/{id}/view
    @PostMapping("/{id}/view")
    public ResponseEntity<?> incrementView(@PathVariable Long id) {
        try {
            storyService.incrementView(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ✅ Sửa truyện — chỉ chủ truyện (AUTHOR) hoặc ADMIN
    @PreAuthorize("hasAnyRole('AUTHOR','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<?> updateStory(@PathVariable Long id, @RequestBody Story updatedStory, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }
        try {
            User user = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản."));

            Story existing = storyService.getStoryById(id);
            if (existing == null) {
                return ResponseEntity.badRequest().body("Truyện không tồn tại.");
            }
            // Chỉ chủ sở hữu hoặc ADMIN
            if (!user.getId().equals(existing.getUserId()) && !user.getRole().name().equals("ADMIN")) {
                return ResponseEntity.status(403).body("Bạn không có quyền sửa truyện này.");
            }

            if (updatedStory.getTitle() != null) existing.setTitle(updatedStory.getTitle());
            if (updatedStory.getAuthor() != null) existing.setAuthor(updatedStory.getAuthor());
            if (updatedStory.getGenre() != null) existing.setGenre(updatedStory.getGenre());
            if (updatedStory.getDescription() != null) existing.setDescription(updatedStory.getDescription());
            if (updatedStory.getCoverUrl() != null) existing.setCoverUrl(updatedStory.getCoverUrl());
            if (updatedStory.getStatus() != null) existing.setStatus(updatedStory.getStatus());

            Story saved = storyService.saveStory(existing);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi khi sửa truyện: " + e.getMessage());
        }
    }
}