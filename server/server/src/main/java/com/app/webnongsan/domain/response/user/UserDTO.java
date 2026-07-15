package com.app.webnongsan.domain.response.user;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UserDTO {
    private long id;

    private String name;

    private String email;

    private int status;

    private String phone;

    private String address;

    private String avatarUrl;

    private String provider;

    private String providerId;

    // Phục vụ voucher sinh nhật tự động — user tự cập nhật ở trang cá nhân (tuỳ chọn)
    private LocalDate birthday;
}
