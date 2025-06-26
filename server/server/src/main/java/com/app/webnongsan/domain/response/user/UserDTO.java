package com.app.webnongsan.domain.response.user;

import lombok.Getter;
import lombok.Setter;

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
}
