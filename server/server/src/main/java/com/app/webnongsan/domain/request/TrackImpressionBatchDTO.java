package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Batch impression cho 1 slate gợi ý — frontend gửi khi các card thực sự lọt vào viewport
@Getter
@Setter
public class TrackImpressionBatchDTO {
    @Size(max = 64)
    private String sessionId;

    @NotBlank(message = "requestId không được để trống")
    @Size(max = 64)
    private String requestId;

    // HOME_PERSONALIZED | PDP_SIMILAR | PDP_FBT | CART_SUGGESTION
    @NotBlank(message = "placement không được để trống")
    @Size(max = 30)
    private String placement;

    // CONTENT_BASED | CO_PURCHASE | POPULARITY | CF | BANDIT_EXPLORE | RULE_BASED_FALLBACK
    @NotBlank(message = "algorithmSource không được để trống")
    @Size(max = 30)
    private String algorithmSource;

    @NotEmpty(message = "items không được để trống")
    @Size(max = 50, message = "Tối đa 50 impression mỗi lần gửi")
    private List<Item> items;

    @Getter
    @Setter
    public static class Item {
        @NotNull(message = "productId không được để trống")
        private Long productId;
        private int rankPosition;

        // Phase 3: nguồn per-item — slot explore của bandit là BANDIT_EXPLORE trong khi
        // cả slate mang source chủ đạo. Optional: null/blank thì dùng algorithmSource cấp slate.
        @Size(max = 30)
        private String algorithmSource;
    }
}
