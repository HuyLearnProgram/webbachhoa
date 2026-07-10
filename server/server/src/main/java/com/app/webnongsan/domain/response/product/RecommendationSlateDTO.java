package com.app.webnongsan.domain.response.product;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

// 1 "slate" gợi ý trả về cho frontend: kèm requestId + algorithmSource để frontend
// gửi ngược lại khi log impression/click (vòng feedback loop của hệ thống gợi ý)
@Getter
@Setter
@AllArgsConstructor
public class RecommendationSlateDTO {
    private String requestId;
    private String algorithmSource;
    private String placement;
    private List<SearchProductDTO> items;

    // Phase 3: nguồn thuật toán per-item (productId -> source) — slot explore của bandit mang
    // BANDIT_EXPLORE khác với source cấp slate. Null với fallback rule-based.
    // Không thêm field vào SearchProductDTO vì đó là constructor-projection của query JPA.
    private Map<Long, String> itemSources;

    public RecommendationSlateDTO(String requestId, String algorithmSource, String placement,
                                  List<SearchProductDTO> items) {
        this(requestId, algorithmSource, placement, items, null);
    }
}
