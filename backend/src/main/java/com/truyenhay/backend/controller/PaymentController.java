package com.truyenhay.backend.controller;

import com.truyenhay.backend.entity.Chapter;
import com.truyenhay.backend.entity.Order;
import com.truyenhay.backend.entity.Transaction;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.OrderRepository;
import com.truyenhay.backend.repository.TransactionRepository;
import com.truyenhay.backend.repository.UserRepository;
import com.truyenhay.backend.service.ChapterService;
import com.truyenhay.backend.service.UserService;
import com.truyenhay.backend.config.VnpayConfig;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final OrderRepository orderRepository;
    private final ChapterService chapterService;
    private final UserService userService;
    private final VnpayConfig vnpayConfig;

    public PaymentController(
            UserRepository userRepository,
            TransactionRepository transactionRepository,
            OrderRepository orderRepository,
            ChapterService chapterService,
            UserService userService,
            VnpayConfig vnpayConfig
    ) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.orderRepository = orderRepository;
        this.chapterService = chapterService;
        this.userService = userService;
        this.vnpayConfig = vnpayConfig;
    }

    /**
     * Demo mode: top up coins directly without a real payment gateway.
     */
    @Transactional
    @PostMapping("/topup")
    public ResponseEntity<?> topupCoins(@RequestBody Map<String, Long> payload, Authentication authentication) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "Ban chua dang nhap!"));
        }

        User user = userOpt.get();
        Long amount = payload.getOrDefault("amount", 0L);
        if (amount == null || amount <= 0 || amount > 1_000_000L) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "So coin nap khong hop le (1 - 1,000,000)."
            ));
        }

        user.setCoins(user.getCoins() + amount);
        userRepository.save(user);

        Order order = new Order();
        order.setUserId(user.getId());
        order.setAmount(amount);
        order.setStatus("PAID");
        order.setPaidAt(LocalDateTime.now());
        orderRepository.save(order);

        Transaction tx = new Transaction();
        tx.setUserId(user.getId());
        tx.setType("TOPUP");
        tx.setAmount(amount);
        transactionRepository.save(tx);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "[DEMO] Nap " + amount + " Coins thanh cong.");
        body.put("orderId", order.getId());
        body.put("user", userService.toPublicDTO(user));
        return ResponseEntity.ok(body);
    }

    @Transactional
    @PostMapping("/buy-vip")
    public ResponseEntity<?> buyVip(Authentication authentication) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Ban chua dang nhap!");
        }

        User user = userOpt.get();
        long vipPrice = 5000L;
        if (user.getCoins() < vipPrice) {
            return ResponseEntity.badRequest().body("Ban khong du Coin. Can " + vipPrice + " Coin de mua VIP 30 ngay.");
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

    @Transactional
    @PostMapping("/unlock-chapter/{chapterId}")
    public ResponseEntity<?> unlockChapter(@PathVariable Long chapterId, Authentication authentication) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Ban chua dang nhap!");
        }

        User user = userOpt.get();
        Chapter chapter = chapterService.getChapterById(chapterId);
        if (chapter == null) {
            return ResponseEntity.badRequest().body("Khong tim thay chuong!");
        }
        if (chapter.getPrice() == null || chapter.getPrice() <= 0) {
            return ResponseEntity.badRequest().body("Chuong nay mien phi!");
        }

        Optional<Transaction> bought = transactionRepository.findByUserIdAndChapterIdAndType(
                user.getId(), chapterId, "UNLOCK_CHAPTER"
        );
        if (bought.isPresent()) {
            return ResponseEntity.ok("Ban da mua chuong nay roi.");
        }

        long price = chapter.getPrice();
        if (user.getCoins() < price) {
            return ResponseEntity.badRequest().body("Khong du Coin (" + price + "). Vui long nap them.");
        }

        user.setCoins(user.getCoins() - price);
        userRepository.save(user);

        Transaction tx = new Transaction();
        tx.setUserId(user.getId());
        tx.setType("UNLOCK_CHAPTER");
        tx.setAmount(-price);
        tx.setChapterId(chapterId);
        transactionRepository.save(tx);

        return ResponseEntity.ok("Mo khoa thanh cong!");
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getOrders(Authentication authentication) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "Ban chua dang nhap!"));
        }

        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userOpt.get().getId());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "orders", orders
        ));
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(Authentication authentication) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Ban chua dang nhap!");
        }
        List<Transaction> txList = transactionRepository.findByUserIdOrderByCreatedAtDesc(userOpt.get().getId());
        return ResponseEntity.ok(txList);
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable Long orderId, Authentication authentication) {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "Ban chua dang nhap!"));
        }

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Khong tim thay don hang."));
        }

        Order order = orderOpt.get();
        if (!order.getUserId().equals(userOpt.get().getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Khong co quyen xem don hang nay."));
        }

        return ResponseEntity.ok(order);
    }

    @PostMapping("/vnpay/create-payment")
    public ResponseEntity<?> createPayment(
            @RequestBody Map<String, Long> payload,
            jakarta.servlet.http.HttpServletRequest request,
            Authentication authentication
    ) throws java.io.UnsupportedEncodingException {
        Optional<User> userOpt = resolveUser(authentication);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Ban chua dang nhap!");
        }

        Long amount = payload.get("amount"); // Vietnam Dong
        if (amount == null || amount < 10000) {
            return ResponseEntity.badRequest().body("So tien nap toi thieu la 10.000 VND.");
        }

        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String vnp_OrderInfo = "Nap coin cho tai khoan " + userOpt.get().getUsername();
        String vnp_OrderType = "other";
        String vnp_TxnRef = VnpayConfig.getRandomNumber(8);
        String vnp_IpAddr = VnpayConfig.getIpAddress(request);
        String vnp_TmnCode = vnpayConfig.getTmnCode();

        Map<String, String> vnp_Params = new java.util.HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount * 100));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", vnp_OrderInfo);
        vnp_Params.put("vnp_OrderType", vnp_OrderType);
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", vnpayConfig.getNotifyUrl()); // We use the notifyUrl as return url for simplicity
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        java.util.Calendar cld = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("Etc/GMT+7"));
        java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        cld.add(java.util.Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        List<String> fieldNames = new java.util.ArrayList<>(vnp_Params.keySet());
        java.util.Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        java.util.Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                // Build hash data
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(java.net.URLEncoder.encode(fieldValue, java.nio.charset.StandardCharsets.UTF_8.toString()));
                // Build query
                query.append(java.net.URLEncoder.encode(fieldName, java.nio.charset.StandardCharsets.UTF_8.toString()));
                query.append('=');
                query.append(java.net.URLEncoder.encode(fieldValue, java.nio.charset.StandardCharsets.UTF_8.toString()));
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }
        String queryUrl = query.toString();
        String finalHashData = hashData.toString();
        
        String vnp_SecureHash = VnpayConfig.hmacSHA512(vnpayConfig.getSecretKey(), finalHashData);
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        String paymentUrl = vnpayConfig.getUrl() + "?" + queryUrl;

        // Save Order
        Order order = new Order();
        order.setUserId(userOpt.get().getId());
        order.setAmount(amount / 10); // 1.000 VND = 100 Coins (just example mapping)
        order.setStatus("PENDING");
        order.setVnpayTransactionNo(vnp_TxnRef);
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of("url", paymentUrl));
    }

    @GetMapping("/vnpay-callback")
    public void vnpayCallback(jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        Map<String, String> fields = new java.util.HashMap<>();
        for (java.util.Enumeration<String> params = request.getParameterNames(); params.hasMoreElements();) {
            String fieldName = params.nextElement();
            String fieldValue = request.getParameter(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                fields.put(fieldName, fieldValue);
            }
        }

        String vnp_SecureHash = request.getParameter("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");
        fields.remove("vnp_SecureHash");

        // Sort and hash to verify
        List<String> fieldNames = new java.util.ArrayList<>(fields.keySet());
        java.util.Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        java.util.Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = fields.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(java.net.URLEncoder.encode(fieldValue, java.nio.charset.StandardCharsets.UTF_8.toString()));
                if (itr.hasNext()) {
                    hashData.append('&');
                }
            }
        }
        String finalHashData = hashData.toString();
        if (finalHashData.endsWith("&")) finalHashData = finalHashData.substring(0, finalHashData.length() - 1);

        String signValue = VnpayConfig.hmacSHA512(vnpayConfig.getSecretKey(), finalHashData);
        boolean isValid = signValue.equalsIgnoreCase(vnp_SecureHash);

        String responseCode = request.getParameter("vnp_ResponseCode");
        String txnRef = request.getParameter("vnp_TxnRef");
        
        String returnUrl = vnpayConfig.getReturnUrl();
        String redirectUrl = returnUrl + (returnUrl.contains("?") ? "&" : "?") + "vnp_ResponseCode=" + responseCode;
        
        if (isValid && "00".equals(responseCode)) {
            Optional<Order> orderOpt = orderRepository.findByVnpayTransactionNo(txnRef);
            if (orderOpt.isPresent() && "PENDING".equals(orderOpt.get().getStatus())) {
                Order order = orderOpt.get();
                order.setStatus("PAID");
                order.setPaidAt(LocalDateTime.now());
                orderRepository.save(order);

                User user = userRepository.findById(order.getUserId()).get();
                user.setCoins(user.getCoins() + order.getAmount());
                userRepository.save(user);

                Transaction tx = new Transaction();
                tx.setUserId(user.getId());
                tx.setType("TOPUP_VNPAY");
                tx.setAmount(order.getAmount());
                transactionRepository.save(tx);
            }
        }

        response.sendRedirect(redirectUrl);
    }

    private Optional<User> resolveUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return Optional.empty();
        }
        return userRepository.findByUsername(authentication.getName());
    }
}
