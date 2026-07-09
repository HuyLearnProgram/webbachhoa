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

    @Query("SELECT MAX(p.price) FROM Product p " +
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
    // cùng category, đang bán, loại chính nó, ưu tiên bán chạy rồi đến rating
    @Query("SELECT new com.app.webnongsan.domain.response.product.SearchProductDTO" +
            "(p.id, p.productName, p.price, p.imageUrl, c.name, p.rating, p.originalPrice, p.promotionType, " +
            "p.promoBuyQuantity, p.promoFreeQuantity, p.promoBundleQuantity, p.promoBundlePrice) " +
            "FROM Product p JOIN p.category c " +
            "WHERE c.id = :categoryId AND p.id <> :productId AND p.active = true " +
            "ORDER BY p.sold DESC, p.rating DESC")
    List<SearchProductDTO> findSimilarByCategory(@Param("categoryId") long categoryId,
                                                 @Param("productId") long productId,
                                                 Pageable pageable);
}
