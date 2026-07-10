package com.app.webnongsan.service;

import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.response.product.RecommendationSlateDTO;
import com.app.webnongsan.domain.response.product.SearchProductDTO;
import com.app.webnongsan.domain.response.recommendation.PythonRecommendationResponse;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.util.SecurityUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// Phase 1 hệ thống gợi ý: proxy sang Python recommendation-service (content-based + co-purchase
// + popularity + MMR). Python chỉ trả productId+score, service này hydrate DTO đầy đủ từ DB
// (giá/khuyến mãi/active luôn mới nhất). Mọi lỗi/timeout/kết quả rỗng từ Python đều rơi về
// fallback rule-based thuần Java — Home/PDP/Cart không bao giờ vỡ vì Python down.
// algorithmSource luôn ghi đúng nguồn thật (fallback ghi RULE_BASED_FALLBACK) để CTR theo nguồn không nhiễu.
@Service
public class RecommendationService {
    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);

    private static final int SIMILAR_LIMIT = 12;
    private static final int HOME_LIMIT = 12;
    private static final int CART_LIMIT = 6;
    private static final String RULE_BASED_FALLBACK = "RULE_BASED_FALLBACK";

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final String baseUrl;

    public RecommendationService(ProductRepository productRepository,
                                 UserRepository userRepository,
                                 @Qualifier("recommendationRestTemplate") RestTemplate restTemplate,
                                 @Value("${recommendation.service.base-url}") String baseUrl) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    public RecommendationSlateDTO getSimilarProducts(long productId, String sessionId) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(this.baseUrl)
                .path("/recommend/similar/" + productId)
                .queryParam("k", SIMILAR_LIMIT);
        appendIdentity(builder, sessionId);
        RecommendationSlateDTO fromPython = callPython(builder.toUriString(), "PDP_SIMILAR");
        return fromPython != null ? fromPython : fallbackSimilar(productId);
    }

    public RecommendationSlateDTO getHomeRecommendations(String sessionId) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(this.baseUrl)
                .path("/recommend/home")
                .queryParam("k", HOME_LIMIT);
        appendIdentity(builder, sessionId);
        RecommendationSlateDTO fromPython = callPython(builder.toUriString(), "HOME_PERSONALIZED");
        return fromPython != null ? fromPython
                : fallbackBestSeller("HOME_PERSONALIZED", HOME_LIMIT, List.of());
    }

    public RecommendationSlateDTO getCartSuggestions(List<Long> productIds, String sessionId) {
        List<Long> cartIds = productIds == null ? List.of()
                : productIds.stream().filter(Objects::nonNull).distinct().toList();
        if (cartIds.isEmpty()) {
            return fallbackBestSeller("CART_SUGGESTION", CART_LIMIT, cartIds);
        }
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(this.baseUrl)
                .path("/recommend/cart")
                .queryParam("product_ids", cartIds.stream().map(String::valueOf).collect(Collectors.joining(",")))
                .queryParam("k", CART_LIMIT);
        appendIdentity(builder, sessionId);
        RecommendationSlateDTO fromPython = callPython(builder.toUriString(), "CART_SUGGESTION");
        return fromPython != null ? fromPython
                : fallbackBestSeller("CART_SUGGESTION", CART_LIMIT, cartIds);
    }

    // Phase 2: mọi placement gửi session_id + user_id sang Python cho CF cá nhân hoá + fatigue decay.
    // userId chỉ derive từ JWT — không bao giờ nhận từ client (chặn IDOR xem hồ sơ người khác)
    private void appendIdentity(UriComponentsBuilder builder, String sessionId) {
        if (sessionId != null && !sessionId.isBlank()) {
            builder.queryParam("session_id", sessionId);
        }
        User user = getCurrentUserOrNull();
        if (user != null) {
            builder.queryParam("user_id", user.getId());
        }
    }

    // Gọi Python + hydrate; trả null khi lỗi/timeout/rỗng để caller quyết định fallback
    private RecommendationSlateDTO callPython(String url, String placement) {
        try {
            PythonRecommendationResponse response =
                    this.restTemplate.getForObject(url, PythonRecommendationResponse.class);
            if (response == null || response.getItems() == null || response.getItems().isEmpty()) {
                return null;
            }
            List<SearchProductDTO> items = hydrate(response.getItems());
            if (items.isEmpty()) {
                return null;
            }
            return new RecommendationSlateDTO(
                    UUID.randomUUID().toString(), response.getAlgorithmSource(), placement, items);
        } catch (Exception e) {
            log.warn("Recommendation-service không phản hồi ({}), fallback rule-based: {}",
                    placement, e.getMessage());
            return null;
        }
    }

    // Giữ đúng thứ tự rank của Python; item đã ẩn/xoá bị loại tự nhiên (findActiveDtoByIdIn)
    private List<SearchProductDTO> hydrate(List<PythonRecommendationResponse.PythonRecItem> recItems) {
        List<Long> ids = recItems.stream().map(PythonRecommendationResponse.PythonRecItem::getProductId).toList();
        Map<Long, SearchProductDTO> byId = this.productRepository.findActiveDtoByIdIn(ids).stream()
                .collect(Collectors.toMap(SearchProductDTO::getId, Function.identity()));
        return ids.stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    // Fallback PDP: rule-based Phase 0 (cùng category, ưu tiên bán chạy/rating)
    private RecommendationSlateDTO fallbackSimilar(long productId) {
        Product product = this.productRepository.findById(productId).orElse(null);
        List<SearchProductDTO> items = (product == null || product.getCategory() == null)
                ? List.of()
                : this.productRepository.findSimilarByCategory(
                        product.getCategory().getId(), productId, PageRequest.of(0, SIMILAR_LIMIT));
        return new RecommendationSlateDTO(
                UUID.randomUUID().toString(), RULE_BASED_FALLBACK, "PDP_SIMILAR", items);
    }

    // Fallback Home/Cart: best-seller đang bán, loại các sản phẩm đã có trong giỏ
    private RecommendationSlateDTO fallbackBestSeller(String placement, int limit, List<Long> excludeIds) {
        List<SearchProductDTO> items = this.productRepository
                .findTopSellingActive(PageRequest.of(0, limit + excludeIds.size())).stream()
                .filter(p -> !excludeIds.contains(p.getId()))
                .limit(limit)
                .toList();
        return new RecommendationSlateDTO(UUID.randomUUID().toString(), RULE_BASED_FALLBACK, placement, items);
    }

    private User getCurrentUserOrNull() {
        String email = SecurityUtil.getCurrentUserLogin().orElse(null);
        if (email == null || email.isEmpty() || "anonymousUser".equals(email)) {
            return null;
        }
        return this.userRepository.findByEmail(email);
    }
}
