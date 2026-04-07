package com.truyenhay.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CompleteRegisterRequest {

    @NotBlank(message = "Tên đăng nhập không được trống")
    @Size(min = 3, max = 50, message = "Username từ 3-50 ký tự")
    private String username;

    @NotBlank(message = "Email không được trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu không được trống")
    @Size(min = 8, message = "Password tối thiểu 8 ký tự")
    private String password;

    private String fullName;

    @NotBlank(message = "Mã OTP không được trống")
    @Pattern(regexp = "^\\d{6}$", message = "Mã OTP gồm đúng 6 chữ số")
    private String otp;
}
