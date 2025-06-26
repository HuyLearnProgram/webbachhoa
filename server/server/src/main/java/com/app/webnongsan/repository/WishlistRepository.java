package com.app.webnongsan.repository;

import com.app.webnongsan.domain.Wishlist;
import com.app.webnongsan.domain.WishlistId;
import com.app.webnongsan.domain.response.wishlist.WishlistItemDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, WishlistId>, JpaSpecificationExecutor<Wishlist> {
    @Query("SELECT COUNT(w) > 0 FROM Wishlist w WHERE w.user.id = :userId AND w.product.id = :productId")
    boolean existsByUserIdAndProductId(@Param("userId") Long userId, @Param("productId") Long productId);

    @Query("SELECT new com.app.webnongsan.domain.response.wishlist.WishlistItemDTO" +
            "(p.id, p.productName, p.price, p.imageUrl, c.name) " +
            "FROM Wishlist w JOIN w.product p JOIN p.category c WHERE w.user.id = :userId")
    Page<WishlistItemDTO> findWishlistItemsByUserId(@Param("userId") Long userId, Pageable pageable);

}
