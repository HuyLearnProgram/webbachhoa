package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrackProductViewDTO {
    @Size(max = 64)
    private String sessionId;

    @NotNull(message = "productId không được để trống")
    private Long productId;

    // HOME_FEED | SEARCH_RESULT | SIMILAR | CATEGORY_PAGE | DIRECT
    @Size(max = 30)
    private String source;

    private Long referrerProductId;
}
