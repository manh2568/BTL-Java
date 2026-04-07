package com.truyenhay.backend.controller;

import com.truyenhay.backend.dto.AdminCommentDTO;
import com.truyenhay.backend.dto.AdminStatsDTO;
import com.truyenhay.backend.entity.Role;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.service.AdminService;
import com.truyenhay.backend.service.CommentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Tất cả endpoint trong controller này đều yêu cầu role ADMIN.
 * SecurityConfig đã chặn /api/admin/** ở cấp filter chain.
 * @PreAuthorize ở đây là lớp bảo vệ thứ 2 (defense-in-depth).
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final CommentService commentService;
    private final com.truyenhay.backend.service.UserCascadeDeletionService userCascadeDeletionService;

    public AdminController(AdminService adminService, CommentService commentService, com.truyenhay.backend.service.UserCascadeDeletionService userCascadeDeletionService) {
        this.adminService = adminService;
        this.commentService = commentService;
        this.userCascadeDeletionService = userCascadeDeletionService;
    }

    /**
     * DELETE /api/admin/users/{id} — Xóa người dùng và toàn bộ dữ liệu (cascade an toàn)
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userCascadeDeletionService.deleteUserById(id);
            return ResponseEntity.ok("Đã xóa User ID=" + id + " kèm tất cả dữ liệu liên quan.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi khi xóa người dùng.");
        }
    }

    /**
     * GET /api/admin/stats — Thống kê tổng quát (Dashboard)
     */
    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDTO> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    /**
     * GET /api/admin/users — Danh sách tất cả user (kèm role)
     */
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    /**
     * PUT /api/admin/users/{id}/role — Đổi role của user
     * Body: { "role": "AUTHOR" }
     */
    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String roleName = body.get("role");
        if (roleName == null) {
            return ResponseEntity.badRequest().body("Thiếu trường 'role'.");
        }
        try {
            Role newRole = Role.valueOf(roleName.toUpperCase());
            User updated = adminService.changeUserRole(id, newRole);
            return ResponseEntity.ok(Map.of(
                    "id", updated.getId(),
                    "username", updated.getUsername(),
                    "role", updated.getRole()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Role không hợp lệ. Chỉ chấp nhận: USER, AUTHOR, ADMIN");
        }
    }

    /**
     * DELETE /api/admin/stories/{id} — Xóa truyện (cascade: chapters, comments, favorites, reading_history)
     */
    @DeleteMapping("/stories/{id}")
    public ResponseEntity<?> deleteStory(@PathVariable Long id) {
        try {
            adminService.deleteStory(id);
            return ResponseEntity.ok("Đã xóa truyện ID=" + id + " và toàn bộ dữ liệu liên quan.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * DELETE /api/admin/comments/{id} — Xóa mềm (soft-delete) comment bất kỳ
     */
    @DeleteMapping("/comments/{id}")
    public ResponseEntity<?> deleteComment(@PathVariable String id) {
        try {
            Integer commentId = Integer.parseInt(id.replace("c", ""));
            // isAdmin = true: bỏ qua kiểm tra ownership
            commentService.deleteComment(commentId, null, true);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * GET /api/admin/comments/recent — 50 comment gần nhất (chưa xóa)
     */
    @GetMapping("/comments/recent")
    public ResponseEntity<List<AdminCommentDTO>> getRecentComments() {
        return ResponseEntity.ok(adminService.getRecentComments());
    }
}
