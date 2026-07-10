package com.app.webnongsan.controller;

import com.app.webnongsan.domain.response.product.RecommendationSlateDTO;
import com.app.webnongsan.service.RecommendationService;
import com.app.webnongsan.util.annotation.ApiMessage;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

// Endpoint gợi ý cá nhân hoá (Phase 1 hệ thống gợi ý AI). permitAll — guest cũng có gợi ý
// (popularity theo sessionId); user đăng nhập được cá nhân hoá qua JWT (JWT filter vẫn chạy
// trước nên SecurityContext có sẵn dù endpoint không yêu cầu auth).
// Endpoint "sản phẩm tương tự" (PDP) giữ nguyên ở ProductController: GET products/similar/{id}.
@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class RecommendationController {
    private final RecommendationService recommendationService;

    @GetMapping("recommendations/home")
    @ApiMessage("Get home recommendations")
    public ResponseEntity<RecommendationSlateDTO> getHomeRecommendations(
            @RequestParam(value = "sessionId", required = false) String sessionId) {
        return ResponseEntity.ok(this.recommendationService.getHomeRecommendations(sessionId));
    }

    @GetMapping("recommendations/cart-suggestions")
    @ApiMessage("Get cart suggestions")
    public ResponseEntity<RecommendationSlateDTO> getCartSuggestions(
            @RequestParam(value = "productIds", required = false) List<Long> productIds,
            @RequestParam(value = "sessionId", required = false) String sessionId) {
        return ResponseEntity.ok(this.recommendationService.getCartSuggestions(productIds, sessionId));
    }

    // Phase 3: metrics experiment cho dashboard admin. Path nằm dưới /api/v2/admin/** nên rule
    // hasRole(ADMIN) sẵn có trong SecurityConfiguration đã bảo vệ — không thêm rule mới
    // (tránh pitfall thứ tự rule). Trả raw Map, FormatResponse tự bọc RestResponse 1 lần.
    @GetMapping("admin/recommendation-metrics")
    @ApiMessage("Get AI recommendation experiment metrics")
    public ResponseEntity<Map<String, Object>> getRecommendationMetrics(
            @RequestParam(value = "days", defaultValue = "30") int days) {
        Map<String, Object> report = this.recommendationService.getExperimentMetrics(days);
        if (report == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "recommendation-service không phản hồi"));
        }
        return ResponseEntity.ok(report);
    }
}
