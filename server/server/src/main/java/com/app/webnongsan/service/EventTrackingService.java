package com.app.webnongsan.service;

import com.app.webnongsan.domain.*;
import com.app.webnongsan.domain.request.*;
import com.app.webnongsan.repository.*;
import com.app.webnongsan.util.SecurityUtil;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;

// Ghi nhận hành vi người dùng (xem/tìm kiếm/giỏ hàng/impression gợi ý) làm dữ liệu nền
// cho hệ thống gợi ý AI. Các endpoint gọi vào đây là permitAll (hoạt động cả với guest qua
// sessionId ẩn danh) nên mọi method phải "khoan dung": input không hợp lệ (VD productId
// không tồn tại) thì bỏ qua im lặng, tuyệt đối không ném lỗi làm vỡ trải nghiệm chính.
@Service
@AllArgsConstructor
public class EventTrackingService {
    private final ProductViewRepository productViewRepository;
    private final SearchLogRepository searchLogRepository;
    private final RecommendationImpressionRepository impressionRepository;
    private final CartEventRepository cartEventRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

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
        for (TrackImpressionBatchDTO.Item item : dto.getItems()) {
            if (item.getProductId() == null || !this.productRepository.existsById(item.getProductId())) {
                continue;
            }
            RecommendationImpression impression = new RecommendationImpression();
            impression.setUser(user);
            impression.setSessionId(dto.getSessionId());
            impression.setProduct(this.productRepository.getReferenceById(item.getProductId()));
            impression.setPlacement(dto.getPlacement());
            impression.setAlgorithmSource(dto.getAlgorithmSource());
            impression.setRankPosition(item.getRankPosition());
            impression.setRequestId(dto.getRequestId());
            this.impressionRepository.save(impression);
        }
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
