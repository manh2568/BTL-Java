package com.truyenhay.backend.controller;

import com.truyenhay.backend.entity.Chapter;
import com.truyenhay.backend.entity.Transaction;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.TransactionRepository;
import com.truyenhay.backend.repository.UserRepository;
import com.truyenhay.backend.service.ChapterService;
import com.truyenhay.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private ChapterService chapterService;

    @Autowired
    private UserService userService;

    @PostMapping("/topup")
    public ResponseEntity<?> topupCoins(@RequestBody Map<String, Long> payload, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }

        User user = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("Không tìm thấy tài khoản.");

        Long amount = payload.getOrDefault("amount", 0L);
        if (amount <= 0) return ResponseEntity.badRequest().body("Số tiền nạp không hợp lệ.");

        user.setCoins(user.getCoins() + amount);
        userRepository.save(user);

        Transaction tx = new Transaction();
        tx.setUserId(user.getId());
        tx.setType("TOPUP");
        tx.setAmount(amount);
        transactionRepository.save(tx);

        return ResponseEntity.ok(userService.toPublicDTO(user));
    }

    @PostMapping("/buy-vip")
    public ResponseEntity<?> buyVip(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }

        User user = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("Không tìm thấy tài khoản.");

        long vipPrice = 5000L;
        if (user.getCoins() < vipPrice) {
            return ResponseEntity.badRequest().body("Bạn không đủ Coin. Cần " + vipPrice + " Coin để mua VIP 30 ngày.");
        }

        user.setCoins(user.getCoins() - vipPrice);
        
        LocalDateTime now = LocalDateTime.now();
        if (user.getVipExpiresAt() != null && user.getVipExpiresAt().isAfter(now)) {
            user.setVipExpiresAt(user.getVipExpiresAt().plusDays(30));
        } else {
            user.setVipExpiresAt(now.plusDays(30));
        }
        userRepository.save(user);

        Transaction tx = new Transaction();
        tx.setUserId(user.getId());
        tx.setType("VIP");
        tx.setAmount(-vipPrice);
        transactionRepository.save(tx);

        return ResponseEntity.ok(userService.toPublicDTO(user));
    }

    @PostMapping("/unlock-chapter/{chapterId}")
    public ResponseEntity<?> unlockChapter(@PathVariable Long chapterId, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }

        User user = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("Không tìm thấy người dùng!");

        Chapter chapter = chapterService.getChapterById(chapterId);
        if (chapter == null) return ResponseEntity.badRequest().body("Không tìm thấy chương!");

        if (chapter.getPrice() == null || chapter.getPrice() <= 0) {
            return ResponseEntity.badRequest().body("Chương này miễn phí!");
        }

        // Kiểm tra đã mua chưa
        Optional<Transaction> bought = transactionRepository.findByUserIdAndChapterIdAndType(user.getId(), chapterId, "UNLOCK_CHAPTER");
        if (bought.isPresent()) {
            return ResponseEntity.ok("Bạn đã mua chương này rồi.");
        }

        long price = chapter.getPrice();
        if (user.getCoins() < price) {
            return ResponseEntity.badRequest().body("Không đủ Coin (" + price + "). Vui lòng nạp thêm.");
        }

        user.setCoins(user.getCoins() - price);
        userRepository.save(user);

        Transaction tx = new Transaction();
        tx.setUserId(user.getId());
        tx.setType("UNLOCK_CHAPTER");
        tx.setAmount(-price);
        tx.setChapterId(chapterId);
        transactionRepository.save(tx);

        return ResponseEntity.ok("Mở khóa thành công!");
    }
}
