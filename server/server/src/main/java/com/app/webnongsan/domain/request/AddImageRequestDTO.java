package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddImageRequestDTO {
    @NotBlank(message = "Đường dẫn ảnh không được để trống")
    private String imageUrl;
}
