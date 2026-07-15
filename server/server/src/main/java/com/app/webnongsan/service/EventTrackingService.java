package com.app.webnongsan.service;

import com.app.webnongsan.domain.*;
import com.app.webnongsan.domain.request.*;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.product.SearchProductDTO;
import com.app.webnongsan.repository.*;
import com.app.webnongsan.util.PaginationHelper;
import com.app.webnongsan.util.SecurityUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
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
    private final PaginationHelper paginationHelper;
    private final long attributionWindowDays;

    public EventTrackingService(ProductViewRepository productViewRepository,
                                SearchLogRepository searchLogRepository,
                                RecommendationImpressionRepository impressionRepository,
                                CartEventRepository cartEventRepository,
                                ProductRepository productRepository,
                                UserRepository userRepository,
                                PaginationHelper paginationHelper,
                                @Value("${recommendation.attribution-window-days:7}") long attributionWindowDays) {
        this.productViewRepository = productViewRepository;
        this.searchLogRepository = searchLogRepository;
        this.impressionRepository = impressionRepository;
        this.cartEventRepository = cartEventRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.paginationHelper = paginationHelper;
        this.attributionWindowDays = attributionWindowDays;
    }

    // true nếu request hiện tại là chủ của searchLog: đúng user đã đăng nhập tạo ra nó, hoặc
    // đúng session (guest chưa đăng nhập / vẫn cùng phiên trước khi merge vào user).
    private boolean ownsSearchLog(SearchLog log, String requestSessionId) {
        User currentUser = getCurrentUserOrNull();
        if (currentUser != null && log.getUser() != null) {
            return currentUser.getId() == log.getUser().getId();
        }
        return requestSessionId != null && !requestSessionId.isBlank()
                && requestSessionId.equals(log.getSessionId());
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

    // Trang "Sản phẩm đã xem" (member) — đọc lại ProductView của user hiện tại, gom theo sản
    // phẩm + sắp xếp theo lần xem gần nhất (ở tầng repository), rồi hydrate giá/khuyến mãi/tồn
    // kho mới nhất từ DB (không tin dữ liệu cũ tại thời điểm xem). Guest (chưa đăng nhập) không
    // có lịch sử theo user (chỉ có theo sessionId) → trả danh sách rỗng, không lỗi.
    public PaginationDTO getRecentlyViewedByCurrentUser(Pageable pageable) {
        User user = getCurrentUserOrNull();
        if (user == null) {
            return this.paginationHelper.buildPaginationFromList(List.of(), 0, pageable);
        }
        Page<Long> idPage = this.productViewRepository.findDistinctProductIdsByUserId(user.getId(), pageable);
        List<SearchProductDTO> items;
        if (idPage.getContent().isEmpty()) {
            items = List.of();
        } else {
            // IN () rỗng ném lỗi JPQL — luôn guard trước khi gọi (bài học từ SmartSearchService)
            Map<Long, SearchProductDTO> byId = this.productRepository
                    .findActiveDtoByIdInAnyStock(idPage.getContent()).stream()
                    .collect(Collectors.toMap(SearchProductDTO::getId, Function.identity()));
            items = idPage.getContent().stream().map(byId::get).filter(Objects::nonNull).toList();
        }
        return this.paginationHelper.buildPaginationFromList(items, idPage.getTotalElements(), pageable);
    }

    // Tạo mới SearchLog (trả về id để frontend cập nhật clickedProductId sau),
    // hoặc cập nhật clickedProductId nếu có searchLogId
    public Long trackSearch(TrackSearchDTO dto) {
        if (dto.getSearchLogId() != null) {
            // Endpoint permitAll + searchLogId là số tự tăng dễ đoán → phải xác nhận đúng chủ
            // trước khi cho update, nếu không ai cũng có thể ghi đè clickedProductId của log
            // người khác (làm nhiễu CTR/vị trí click trong dashboard).
            this.searchLogRepository.findById(dto.getSearchLogId())
                    .filter(log -> ownsSearchLog(log, dto.getSessionId()))
                    .ifPresent(log -> {
                        if (log.getClickedProductId() == null && dto.getClickedProductId() != null) {
                            log.setClickedProductId(dto.getClickedProductId());
                            log.setClickedPosition(dto.getClickedPosition());
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
        log.setSearchMode(dto.getSearchMode());
        log.setLexicalEmpty(dto.getLexicalEmpty());
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

    // ===== Smart Search Phase C — metrics "Chất lượng tìm kiếm" (thuần Java từ search_logs,
    // sống độc lập với Python: recommendation-service chết thì số liệu này vẫn phục vụ) =====
    public Map<String, Object> searchMetrics(int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        long total = this.searchLogRepository.countBySearchedAtGreaterThanEqual(since);
        long zero = this.searchLogRepository.countBySearchedAtGreaterThanEqualAndResultCount(since, 0);
        long rescued = this.searchLogRepository.countRescuedSince(since);

        List<Map<String, Object>> byMode = new ArrayList<>();
        for (Object[] row : this.searchLogRepository.aggregateByMode(since)) {
            long searches = ((Number) row[1]).longValue();
            long clicks = row[2] != null ? ((Number) row[2]).longValue() : 0;
            Map<String, Object> mode = new LinkedHashMap<>();
            // null = search đi đường LIKE cũ (client cũ hoặc FE fallback khi endpoint mới chết)
            mode.put("mode", row[0] != null ? row[0] : "LEGACY_LIKE");
            mode.put("searches", searches);
            mode.put("clicks", clicks);
            mode.put("ctr", searches > 0 ? (double) clicks / searches : null);
            mode.put("avgClickedPosition", row[3] != null ? ((Number) row[3]).doubleValue() : null);
            byMode.add(mode);
        }
        byMode.sort((a, b) -> Long.compare((long) b.get("searches"), (long) a.get("searches")));

        List<Map<String, Object>> topZero = new ArrayList<>();
        for (Object[] row : this.searchLogRepository.topZeroResultKeywords(since, PageRequest.of(0, 10))) {
            Map<String, Object> kw = new LinkedHashMap<>();
            kw.put("keyword", row[1] != null ? row[1] : row[0]); // ưu tiên bản có dấu
            kw.put("count", ((Number) row[2]).longValue());
            topZero.add(kw);
        }

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("days", days);
        report.put("totalSearches", total);
        report.put("zeroResultRate", total > 0 ? (double) zero / total : null);
        report.put("semanticRescueCount", rescued);
        report.put("semanticRescueRate", total > 0 ? (double) rescued / total : null);
        report.put("byMode", byMode);
        report.put("topZeroResultKeywords", topZero);
        return report;
    }

    // ===== Autocomplete "Mọi người cũng tìm" — cache in-memory 5 phút theo prefix chuẩn hoá
    // (SearchLog đổi chậm, đập DB mỗi keystroke của mọi khách là lãng phí) =====
    private static final long SUGGESTION_CACHE_TTL_MS = 5 * 60 * 1000;
    private static final int SUGGESTION_CACHE_MAX_ENTRIES = 500;
    private final Map<String, Object[]> suggestionCache = new ConcurrentHashMap<>(); // prefix -> [expireAtMs, List<String>]

    @SuppressWarnings("unchecked")
    public List<String> searchSuggestions(String prefix, int limit) {
        String normalized = normalizeKeyword(prefix);
        if (normalized == null || normalized.length() < 2) {
            return List.of();
        }
        int safeLimit = Math.max(1, Math.min(limit, 10));
        String cacheKey = normalized + "|" + safeLimit;
        long now = System.currentTimeMillis();
        Object[] cached = this.suggestionCache.get(cacheKey);
        if (cached != null && (long) cached[0] > now) {
            return (List<String>) cached[1];
        }
        // Escape ký tự wildcard của LIKE — prefix do người dùng gõ tự do
        String escaped = normalized.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        List<String> suggestions = this.searchLogRepository
                .suggestKeywords(escaped, PageRequest.of(0, safeLimit));
        if (this.suggestionCache.size() >= SUGGESTION_CACHE_MAX_ENTRIES) {
            // Chỉ dọn entry đã hết hạn — clear() toàn bộ sẽ làm mọi request đồng thời cùng miss
            // cache và cùng đập DB một lúc (cache stampede), dù traffic thấp vẫn là anti-pattern.
            this.suggestionCache.entrySet().removeIf(e -> (long) e.getValue()[0] <= now);
        }
        this.suggestionCache.put(cacheKey, new Object[]{now + SUGGESTION_CACHE_TTL_MS, suggestions});
        return suggestions;
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
