package com.app.webnongsan.domain.response.user;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateUserDTO {
    private long id;

    private String name;

    private String email;

    private int status;

}
