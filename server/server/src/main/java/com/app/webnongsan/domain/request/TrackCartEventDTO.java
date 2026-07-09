package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrackCartEventDTO {
    @Size(max = 64)
    private String sessionId;

    @NotNull(message = "productId không được để trống")
    private Long productId;

    @NotBlank(message = "eventType không được để trống")
    @Pattern(regexp = "ADD|REMOVE|UPDATE_QTY", message = "eventType không hợp lệ")
    private String eventType;

    private int quantity;
}
