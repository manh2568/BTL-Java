package com.truyenhay.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendOtpRequest {

    @NotBlank(message = "Email không được trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Tên đăng nhập không được trống")
    @Size(min = 3, max = 50, message = "Username từ 3-50 ký tự")
    private String username;
}
