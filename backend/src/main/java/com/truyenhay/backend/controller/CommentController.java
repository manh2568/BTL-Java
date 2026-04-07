package com.truyenhay.backend.controller;

import com.truyenhay.backend.dto.CommentDTO;
import com.truyenhay.backend.dto.CommentRequest;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.UserRepository;
import com.truyenhay.backend.service.CommentService;
import com.truyenhay.backend.service.SseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/comments")
@CrossOrigin(origins = "*")
public class CommentController {

    private final CommentService commentService;
    private final UserRepository userRepository;

    @Autowired
    private SseService sseService;
    
    @GetMapping(value = "/stream/{chapterId}", produces = "text/event-stream")
    public SseEmitter streamComments(@PathVariable Long chapterId) {
        return sseService.subscribe(chapterId);
    }

    public CommentController(CommentService commentService, UserRepository userRepository) {
        this.commentService = commentService;
        this.userRepository = userRepository;
    }

    /**
     * Lấy danh sách bình luận của 1 chapter
     */
    @GetMapping("/chapter/{chapterId}")
    public ResponseEntity<List<CommentDTO>> getCommentsByChapter(@PathVariable Long chapterId) {
        List<CommentDTO> comments = commentService.getCommentsByChapter(chapterId);
        return ResponseEntity.ok(comments);
    }

    /**
     * Tạo một bình luận mới
     */
    @PostMapping
    public ResponseEntity<?> addComment(
            @RequestBody CommentRequest request,
            Authentication authentication
    ) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }
        
        CommentDTO newComment = commentService.addComment(userOpt.get().getId(), request);
        return ResponseEntity.ok(newComment);
    }

    /**
     * Xoá bình luận (id của comment thường dạng 'c15', filter lấy số đằng sau)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteComment(
            @PathVariable String id,
            Authentication authentication
    ) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }

        try {
            Integer commentId = Integer.parseInt(id.replace("c", ""));
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            commentService.deleteComment(commentId, userOpt.get().getId(), isAdmin);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private Optional<User> resolveUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return Optional.empty();
        }
        return userRepository.findByUsername(authentication.getName());
    }
}
