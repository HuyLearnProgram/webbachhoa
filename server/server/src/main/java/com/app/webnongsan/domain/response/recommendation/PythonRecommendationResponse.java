package com.app.webnongsan.domain.response.recommendation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

// DTO nội bộ map response JSON của Python recommendation-service (snake_case).
// Chỉ dùng trong RecommendationService, không trả ra frontend.
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class PythonRecommendationResponse {
    // Phase 3: Python sinh request_id để join decision bandit với impressions khi poll reward.
    // Java dùng lại giá trị này làm requestId của slate thay vì tự sinh UUID.
    @JsonProperty("request_id")
    private String requestId;

    @JsonProperty("algorithm_source")
    private String algorithmSource;

    @JsonProperty("model_version")
    private String modelVersion;

    private List<PythonRecItem> items;

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PythonRecItem {
        @JsonProperty("product_id")
        private long productId;

        private double score;
        private String source;
    }
}
