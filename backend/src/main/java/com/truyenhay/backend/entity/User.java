package com.truyenhay.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Locale;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username không được trống")
    @Size(min = 3, max = 50, message = "Username từ 3-50 ký tự")
    @Column(nullable = false, unique = true)
    private String username;

    @NotBlank(message = "Email không được trống")
    @Email(message = "Email không hợp lệ")
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank(message = "Password không được trống")
    @Size(min = 8, message = "Password tối thiểu 8 ký tự")
    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "NVARCHAR(20)")
    private Role role = Role.USER;

    @Column(name = "is_verified", nullable = false)
    private boolean isVerified = true;

    @Column(name = "verification_code")
    private String verificationCode;

    @Column(name = "otp_expires_at")
    private LocalDateTime otpExpiresAt;

    @Column(name = "otp_sent_at")
    private LocalDateTime otpSentAt;

    @Column(name = "coins", nullable = false)
    private Long coins = 0L;

    @Column(name = "vip_expires_at")
    private LocalDateTime vipExpiresAt;

    @PrePersist
    @PreUpdate
    public void normalizeForStore() {
        if (email != null) {
            email = email.trim().toLowerCase(Locale.ROOT);
        }
        if (username != null) {
            username = username.trim();
        }
    }
}
