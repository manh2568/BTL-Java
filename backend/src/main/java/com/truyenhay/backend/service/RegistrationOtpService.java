package com.truyenhay.backend.service;

import com.truyenhay.backend.dto.UserDTO;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.UserRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class RegistrationOtpService {

    private static final int OTP_TTL_MINUTES = 10;
    private static final long RESEND_COOLDOWN_SECONDS = 60;

    private final UserRepository userRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;

    private final SecureRandom random = new SecureRandom();

    public RegistrationOtpService(
            UserRepository userRepository,
            ObjectProvider<JavaMailSender> mailSenderProvider,
            PasswordEncoder passwordEncoder,
            UserService userService) {
        this.userRepository = userRepository;
        this.mailSenderProvider = mailSenderProvider;
        this.passwordEncoder = passwordEncoder;
        this.userService = userService;
    }

    public static String normalizeEmail(String raw) {
        if (raw == null) return "";
        return raw.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Gửi OTP: lưu vào users (verification_code, otp_expires_at, otp_sent_at).
     * Tài khoản chờ có is_verified = false và mật khẩu tạm (không đăng nhập được cho tới khi hoàn tất).
     */
    @Transactional
    public void sendOtp(String rawEmail, String rawUsername) {
        String email = normalizeEmail(rawEmail);
        String username = rawUsername != null ? rawUsername.trim() : "";
        String userKey = username.toLowerCase(Locale.ROOT);

        if (email.isEmpty()) {
            throw new IllegalArgumentException("Email không hợp lệ.");
        }
        if (userRepository.existsVerifiedByEmailCanonical(email)) {
            throw new IllegalArgumentException("Email đã tồn tại.");
        }
        if (userRepository.existsVerifiedByUsernameCanonical(userKey)) {
            throw new IllegalArgumentException("Tên đăng nhập đã được sử dụng.");
        }

        LocalDateTime now = LocalDateTime.now();
        Optional<User> pendingByEmail = userRepository.findPendingByEmailCanonical(email);

        if (pendingByEmail.isPresent()) {
            User pending = pendingByEmail.get();
            if (!pending.getUsername().trim().equalsIgnoreCase(username)) {
                throw new IllegalArgumentException("Email này đang chờ xác thực với tên đăng nhập khác.");
            }
            assertResendCooldown(pending.getOtpSentAt(), now);
            applyOtpToUser(pending, now);
            userRepository.save(pending);
            sendEmailInternal(email, pending.getVerificationCode());
            return;
        }

        Optional<User> pendingByUsername = userRepository.findPendingByUsernameCanonical(userKey);
        if (pendingByUsername.isPresent()
                && !normalizeEmail(pendingByUsername.get().getEmail()).equals(email)) {
            throw new IllegalArgumentException("Tên đăng nhập đang được dùng cho đăng ký khác.");
        }

        String code = generateOtp();
        User pending = new User();
        pending.setUsername(username);
        pending.setEmail(email);
        pending.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        pending.setFullName(username);
        pending.setVerified(false);
        pending.setVerificationCode(code);
        pending.setOtpExpiresAt(now.plusMinutes(OTP_TTL_MINUTES));
        pending.setOtpSentAt(now);
        userRepository.save(pending);
        sendEmailInternal(email, code);
    }

    private static void assertResendCooldown(LocalDateTime lastSent, LocalDateTime now) {
        if (lastSent == null) return;
        long sec = ChronoUnit.SECONDS.between(lastSent, now);
        if (sec >= 0 && sec < RESEND_COOLDOWN_SECONDS) {
            throw new IllegalArgumentException("Vui lòng đợi khoảng 60 giây trước khi gửi lại mã.");
        }
    }

    private void applyOtpToUser(User pending, LocalDateTime now) {
        String code = generateOtp();
        pending.setVerificationCode(code);
        pending.setOtpExpiresAt(now.plusMinutes(OTP_TTL_MINUTES));
        pending.setOtpSentAt(now);
    }

    /**
     * Xác thực OTP, đặt mật khẩu thật, bật is_verified, xóa các trường OTP.
     */
    @Transactional
    public UserDTO completeRegistration(
            String rawEmail,
            String rawUsername,
            String rawPassword,
            String rawFullName,
            String otpInput) {
        String email = normalizeEmail(rawEmail);
        String un = rawUsername != null ? rawUsername.trim() : "";
        String otp = otpInput != null ? otpInput.trim() : "";

        if (!otp.matches("\\d{6}")) {
            throw new IllegalArgumentException("Mã OTP gồm đúng 6 chữ số.");
        }

        User pending = userRepository.findPendingByEmailCanonical(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Chưa có mã OTP cho email này. Hãy gửi lại mã."));

        if (!pending.getUsername().trim().equalsIgnoreCase(un)) {
            throw new IllegalArgumentException("Tên đăng nhập không khớp với lần đăng ký.");
        }

        if (pending.getOtpExpiresAt() == null || LocalDateTime.now().isAfter(pending.getOtpExpiresAt())) {
            throw new IllegalArgumentException("Mã OTP đã hết hạn. Vui lòng gửi lại mã.");
        }

        String stored = pending.getVerificationCode();
        if (stored == null || !stored.equals(otp)) {
            throw new IllegalArgumentException("Mã OTP không đúng.");
        }

        String fn = rawFullName != null && !rawFullName.isBlank() ? rawFullName.trim() : un;
        pending.setPassword(passwordEncoder.encode(rawPassword));
        pending.setFullName(fn);
        pending.setVerified(true);
        pending.setVerificationCode(null);
        pending.setOtpExpiresAt(null);
        pending.setOtpSentAt(null);

        User saved = userRepository.save(pending);
        return userService.toPublicDTO(saved);
    }

    private String generateOtp() {
        return String.valueOf(random.nextInt(900_000) + 100_000);
    }

    private void sendEmailInternal(String toEmail, String code) {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            throw new IllegalStateException(
                    "Chưa cấu hình gửi email. Đặt spring.mail.host, spring.mail.username, spring.mail.password (Gmail: dùng mật khẩu ứng dụng).");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Mã xác thực đăng ký — TruyệnHay");
        message.setText("Chào bạn,\n\nMã OTP đăng ký tài khoản TruyệnHay của bạn: " + code
                + "\n\nMã có hiệu lực trong 10 phút. Không chia sẻ mã này với ai.\n\nTrân trọng,\nTruyệnHay");

        try {
            sender.send(message);
        } catch (MailException e) {
            throw new IllegalStateException(
                    "Không gửi được email. Kiểm tra SMTP và địa chỉ nhận.", e);
        }
    }
}
