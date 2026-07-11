package com.app.webnongsan.repository;

import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.response.product.SearchProductDTO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;


@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    boolean existsByCategoryId(Long categoryId);

    java.util.Optional<Product> findBySku(String sku);

    // Dùng cho PromotionExpiryScheduler — lấy sản phẩm đã hết hạn khuyến mãi để tự động khôi phục
    List<Product> findByPromotionExpiresAtLessThanEqual(Instant now);

    // COALESCE: không có sản phẩm nào khớp → MAX trả NULL, unbox về double ném NPE → 500.
    // Bug có sẵn nhưng chỉ lộ ra từ Smart Search (Phase B): query nhu cầu ("đồ sấy") giờ CÓ kết
    // quả semantic nên FE mới gọi max-price với productName không khớp LIKE nào.
    @Query("SELECT COALESCE(MAX(p.price), 0) FROM Product p " +
            "WHERE (:category IS NULL OR p.category.name = :category) " +
            "AND (:productName IS NULL OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :productName, '%')))")
    double getMaxPriceByCategoryAndProductName(@Param("category") String category,
                                               @Param("productName") String productName);

    @Query("SELECT new com.app.webnongsan.domain.response.product.SearchProductDTO" +
            "(p.id, p.productName, p.price, p.imageUrl, c.name, p.rating) " +
            "FROM Product p JOIN p.category c " +
            "WHERE p.id IN :ids")
    List<SearchProductDTO> findByIdInList(@Param("ids") List<Long> ids);

    // Rule-based fallback cho "sản phẩm tương tự" (Phase 0 hệ thống gợi ý):
    // cùng category, đang bán, còn hàng, loại chính nó, ưu tiên bán chạy rồi đến rating.
    // quantity > 0: sản phẩm hết hàng tạm thời (active vẫn true) không nên gợi ý cho khách.
    @Query("SELECT new com.app.webnongsan.domain.response.product.SearchProductDTO" +
            "(p.id, p.productName, p.price, p.imageUrl, c.name, p.rating, p.originalPrice, p.promotionType, " +
            "p.promoBuyQuantity, p.promoFreeQuantity, p.promoBundleQuantity, p.promoBundlePrice, p.quantity) " +
            "FROM Product p JOIN p.category c " +
            "WHERE c.id = :categoryId AND p.id <> :productId AND p.active = true AND p.quantity > 0 " +
            "ORDER BY p.sold DESC, p.rating DESC")
    List<SearchProductDTO> findSimilarByCategory(@Param("categoryId") long categoryId,
                                                 @Param("productId") long productId,
                                                 Pageable pageable);

    // Hydrate danh sách productId do Python recommendation-service trả về thành DTO đầy đủ
    // (giá/khuyến mãi/tồn kho luôn đọc mới nhất từ DB, không tin dữ liệu có thể stale từ Python;
    // item đã ẩn/xoá/hết hàng bị loại tự nhiên nhờ điều kiện active + quantity)
    @Query("SELECT new com.app.webnongsan.domain.response.product.SearchProductDTO" +
            "(p.id, p.productName, p.price, p.imageUrl, c.name, p.rating, p.originalPrice, p.promotionType, " +
            "p.promoBuyQuantity, p.promoFreeQuantity, p.promoBundleQuantity, p.promoBundlePrice, p.quantity) " +
            "FROM Product p JOIN p.category c " +
            "WHERE p.id IN :ids AND p.active = true AND p.quantity > 0")
    List<SearchProductDTO> findActiveDtoByIdIn(@Param("ids") List<Long> ids);

    // Hydrate cho Smart Search (Phase B) — KHÔNG lọc quantity: trang tìm kiếm hôm nay vẫn hiển thị
    // sản phẩm tạm hết hàng (khác rails gợi ý), lọc bớt ở đây sẽ tạo "lỗ" trong trang vì meta.total
    // đã tính theo danh sách rank từ Python.
    @Query("SELECT new com.app.webnongsan.domain.response.product.SearchProductDTO" +
            "(p.id, p.productName, p.price, p.imageUrl, c.name, p.rating, p.originalPrice, p.promotionType, " +
            "p.promoBuyQuantity, p.promoFreeQuantity, p.promoBundleQuantity, p.promoBundlePrice, p.quantity) " +
            "FROM Product p JOIN p.category c " +
            "WHERE p.id IN :ids AND p.active = true")
    List<SearchProductDTO> findActiveDtoByIdInAnyStock(@Param("ids") List<Long> ids);

    // Fallback thuần Java cho Home/Cart khi Python service down: best-seller đang bán, còn hàng
    @Query("SELECT new com.app.webnongsan.domain.response.product.SearchProductDTO" +
            "(p.id, p.productName, p.price, p.imageUrl, c.name, p.rating, p.originalPrice, p.promotionType, " +
            "p.promoBuyQuantity, p.promoFreeQuantity, p.promoBundleQuantity, p.promoBundlePrice, p.quantity) " +
            "FROM Product p JOIN p.category c " +
            "WHERE p.active = true AND p.quantity > 0 " +
            "ORDER BY p.sold DESC, p.rating DESC")
    List<SearchProductDTO> findTopSellingActive(Pageable pageable);
}
