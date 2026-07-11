package com.app.webnongsan.domain.response.recommendation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

// DTO nội bộ map response JSON của POST /search/rank (Python, snake_case) — Smart Search Phase B.
// Chỉ dùng trong SmartSearchService, không trả ra frontend.
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class PythonSearchRankResponse {
    @JsonProperty("request_id")
    private String requestId;

    // SEMANTIC_HYBRID | TFIDF_HYBRID (Python degrade) | LEXICAL_ONLY (encoder off)
    @JsonProperty("algorithm_source")
    private String algorithmSource;

    @JsonProperty("model_version")
    private String modelVersion;

    // false = cả lexical lẫn semantic đều rỗng (query rác) → Java trả NO_MATCH,
    // KHÔNG fallback LIKE (lexical_ids đã rỗng từ chính DB, gọi lại chỉ phí)
    private boolean matched;

    private List<PythonRecommendationResponse.PythonRecItem> items;
}
