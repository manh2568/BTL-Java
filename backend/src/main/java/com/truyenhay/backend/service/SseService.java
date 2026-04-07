package com.truyenhay.backend.service;

import com.truyenhay.backend.dto.CommentDTO;
import com.truyenhay.backend.dto.SseMessageDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseService {

    private static final Logger logger = LoggerFactory.getLogger(SseService.class);
    // Lưu các Emitter theo chapterId để phân luồng (chỉ ai đọc chương đó mới nhận log mới)
    private final Map<Long, List<SseEmitter>> emittersMap = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long chapterId) {
        SseEmitter emitter = new SseEmitter(0L); // Timeout vô hạn (thực tế có thể bị ngắt bởi nginx/proxy)
        emittersMap.computeIfAbsent(chapterId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        // Callbacks khi client ngắt kết nối
        emitter.onCompletion(() -> removeEmitter(chapterId, emitter));
        emitter.onTimeout(() -> removeEmitter(chapterId, emitter));
        emitter.onError((e) -> removeEmitter(chapterId, emitter));

        try {
            // Push 1 event connect thành công
            emitter.send(SseEmitter.event().name("message").data(new SseMessageDTO("CONNECTED", chapterId)));
        } catch (IOException e) {
            removeEmitter(chapterId, emitter);
        }
        return emitter;
    }

    private void removeEmitter(Long chapterId, SseEmitter emitter) {
        List<SseEmitter> list = emittersMap.get(chapterId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emittersMap.remove(chapterId);
            }
        }
    }

    public void broadcastNewComment(Long chapterId, CommentDTO commentDTO) {
        broadcast(chapterId, new SseMessageDTO("COMMENT_NEW", commentDTO));
    }

    public void broadcastDeleteComment(Long chapterId, Integer commentId) {
        broadcast(chapterId, new SseMessageDTO("COMMENT_DEL", commentId));
    }

    private void broadcast(Long chapterId, SseMessageDTO message) {
        List<SseEmitter> list = emittersMap.get(chapterId);
        if (list == null || list.isEmpty()) return;

        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();
        list.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event().name("message").data(message));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        });
        list.removeAll(deadEmitters);
    }
}
