package com.truyenhay.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "amount", nullable = false)
    private Long amount; // Số lượng coin

    @Column(name = "status", nullable = false)
    private String status; // PENDING, PAID, FAILED, CANCELLED

    @Column(name = "vnpay_transaction_no")
    private String vnpayTransactionNo; // Mã giao dịch từ VNPay

    @Column(name = "payment_url")
    private String paymentUrl; // URL chuyển hướng sang VNPay

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt; // Order hết hạn sau 15 phút

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        status = "PENDING";
        expiresAt = LocalDateTime.now().plusMinutes(15); // 15 phút để thanh toán
    }
}
