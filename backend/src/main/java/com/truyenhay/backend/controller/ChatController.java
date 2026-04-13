package com.truyenhay.backend.controller;

import com.truyenhay.backend.dto.StoryListDto;
import com.truyenhay.backend.service.StoryService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final StoryService storyService;
    private final RestTemplate restTemplate;

    @Value("${gemini.api-key}")
    private String geminiApiKey;

    @Value("${gemini.api-url}")
    private String geminiApiUrl;

    public ChatController(StoryService storyService) {
        this.storyService = storyService;
        // Tăng timeout lên 60 giây (60000ms) để AI có đủ thời gian sinh câu trả lời dài
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000);
        factory.setReadTimeout(60000); 
        this.restTemplate = new RestTemplate(factory);
    }

    @PostMapping
    public ResponseEntity<?> chat(@RequestBody Map<String, String> payload) {
        String userMessage = payload.get("message");
        if (userMessage == null || userMessage.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("reply", "Tin nhắn không được trống."));
        }

        // Giới hạn độ dài câu hỏi
        if (userMessage.length() > 500) {
            userMessage = userMessage.substring(0, 500);
        }

        String storyContext = buildStoryContext();
        String fullPrompt = buildPrompt(userMessage, storyContext);

        try {
            String url = geminiApiUrl + "?key=" + geminiApiKey;

            // Build request body
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", fullPrompt))
                    )
                ),
                "generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 8192, // Tăng tối đa để không bị cắt đuôi
                    "topP", 0.95
                )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String reply = extractGeminiReply(response.getBody());
                if (reply != null && !reply.isBlank()) {
                    return ResponseEntity.ok(Map.of("reply", reply));
                }
            }

            return ResponseEntity.ok(Map.of("reply", "Tôi đã hiểu câu hỏi nhưng không thể tạo câu trả lời hoàn chỉnh. Bạn thử hỏi lại nhé!"));

        } catch (Exception e) {
            System.err.println("[ChatBot] Error: " + e.getMessage());
            return ResponseEntity.ok(Map.of("reply", "Đã xảy ra lỗi kết nối. Vui lòng thử lại sau!"));
        }
    }

    @SuppressWarnings("unchecked")
    private String extractGeminiReply(Map<?, ?> body) {
        try {
            List<?> candidates = (List<?>) body.get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;

            Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
            
            // Log lý do dừng nếu không phải STOP (để debug)
            Object finishReason = candidate.get("finishReason");
            if (finishReason != null && !"STOP".equals(finishReason.toString())) {
                System.out.println("[ChatBot] Warning: Finish reason is " + finishReason);
            }

            Map<?, ?> content = (Map<?, ?>) candidate.get("content");
            if (content == null) return null;

            List<?> parts = (List<?>) content.get("parts");
            if (parts == null || parts.isEmpty()) return null;

            // Gộp tất cả các parts lại
            return parts.stream()
                    .map(p -> {
                        Map<?, ?> part = (Map<?, ?>) p;
                        Object text = part.get("text");
                        return text != null ? text.toString() : "";
                    })
                    .collect(Collectors.joining(""));
        } catch (Exception e) {
            System.err.println("[ChatBot] Parse error: " + e.getMessage());
            return null;
        }
    }

    private String buildPrompt(String userMessage, String storyContext) {
        return """
                Bối cảnh: Bạn là **"Cố vấn Truyện TruyenHay"** - một chuyên gia am hiểu sâu sắc về kho truyện của nền tảng TruyenHay.
                
                Nhiệm vụ của bạn:
                1. **Tư vấn truyện tận tâm:** Khi người dùng hỏi gợi ý, hãy phân tích sở thích của họ và tìm trong danh sách truyện dưới đây những bộ thực sự phù hợp. Không chỉ liệt kê tên, hãy giải thích ngắn gọn TẠI SAO bộ truyện đó lại hay (dựa vào mô tả/thể loại).
                2. **Hướng dẫn dịch vụ:** Trả lời các thắc mắc về hệ thống:
                   - 💰 Nạp Coin: 1.000 Coins = 10.000 VNĐ.
                   - 👑 Gói VIP: 5.000 Coins/tháng (đọc miễn phí toàn bộ truyện khóa).
                   - 🔐 Đăng nhập: Hỗ trợ Google và Facebook tiện lợi.
                3. **Phong cách:** Chuyên nghiệp, đam mê truyện, lịch sự. Sử dụng Tiếng Việt tự nhiên, có emoji phù hợp.
                4. **Giới hạn:** Tuyệt đối không bịa đặt truyện không có trong danh sách. Nếu không có bộ nào phù hợp, hãy xin lỗi và gợi ý những bộ hot nhất hiện tại.
                
                DANH SÁCH TRUYỆN ĐANG CÓ (CONTEXT):
                """ + storyContext + """
                
                CÂU HỎI CỦA ĐỘC GIẢ: """ + userMessage + """
                
                Hãy trả lời một cách thông minh, cuốn hút và đầy đủ ý:
                """;
    }

    private String buildStoryContext() {
        try {
            List<StoryListDto> stories = storyService.getAllStories();
            if (stories == null || stories.isEmpty()) return "Hiện tại kho truyện đang được cập nhật thêm.";

            return stories.stream()
                    .limit(20) // Pro có thể xử lý nhiều hơn nhưng 20 là đủ cho một câu trả lời tốt
                    .map(s -> String.format("- **%s** | %s | Tác giả: %s | %d chương | Tóm tắt: %s",
                            s.getTitle(),
                            s.getGenre() != null ? s.getGenre() : "Đa dạng",
                            s.getAuthor() != null ? s.getAuthor() : "Ẩn danh",
                            s.getChapters() != null ? s.getChapters() : 0,
                            truncateDescription(s.getDescription())))
                    .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            return "Lỗi khi truy xuất dữ liệu truyện.";
        }
    }

    private String truncateDescription(String desc) {
        if (desc == null || desc.isBlank()) return "Đang cập nhật...";
        return desc.length() > 80 ? desc.substring(0, 80) + "..." : desc;
    }

    private String nullSafe(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }
}
