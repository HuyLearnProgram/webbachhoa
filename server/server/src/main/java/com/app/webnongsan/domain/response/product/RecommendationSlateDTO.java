package com.app.webnongsan.domain.response.product;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

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
}
