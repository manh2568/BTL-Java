package com.truyenhay.backend.service;

import com.truyenhay.backend.dto.CommentDTO;
import com.truyenhay.backend.dto.CommentRequest;
import com.truyenhay.backend.entity.Comment;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.CommentRepository;
import com.truyenhay.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final SseService sseService;

    @Autowired
    public CommentService(CommentRepository commentRepository, UserRepository userRepository, SseService sseService) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.sseService = sseService;
    }

    public List<CommentDTO> getCommentsByChapter(Long chapterId) {
        List<Comment> comments = commentRepository.findByChapterIdOrderByCreatedAtDesc(chapterId);
        
        return comments.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public CommentDTO addComment(Long userId, CommentRequest request) {
        Comment comment = new Comment();
        comment.setChapterId(request.getChapterId());
        comment.setUserId(userId);
        comment.setContent(request.getText());
        comment.setIsDeleted(false);
        
        if (request.getParentId() != null && !request.getParentId().isEmpty()) {
            try {
                comment.setParentId(Integer.parseInt(request.getParentId().replace("c", "")));
            } catch (Exception ignored) {}
        }
        
        Comment savedComment = commentRepository.save(comment);
        
        CommentDTO dto = convertToDTO(savedComment);
        
        // Broadcast qua SSE
        sseService.broadcastNewComment(request.getChapterId(), dto);
        
        return dto;
    }

    public void deleteComment(Integer commentId, Long userId, boolean isAdmin) {
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy bình luận.");
        }
        Comment comment = commentOpt.get();
        // ADMIN có thể xóa bất kỳ comment nào
        if (!isAdmin && !comment.getUserId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền xóa bình luận này.");
        }
        
        Long chapterId = comment.getChapterId();
        
        // Đánh dấu xoá mềm
        comment.setIsDeleted(true);
        comment.setContent("Bình luận này đã bị " + (isAdmin ? "admin " : "") + "xóa.");
        commentRepository.save(comment);
        
        // Broadcast sự kiện delete
        sseService.broadcastDeleteComment(chapterId, commentId);
    }
    
    private CommentDTO convertToDTO(Comment comment) {
        Optional<User> userOpt = userRepository.findById(comment.getUserId());
        CommentDTO dto = new CommentDTO();
        dto.setId("c" + comment.getId());
        
        if (comment.getIsDeleted() != null && comment.getIsDeleted()) {
            dto.setText(comment.getContent() != null ? comment.getContent() : "Bình luận này đã bị xóa hoặc ẩn.");
            dto.setDeleted(true);
        } else {
            dto.setText(comment.getContent());
            dto.setDeleted(false);
        }
        
        if (comment.getParentId() != null) {
            dto.setParentId("c" + comment.getParentId());
        }

        if (comment.getCreatedAt() != null) {
            dto.setTime(comment.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli());
        } else {
            dto.setTime(System.currentTimeMillis());
        }
        dto.setLikes(0);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            dto.setUsername(user.getUsername());
            dto.setAvatarEmoji(null);
            dto.setAvatarPhoto(null);
        } else {
            dto.setUsername("Unknown");
        }
        return dto;
    }
}
