package com.truyenhay.backend.service;

import com.truyenhay.backend.dto.UserDTO;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Chuyển User entity → UserDTO (không có password)
    private UserDTO toDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setRole(user.getRole());
        dto.setCoins(user.getCoins());
        dto.setVipExpiresAt(user.getVipExpiresAt());
        return dto;
    }

    public UserDTO registerUser(User user) {
        // Mã hóa password trước khi lưu
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User saved = userRepository.save(user);
        return toDTO(saved);
    }

    public UserDTO login(String accountId, String password) {
        User user = authenticate(accountId, password);
        if (user == null) {
            return null;
        }
        return toDTO(user);
    }

    public User authenticate(String accountId, String password) {
        if (accountId == null || password == null) {
            return null;
        }
        String aid = accountId.trim();
        if (aid.contains("@")) {
            String canon = RegistrationOtpService.normalizeEmail(aid);
            Optional<User> emailOpt = userRepository.findByEmailCanonical(canon);
            if (emailOpt.isPresent()
                    && emailOpt.get().isVerified()
                    && passwordEncoder.matches(password, emailOpt.get().getPassword())) {
                return emailOpt.get();
            }
            return null;
        }
        Optional<User> userOpt = userRepository.findByUsernameCanonical(aid.toLowerCase(Locale.ROOT));
        if (userOpt.isPresent()
                && userOpt.get().isVerified()
                && passwordEncoder.matches(password, userOpt.get().getPassword())) {
            return userOpt.get();
        }
        return null;
    }

    public UserDTO toPublicDTO(User user) {
        return toDTO(user);
    }
}