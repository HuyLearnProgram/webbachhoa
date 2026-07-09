package com.app.webnongsan.service;

import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.response.product.RecommendationSlateDTO;
import com.app.webnongsan.domain.response.product.SearchProductDTO;
import com.app.webnongsan.repository.ProductRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

// Phase 0 hệ thống gợi ý: rule-based thuần Java (cùng category, ưu tiên bán chạy/rating).
// Từ Phase 1 service này sẽ proxy sang Python recommendation-service (FastAPI, port 8000)
// với timeout ngắn + fallback về chính logic rule-based này khi service down.
@Service
@AllArgsConstructor
public class RecommendationService {
    private static final int SIMILAR_LIMIT = 12;

    private final ProductRepository productRepository;

    public RecommendationSlateDTO getSimilarProducts(long productId) {
        Product product = this.productRepository.findById(productId).orElse(null);
        List<SearchProductDTO> items = (product == null || product.getCategory() == null)
                ? List.of()
                : this.productRepository.findSimilarByCategory(
                        product.getCategory().getId(), productId, PageRequest.of(0, SIMILAR_LIMIT));
        return new RecommendationSlateDTO(
                UUID.randomUUID().toString(),
                "RULE_BASED_FALLBACK",
                "PDP_SIMILAR",
                items
        );
    }
}
