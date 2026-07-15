package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LuckyDrawSpinRequestDTO {
    @NotNull(message = "orderId là bắt buộc")
    private Long orderId;
}
