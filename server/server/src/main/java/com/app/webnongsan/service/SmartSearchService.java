package com.app.webnongsan.service;

import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.Category;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.product.SearchProductDTO;
import com.app.webnongsan.domain.response.product.SmartSearchResultDTO;
import com.app.webnongsan.domain.response.recommendation.PythonRecommendationResponse;
import com.app.webnongsan.domain.response.recommendation.PythonSearchRankResponse;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.util.PaginationHelper;
import com.app.webnongsan.util.SecurityUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// Smart Search Phase B: Java làm chủ filter cứng + lexical, Python chỉ XẾP HẠNG trong allowed_ids.
// Luồng: (1) allowed_ids = id khớp filter từ DB; (2) lexical_ids = allowed + LIKE từng từ của q;
// (3) POST Python /search/rank; (4) phân trang trên ranked list (sort tường minh → sort DB-side
// trong tập matched); (5) mọi lỗi/timeout/tắt cờ → fallback LIKE y như search cũ.
// Bất biến: q có dấu chỉ đi qua JSON body (bug dấu query param); không nới timeout bean 2.5s.
@Service
public class SmartSearchService {
    private static final Logger log = LoggerFactory.getLogger(SmartSearchService.class);

    public static final String MODE_LEXICAL_FALLBACK = "LEXICAL_FALLBACK";
    public static final String MODE_NO_MATCH = "NO_MATCH";

    private final EntityManager entityManager;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PaginationHelper paginationHelper;
    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final boolean enabled;
    private final int maxCandidates;
    private final int rankLimit;

    public SmartSearchService(EntityManager entityManager,
                              ProductRepository productRepository,
                              UserRepository userRepository,
                              PaginationHelper paginationHelper,
                              @Qualifier("recommendationRestTemplate") RestTemplate restTemplate,
                              @Value("${recommendation.service.base-url}") String baseUrl,
                              @Value("${recommendation.search.enabled:true}") boolean enabled,
                              @Value("${recommendation.search.max-candidates:2000}") int maxCandidates,
                              @Value("${recommendation.search.rank-limit:300}") int rankLimit) {
        this.entityManager = entityManager;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.paginationHelper = paginationHelper;
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
        this.enabled = enabled;
        this.maxCandidates = maxCandidates;
        this.rankLimit = rankLimit;
    }

    public SmartSearchResultDTO smartSearch(String q, Specification<Product> spec,
                                            Pageable pageable, String sessionId) {
        String query = q == null ? "" : q.trim();
        Specification<Product> safeSpec = spec != null ? spec : Specification.where(null);
        if (query.isEmpty()) {
            // Không có từ khoá thì không có gì để xếp "liên quan" — trả theo filter như cũ
            return lexicalFallback(query, safeSpec, pageable);
        }
        if (!this.enabled) {
            return lexicalFallback(query, safeSpec, pageable);
        }

        List<Long> allowedIds = findIds(safeSpec);
        if (allowedIds.isEmpty()) {
            return noMatch(pageable);
        }
        if (allowedIds.size() > this.maxCandidates) {
            // Guard tương lai catalog phình: list id quá dài thì bỏ semantic, đi thẳng LIKE
            log.info("Smart search: {} candidates vượt trần {} — dùng lexical fallback.",
                    allowedIds.size(), this.maxCandidates);
            return lexicalFallback(query, safeSpec, pageable);
        }
        List<Long> lexicalIds = findIds(safeSpec.and(nameLikeAllWords(query)));

        PythonSearchRankResponse response = callPython(query, allowedIds, lexicalIds, sessionId);
        if (response == null) {
            return lexicalFallback(query, safeSpec, pageable);
        }
        if (!response.isMatched() || response.getItems() == null || response.getItems().isEmpty()) {
            // Query rác: lexical rỗng từ chính DB + semantic không tín hiệu — gọi lại LIKE chỉ phí
            return noMatch(pageable);
        }

        List<Long> rankedIds = response.getItems().stream()
                .map(PythonRecommendationResponse.PythonRecItem::getProductId).toList();
        String requestId = response.getRequestId() != null && !response.getRequestId().isBlank()
                ? response.getRequestId() : UUID.randomUUID().toString();

        Boolean lexicalEmpty = lexicalIds.isEmpty();
        if (pageable.getSort().isSorted()) {
            // Sort tường minh (giá/rating/mới nhất...): recall thông minh + thứ tự DB-side trong tập matched
            return sortedWithinRanked(rankedIds, pageable, response.getAlgorithmSource(), requestId, lexicalEmpty);
        }
        return paginateRanked(rankedIds, pageable, response.getAlgorithmSource(), requestId, lexicalEmpty);
    }

    // ------------------------------------------------------------ bước 1+2: id từ DB theo filter

    private List<Long> findIds(Specification<Product> spec) {
        CriteriaBuilder cb = this.entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<Product> root = query.from(Product.class);
        Predicate predicate = spec.toPredicate(root, query, cb);
        query.select(root.get("id"));
        if (predicate != null) {
            query.where(predicate);
        }
        return this.entityManager.createQuery(query).getResultList();
    }

    // LIKE từng từ của q ngay trong Java (AND-of-substrings, cùng ngữ nghĩa buildProductNameFilter
    // phía FE). q đi qua JDBC param — không dính bug dấu query param; collation MySQL
    // accent-insensitive tự lo chuyện "sua" khớp "sữa".
    private Specification<Product> nameLikeAllWords(String query) {
        List<String> words = List.of(query.toLowerCase().split("\\s+"));
        return (root, cq, cb) -> cb.and(words.stream()
                .map(w -> cb.like(cb.lower(root.get("productName")), "%" + escapeLike(w) + "%", '\\'))
                .toArray(Predicate[]::new));
    }

    // JPA Criteria KHÔNG tự escape ký tự đại diện của LIKE trong pattern string — từ khoá chứa
    // '%'/'_' (VD "100% nguyên chất") sẽ bị hiểu nhầm thành wildcard, làm lexicalIds phình sai.
    private static String escapeLike(String raw) {
        return raw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    // ------------------------------------------------------------ bước 3: Python xếp hạng

    private PythonSearchRankResponse callPython(String query, List<Long> allowedIds,
                                                List<Long> lexicalIds, String sessionId) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("query", query);
            body.put("allowed_ids", allowedIds);
            body.put("lexical_ids", lexicalIds);
            body.put("session_id", sessionId != null && !sessionId.isBlank() ? sessionId : null);
            body.put("limit", this.rankLimit);
            User user = getCurrentUserOrNull();
            body.put("user_id", user != null ? user.getId() : null);
            return this.restTemplate.postForObject(
                    this.baseUrl + "/search/rank", body, PythonSearchRankResponse.class);
        } catch (Exception e) {
            log.warn("Smart search: recommendation-service không phản hồi, fallback LIKE: {}", e.getMessage());
            return null;
        }
    }

    // ------------------------------------------------------------ bước 4: phân trang

    // Relevance (không sort tường minh): phân trang trên ranked list, hydrate CHỈ slice trang
    // hiện tại, giữ nguyên thứ tự Python trả (pattern hydrate của RecommendationService)
    private SmartSearchResultDTO paginateRanked(List<Long> rankedIds, Pageable pageable,
                                                String mode, String requestId, Boolean lexicalEmpty) {
        int total = rankedIds.size();
        int from = (int) Math.min(pageable.getOffset(), total);
        int to = Math.min(from + pageable.getPageSize(), total);
        List<Long> pageIds = rankedIds.subList(from, to);

        List<SearchProductDTO> content;
        if (pageIds.isEmpty()) {
            content = List.of();
        } else {
            Map<Long, SearchProductDTO> byId = this.productRepository
                    .findActiveDtoByIdInAnyStock(pageIds).stream()
                    .collect(Collectors.toMap(SearchProductDTO::getId, Function.identity()));
            content = pageIds.stream().map(byId::get).filter(Objects::nonNull).toList();
        }
        PaginationDTO page = this.paginationHelper.buildPaginationFromList(content, total, pageable);
        return new SmartSearchResultDTO(page.getMeta(), page.getResult(), mode, requestId, lexicalEmpty);
    }

    // Sort tường minh trong tập matched: WHERE id IN (rankedIds) ORDER BY <sort> — criteria
    // construct SearchProductDTO 13-arg y hệt findActiveDtoByIdIn (đừng đổi thứ tự cột)
    private SmartSearchResultDTO sortedWithinRanked(List<Long> rankedIds, Pageable pageable,
                                                    String mode, String requestId, Boolean lexicalEmpty) {
        CriteriaBuilder cb = this.entityManager.getCriteriaBuilder();
        CriteriaQuery<SearchProductDTO> query = cb.createQuery(SearchProductDTO.class);
        Root<Product> root = query.from(Product.class);
        Join<Product, Category> category = root.join("category");
        query.select(cb.construct(SearchProductDTO.class,
                root.get("id"), root.get("productName"), root.get("price"), root.get("imageUrl"),
                category.get("name"), root.get("rating"), root.get("originalPrice"),
                root.get("promotionType"), root.get("promoBuyQuantity"), root.get("promoFreeQuantity"),
                root.get("promoBundleQuantity"), root.get("promoBundlePrice"), root.get("quantity")));
        // Phải lọc active=true như findActiveDtoByIdInAnyStock (nhánh không-sort dùng) — thiếu
        // điều kiện này thì đổi sort tường minh (giá/rating...) sẽ lộ sản phẩm đã ẩn, không nhất
        // quán với nhánh mặc định "Liên quan" trên cùng 1 rankedIds.
        query.where(cb.and(root.get("id").in(rankedIds), cb.isTrue(root.get("active"))));

        List<Order> orders = new ArrayList<>();
        for (Sort.Order sortOrder : pageable.getSort()) {
            orders.add(sortOrder.isAscending()
                    ? cb.asc(root.get(sortOrder.getProperty()))
                    : cb.desc(root.get(sortOrder.getProperty())));
        }
        query.orderBy(orders);

        List<SearchProductDTO> content = this.entityManager.createQuery(query)
                .setFirstResult((int) pageable.getOffset())
                .setMaxResults(pageable.getPageSize())
                .getResultList();
        PaginationDTO page = this.paginationHelper.buildPaginationFromList(content, rankedIds.size(), pageable);
        return new SmartSearchResultDTO(page.getMeta(), page.getResult(), mode, requestId, lexicalEmpty);
    }

    // ------------------------------------------------------------ bước 5: fallback & no-match

    // Y hệt hành vi search hôm nay: filter + LIKE từng từ, sort theo Pageable, đếm total từ DB.
    // Dùng criteria DTO 13-arg (khác ProductService.searchProduct 11-arg: cần quantity cho nút
    // thêm nhanh vào giỏ của ProductCard — bài học Phase 1 "Sản phẩm đang tạm hết hàng" sai).
    private SmartSearchResultDTO lexicalFallback(String query, Specification<Product> spec,
                                                 Pageable pageable) {
        Specification<Product> withName = query.isEmpty() ? spec : spec.and(nameLikeAllWords(query));

        CriteriaBuilder cb = this.entityManager.getCriteriaBuilder();
        CriteriaQuery<SearchProductDTO> cq = cb.createQuery(SearchProductDTO.class);
        Root<Product> root = cq.from(Product.class);
        Join<Product, Category> category = root.join("category");
        Predicate predicate = withName.toPredicate(root, cq, cb);
        cq.select(cb.construct(SearchProductDTO.class,
                root.get("id"), root.get("productName"), root.get("price"), root.get("imageUrl"),
                category.get("name"), root.get("rating"), root.get("originalPrice"),
                root.get("promotionType"), root.get("promoBuyQuantity"), root.get("promoFreeQuantity"),
                root.get("promoBundleQuantity"), root.get("promoBundlePrice"), root.get("quantity")));
        if (predicate != null) {
            cq.where(predicate);
        }
        List<Order> orders = new ArrayList<>();
        for (Sort.Order sortOrder : pageable.getSort()) {
            orders.add(sortOrder.isAscending()
                    ? cb.asc(root.get(sortOrder.getProperty()))
                    : cb.desc(root.get(sortOrder.getProperty())));
        }
        if (!orders.isEmpty()) {
            cq.orderBy(orders);
        }
        List<SearchProductDTO> content = this.entityManager.createQuery(cq)
                .setFirstResult((int) pageable.getOffset())
                .setMaxResults(pageable.getPageSize())
                .getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Product> countRoot = countQuery.from(Product.class);
        countQuery.select(cb.count(countRoot));
        Predicate countPredicate = withName.toPredicate(countRoot, countQuery, cb);
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }
        long total = this.entityManager.createQuery(countQuery).getSingleResult();

        PaginationDTO page = this.paginationHelper.buildPaginationFromList(content, total, pageable);
        // lexicalEmpty=null: nhánh này chính LÀ lexical, không có thông tin rescue từ Python
        return new SmartSearchResultDTO(page.getMeta(), page.getResult(),
                MODE_LEXICAL_FALLBACK, UUID.randomUUID().toString(), null);
    }

    private SmartSearchResultDTO noMatch(Pageable pageable) {
        PaginationDTO page = this.paginationHelper.buildPaginationFromList(List.of(), 0, pageable);
        return new SmartSearchResultDTO(page.getMeta(), page.getResult(),
                MODE_NO_MATCH, UUID.randomUUID().toString(), true);
    }

    private User getCurrentUserOrNull() {
        String email = SecurityUtil.getCurrentUserLogin().orElse(null);
        if (email == null || email.isEmpty() || "anonymousUser".equals(email)) {
            return null;
        }
        return this.userRepository.findByEmail(email);
    }
}
