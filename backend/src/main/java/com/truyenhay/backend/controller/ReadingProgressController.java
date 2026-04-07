package com.truyenhay.backend.controller;

import com.truyenhay.backend.dto.ReadingProgressDto;
import com.truyenhay.backend.dto.SaveReadingProgressRequest;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.UserRepository;
import com.truyenhay.backend.service.ReadingProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/progress")
@CrossOrigin(origins = "*")
public class ReadingProgressController {

    private final ReadingProgressService readingProgressService;
    private final UserRepository userRepository;

    public ReadingProgressController(ReadingProgressService readingProgressService, UserRepository userRepository) {
        this.readingProgressService = readingProgressService;
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyProgress(Authentication authentication) {
        Optional<User> userOpt = resolveCurrentUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }

        List<ReadingProgressDto> payload = readingProgressService.getUserProgress(userOpt.get().getId());
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/me")
    public ResponseEntity<?> saveMyProgress(
            @RequestBody SaveReadingProgressRequest request,
            Authentication authentication
    ) {
        Optional<User> userOpt = resolveCurrentUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }
        if (request.getNovelId() == null ||
                (request.getChapterId() == null && request.getChapterIndex() == null)) {
            return ResponseEntity.badRequest().body("Thiếu dữ liệu tiến độ đọc.");
        }

        try {
            readingProgressService.saveProgress(
                    userOpt.get().getId(),
                    request.getNovelId(),
                    request.getChapterId(),
                    request.getChapterIndex()
            );
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    private Optional<User> resolveCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return Optional.empty();
        }
        return userRepository.findByUsername(authentication.getName());
    }
}
