package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequestDTO {
    @NotBlank(message = "Tên không được để trống")
    private String name;

    @NotBlank(message = "Không được để trống email")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Không được để trống mật khẩu")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    private String password;
}
