package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrackRecommendationClickDTO {
    @Size(max = 64)
    private String sessionId;

    @NotBlank(message = "requestId không được để trống")
    @Size(max = 64)
    private String requestId;

    @NotNull(message = "productId không được để trống")
    private Long productId;
}
