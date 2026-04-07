package com.truyenhay.backend.controller;

import com.truyenhay.backend.dto.CompleteRegisterRequest;
import com.truyenhay.backend.dto.LoginResponse;
import com.truyenhay.backend.dto.SendOtpRequest;
import com.truyenhay.backend.dto.UserDTO;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.service.RegistrationOtpService;
import com.truyenhay.backend.service.UserCascadeDeletionService;
import com.truyenhay.backend.service.UserService;
import com.truyenhay.backend.security.JwtService;
import com.truyenhay.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class UserController {

    // ✅ 1. CHUYỂN TOÀN BỘ KHAI BÁO BIẾN LÊN ĐẦU VÀ VIẾT NGẮN GỌN
    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RegistrationOtpService registrationOtpService;

    @Autowired
    private UserCascadeDeletionService userCascadeDeletionService;

    /**
     * Bước 1: gửi OTP tới email (đồng thời kiểm tra email/username chưa tồn tại).
     */
    @PostMapping("/register/send-otp")
    public ResponseEntity<String> sendRegisterOtp(@Valid @RequestBody SendOtpRequest request) {
        try {
            registrationOtpService.sendOtp(request.getEmail(), request.getUsername());
            return ResponseEntity.ok("Đã gửi mã OTP tới email của bạn. Kiểm tra hộp thư (và thư mục spam).");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(e.getMessage());
        }
    }

    /**
     * Bước 2: xác thực OTP và tạo tài khoản.
     */
    @PostMapping("/register/complete")
    public ResponseEntity<?> completeRegister(@Valid @RequestBody CompleteRegisterRequest request) {
        try {
            UserDTO saved = registrationOtpService.completeRegistration(
                    request.getEmail(),
                    request.getUsername(),
                    request.getPassword(),
                    request.getFullName(),
                    request.getOtp());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Không thể tạo tài khoản. Thử lại sau.");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        String username = loginData.get("username");
        String password = loginData.get("password");

        User user = userService.authenticate(username, password);
        if (user != null) {
            String token = jwtService.generateToken(user.getUsername());
            UserDTO userDTO = userService.toPublicDTO(user);
            return ResponseEntity.ok(new LoginResponse(userDTO, token));
        }
        return ResponseEntity.status(401).body("Sai thông tin đăng nhập!");
    }

    /**
     * Xóa tài khoản đang đăng nhập kèm dữ liệu liên quan (để tránh lỗi FK khi xóa users).
     */
    @DeleteMapping("/account")
    public ResponseEntity<String> deleteMyAccount(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }
        Optional<User> opt = userRepository.findByUsername(authentication.getName());
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body("Không tìm thấy tài khoản.");
        }
        userCascadeDeletionService.deleteUserById(opt.get().getId());
        return ResponseEntity.ok("Đã xóa tài khoản và dữ liệu liên quan.");
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateProfile(@RequestBody User updatedUser, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
        }

        Optional<User> userOpt = userRepository.findByUsername(authentication.getName());
        if (userOpt.isPresent()) {
            User existingUser = userOpt.get();
            // Cập nhật fullName nếu có
            if (updatedUser.getFullName() != null) {
                existingUser.setFullName(updatedUser.getFullName());
            }
            // Cập nhật avatarUrl nếu có
            if (updatedUser.getAvatarUrl() != null) {
                existingUser.setAvatarUrl(updatedUser.getAvatarUrl());
            }
            userRepository.save(existingUser);
            return ResponseEntity.ok(userService.toPublicDTO(existingUser));
        }
        return ResponseEntity.badRequest().body("Không tìm thấy người dùng!");
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> data, Authentication authentication) {
        // ✅ 3. BỌC TRY-CATCH ĐỂ BẢO VỆ SERVER KHỎI DỮ LIỆU RÁC
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body("Bạn chưa đăng nhập!");
            }

            String oldPass = data.get("oldPass");
            String newPass = data.get("newPass");

            Optional<User> userOpt = userRepository.findByUsername(authentication.getName());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (passwordEncoder.matches(oldPass, user.getPassword())) {
                    user.setPassword(passwordEncoder.encode(newPass));
                    userRepository.save(user);
                    return ResponseEntity.ok("Đổi mật khẩu thành công!");
                } else {
                    return ResponseEntity.status(400).body("Mật khẩu hiện tại không đúng!");
                }
            }
            return ResponseEntity.badRequest().body("Lỗi hệ thống!");

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Dữ liệu gửi lên không hợp lệ!");
        }
    }
}