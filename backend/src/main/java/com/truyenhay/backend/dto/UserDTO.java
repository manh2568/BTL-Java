package com.truyenhay.backend.dto;

import com.truyenhay.backend.entity.Role;
import lombok.Data;

@Data
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String avatarUrl;
    private Role role;
}