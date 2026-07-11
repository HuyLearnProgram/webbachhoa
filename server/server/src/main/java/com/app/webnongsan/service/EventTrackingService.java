package com.app.webnongsan.service;

import com.app.webnongsan.domain.*;
import com.app.webnongsan.domain.request.*;
import com.app.webnongsan.repository.*;
import com.app.webnongsan.util.SecurityUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

// Ghi nhận hành vi người dùng (xem/tìm kiếm/giỏ hàng/impression gợi ý) làm dữ liệu nền
// cho hệ thống gợi ý AI. Các endpoint gọi vào đây là permitAll (hoạt động cả với guest qua
// sessionId ẩn danh) nên mọi method phải "khoan dung": input không hợp lệ (VD productId
// không tồn tại) thì bỏ qua im lặng, tuyệt đối không ném lỗi làm vỡ trải nghiệm chính.
@Service
public class EventTrackingService {
    private static final Logger log = LoggerFactory.getLogger(EventTrackingService.class);

    private final ProductViewRepository productViewRepository;
    private final SearchLogRepository searchLogRepository;
    private final RecommendationImpressionRepository impressionRepository;
    private final CartEventRepository cartEventRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final long attributionWindowDays;

    public EventTrackingService(ProductViewRepository productViewRepository,
                                SearchLogRepository searchLogRepository,
                                RecommendationImpressionRepository impressionRepository,
                                CartEventRepository cartEventRepository,
                                ProductRepository productRepository,
                                UserRepository userRepository,
                                @Value("${recommendation.attribution-window-days:7}") long attributionWindowDays) {
        this.productViewRepository = productViewRepository;
        this.searchLogRepository = searchLogRepository;
        this.impressionRepository = impressionRepository;
        this.cartEventRepository = cartEventRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.attributionWindowDays = attributionWindowDays;
    }

    private User getCurrentUserOrNull() {
        String email = SecurityUtil.getCurrentUserLogin().orElse(null);
        if (email == null || email.isEmpty() || "anonymousUser".equals(email)) {
            return null;
        }
        return this.userRepository.findByEmail(email);
    }

    // Bỏ dấu + lowercase ở tầng Java lúc ghi — mọi matching sau này dùng cột chuẩn hoá,
    // không dựa vào filter DB (dấu tiếng Việt qua spring-filter/param từng bị hỏng)
    public static String normalizeKeyword(String keyword) {
        if (keyword == null) return null;
        String noDiacritics = Normalizer.normalize(keyword, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return noDiacritics.toLowerCase(Locale.ROOT).trim();
    }

    public void trackProductView(TrackProductViewDTO dto) {
        if (dto.getProductId() == null || !this.productRepository.existsById(dto.getProductId())) {
            return;
        }
        ProductView view = new ProductView();
        view.setUser(getCurrentUserOrNull());
        view.setSessionId(dto.getSessionId());
        view.setProduct(this.productRepository.getReferenceById(dto.getProductId()));
        view.setSource(dto.getSource());
        view.setReferrerProductId(dto.getReferrerProductId());
        this.productViewRepository.save(view);
    }

    // Tạo mới SearchLog (trả về id để frontend cập nhật clickedProductId sau),
    // hoặc cập nhật clickedProductId nếu có searchLogId
    public Long trackSearch(TrackSearchDTO dto) {
        if (dto.getSearchLogId() != null) {
            this.searchLogRepository.findById(dto.getSearchLogId()).ifPresent(log -> {
                if (log.getClickedProductId() == null && dto.getClickedProductId() != null) {
                    log.setClickedProductId(dto.getClickedProductId());
                    this.searchLogRepository.save(log);
                }
            });
            return dto.getSearchLogId();
        }
        SearchLog log = new SearchLog();
        log.setUser(getCurrentUserOrNull());
        log.setSessionId(dto.getSessionId());
        log.setKeyword(dto.getKeyword());
        log.setKeywordNormalized(normalizeKeyword(dto.getKeyword()));
        log.setResultCount(dto.getResultCount());
        log.setClickedProductId(dto.getClickedProductId());
        return this.searchLogRepository.save(log).getId();
    }

    public void trackCartEvent(TrackCartEventDTO dto) {
        if (dto.getProductId() == null || !this.productRepository.existsById(dto.getProductId())) {
            return;
        }
        CartEvent event = new CartEvent();
        event.setUser(getCurrentUserOrNull());
        event.setSessionId(dto.getSessionId());
        event.setProduct(this.productRepository.getReferenceById(dto.getProductId()));
        event.setEventType(dto.getEventType());
        event.setQuantity(dto.getQuantity());
        this.cartEventRepository.save(event);
    }

    public void trackImpressions(TrackImpressionBatchDTO dto) {
        User user = getCurrentUserOrNull();
        // Gộp existsById + save của từng item (N+1) thành 1 findAllById + 1 saveAll —
        // slate 12-50 sản phẩm trước đây tốn tới 100 query/lần rail vào viewport.
        List<Long> productIds = dto.getItems().stream()
                .map(TrackImpressionBatchDTO.Item::getProductId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Set<Long> existingIds = this.productRepository.findAllById(productIds).stream()
                .map(Product::getId)
                .collect(Collectors.toSet());

        List<RecommendationImpression> impressions = new ArrayList<>();
        for (TrackImpressionBatchDTO.Item item : dto.getItems()) {
            if (item.getProductId() == null || !existingIds.contains(item.getProductId())) {
                continue;
            }
            RecommendationImpression impression = new RecommendationImpression();
            impression.setUser(user);
            impression.setSessionId(dto.getSessionId());
            impression.setProduct(this.productRepository.getReferenceById(item.getProductId()));
            impression.setPlacement(dto.getPlacement());
            // Phase 3: ưu tiên source per-item (slot explore của bandit = BANDIT_EXPLORE),
            // fallback source cấp slate cho client cũ/fallback rule-based
            impression.setAlgorithmSource(
                    item.getAlgorithmSource() != null && !item.getAlgorithmSource().isBlank()
                            ? item.getAlgorithmSource() : dto.getAlgorithmSource());
            impression.setRankPosition(item.getRankPosition());
            impression.setRequestId(dto.getRequestId());
            impressions.add(impression);
        }
        this.impressionRepository.saveAll(impressions);
    }

    public void trackRecommendationClick(TrackRecommendationClickDTO dto) {
        this.impressionRepository
                .findFirstByRequestIdAndProductIdOrderByShownAtDesc(dto.getRequestId(), dto.getProductId())
                .ifPresent(impression -> {
                    if (!impression.isClicked()) {
                        impression.setClicked(true);
                        impression.setClickedAt(Instant.now());
                        this.impressionRepository.save(impression);
                    }
                });
    }

    // Phase 3 — conversion attribution: gọi ngay sau khi tạo đơn thành công (kể cả COD chưa
    // thanh toán — tín hiệu "ý định mua" cho bandit học nhanh; đơn huỷ sau đó chấp nhận nhiễu).
    // Last-touch: mỗi sản phẩm trong đơn chỉ đánh dấu 1 impression gần nhất (ưu tiên đã click)
    // trong cửa sổ attribution — tránh thổi phồng conversion rate. Tìm theo user trước, session
    // sau (bắt cả impression lúc còn guest chưa merge). Lỗi bất kỳ chỉ log warn, tuyệt đối
    // không phá luồng đặt hàng.
    @Transactional
    public void attributeOrderConversions(Long userId, String sessionId, Long orderId, List<Long> productIds) {
        try {
            if (orderId == null || productIds == null || productIds.isEmpty()) {
                return;
            }
            Instant cutoff = Instant.now().minus(this.attributionWindowDays, ChronoUnit.DAYS);
            for (Long productId : productIds) {
                if (productId == null) continue;
                Optional<RecommendationImpression> impression = userId != null
                        ? this.impressionRepository
                            .findFirstByUserIdAndProductIdAndConvertedFalseAndShownAtAfterOrderByClickedDescShownAtDesc(
                                    userId, productId, cutoff)
                        : Optional.empty();
                if (impression.isEmpty() && sessionId != null && !sessionId.isBlank()) {
                    impression = this.impressionRepository
                            .findFirstBySessionIdAndProductIdAndConvertedFalseAndShownAtAfterOrderByClickedDescShownAtDesc(
                                    sessionId, productId, cutoff);
                }
                impression.ifPresent(i -> {
                    i.setConverted(true);
                    i.setConvertedOrderId(orderId);
                    this.impressionRepository.save(i);
                });
            }
        } catch (Exception e) {
            log.warn("Conversion attribution lỗi (bỏ qua, không ảnh hưởng đơn hàng {}): {}", orderId, e.getMessage());
        }
    }

    // Nối lịch sử hành vi ẩn danh (theo sessionId) vào user thật ngay sau khi login
    @Transactional
    public void mergeSessionIntoCurrentUser(String sessionId) {
        User user = getCurrentUserOrNull();
        if (user == null || sessionId == null || sessionId.isEmpty()) {
            return;
        }
        this.productViewRepository.mergeSessionIntoUser(sessionId, user);
        this.searchLogRepository.mergeSessionIntoUser(sessionId, user);
        this.impressionRepository.mergeSessionIntoUser(sessionId, user);
        this.cartEventRepository.mergeSessionIntoUser(sessionId, user);
    }
}
