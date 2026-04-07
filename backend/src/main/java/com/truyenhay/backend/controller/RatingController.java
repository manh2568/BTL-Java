package com.truyenhay.backend.controller;

import com.truyenhay.backend.dto.RatingResponseDTO;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.UserRepository;
import com.truyenhay.backend.service.RatingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ratings")
@CrossOrigin(origins = "*")
public class RatingController {

    @Autowired
    private RatingService ratingService;

    @Autowired
    private UserRepository userRepository;

    /**
     * GET /api/ratings/{novelId} — Lấy thông tin rating (bao gồm rating của user nếu đã đăng nhập)
     */
    @GetMapping("/{novelId}")
    public ResponseEntity<RatingResponseDTO> getRating(
            @PathVariable Long novelId,
            Authentication authentication) {

        Long userId = null;
        if (authentication != null && authentication.getName() != null) {
            User user = userRepository.findByUsername(authentication.getName()).orElse(null);
            if (user != null) userId = user.getId();
        }

        return ResponseEntity.ok(ratingService.getRating(novelId, userId));
    }

    /**
     * POST /api/ratings/{novelId} — User chấm sao (body: { "stars": 4 })
     */
    @PostMapping("/{novelId}")
    public ResponseEntity<?> submitRating(
            @PathVariable Long novelId,
            @RequestBody Map<String, Integer> body,
            Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(401).body("Bạn cần đăng nhập để đánh giá.");
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản."));

        Integer stars = body.get("stars");
        if (stars == null) {
            return ResponseEntity.badRequest().body("Thiếu trường 'stars'.");
        }

        try {
            RatingResponseDTO result = ratingService.submitRating(user.getId(), novelId, stars);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
