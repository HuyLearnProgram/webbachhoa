package com.app.webnongsan.repository;

import com.app.webnongsan.domain.Cart;
import com.app.webnongsan.domain.CartId;
import com.app.webnongsan.domain.response.cart.CartItemDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CartRepository extends JpaRepository<Cart, CartId>, JpaSpecificationExecutor<Cart> {
    @Query("SELECT new com.app.webnongsan.domain.response.cart.CartItemDTO" +
            "(p.id, p.productName, p.price, p.discountPrice, p.promotionType, p.promoBuyQuantity, p.promoFreeQuantity, " +
            "p.promoBundleQuantity, p.promoBundlePrice, c.quantity, p.imageUrl, cate.name, p.quantity, c.timestamp) " +
            "FROM Cart c JOIN c.product p JOIN p.category cate " +
            "WHERE c.user.id = :userId " +
            "ORDER BY c.timestamp DESC")
    Page<CartItemDTO> findCartItemsByUserId(@Param("userId") Long userId, Pageable pageable);
    // KHÔNG nhận Pageable — đây là danh sách sản phẩm khách ĐÃ CHỌN cụ thể để checkout (productIds
    // truyền vào là toàn bộ, không phải 1 trang), áp Pageable vào trả về List (không phải Page) sẽ
    // âm thầm cắt bớt kết quả nếu giỏ hàng chọn nhiều hơn kích thước trang mặc định.
    @Query("SELECT new com.app.webnongsan.domain.response.cart.CartItemDTO" +
            "(p.id, p.productName, p.price, p.discountPrice, p.promotionType, p.promoBuyQuantity, p.promoFreeQuantity, " +
            "p.promoBundleQuantity, p.promoBundlePrice, c.quantity, p.imageUrl, cate.name, p.quantity, c.timestamp) " +
            "FROM Cart c JOIN c.product p JOIN p.category cate " +
            "WHERE c.user.id = :userId AND p.id IN :productIds " +
            "ORDER BY c.timestamp DESC")
    List<CartItemDTO> findCartItemsByUserIdAndProductId(@Param("userId") Long userId, @Param("productIds") List<Long> productIds);
    @Query("SELECT COUNT(c) FROM Cart c WHERE c.user.id = :userId")
    long countProductsByUserId(@Param("userId") Long userId);
}
