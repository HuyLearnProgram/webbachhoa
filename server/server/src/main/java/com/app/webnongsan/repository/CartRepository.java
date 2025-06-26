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
            "(p.id, p.productName, p.price, c.quantity, p.imageUrl, cate.name, p.quantity) " +
            "FROM Cart c JOIN c.product p JOIN p.category cate " +
            "WHERE c.user.id = :userId " +
            "ORDER BY c.timestamp DESC")
    Page<CartItemDTO> findCartItemsByUserId(@Param("userId") Long userId, Pageable pageable);
    @Query("SELECT new com.app.webnongsan.domain.response.cart.CartItemDTO" +
            "(p.id, p.productName, p.price, c.quantity, p.imageUrl, cate.name, p.quantity) " +
            "FROM Cart c JOIN c.product p JOIN p.category cate " +
            "WHERE c.user.id = :userId AND p.id IN :productIds " +
            "ORDER BY c.timestamp DESC")
    List<CartItemDTO> findCartItemsByUserIdAndProductId(@Param("userId") Long userId, @Param("productIds") List<Long> productIds, Pageable pageable);
    @Query("SELECT COUNT(c) FROM Cart c WHERE c.user.id = :userId")
    long countProductsByUserId(@Param("userId") Long userId);
}
