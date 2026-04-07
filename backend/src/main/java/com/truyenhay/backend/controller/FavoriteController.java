package com.truyenhay.backend.controller;

import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.UserRepository;
import com.truyenhay.backend.service.FavoriteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/favorites")
@CrossOrigin(origins = "*")
public class FavoriteController {

    private final FavoriteService favoriteService;
    private final UserRepository userRepository;

    public FavoriteController(FavoriteService favoriteService, UserRepository userRepository) {
        this.favoriteService = favoriteService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/favorites/me - Lấy danh sách novelId đang theo dõi
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMyFavorites(Authentication authentication) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }

        List<Long> novelIds = favoriteService.getFollowedNovelIds(userOpt.get().getId());
        return ResponseEntity.ok(novelIds);
    }

    /**
     * POST /api/favorites/me - Theo dõi truyện
     * Body: { "novelId": 4 }
     */
    @PostMapping("/me")
    public ResponseEntity<?> followStory(
            @RequestBody Map<String, Long> body,
            Authentication authentication
    ) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }

        Long novelId = body.get("novelId");
        if (novelId == null) {
            return ResponseEntity.badRequest().body("Thiếu novelId.");
        }

        favoriteService.follow(userOpt.get().getId(), novelId);
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/favorites/me/{novelId} - Bỏ theo dõi truyện
     */
    @DeleteMapping("/me/{novelId}")
    public ResponseEntity<?> unfollowStory(
            @PathVariable Long novelId,
            Authentication authentication
    ) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }

        favoriteService.unfollow(userOpt.get().getId(), novelId);
        return ResponseEntity.ok().build();
    }

    private Optional<User> resolveUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return Optional.empty();
        }
        return userRepository.findByUsername(authentication.getName());
    }
}
