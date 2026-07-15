package com.app.webnongsan.repository;

import com.app.webnongsan.domain.ProductView;
import com.app.webnongsan.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductViewRepository extends JpaRepository<ProductView, Long> {
    @Modifying
    @Query("UPDATE ProductView pv SET pv.user = :user WHERE pv.sessionId = :sessionId AND pv.user IS NULL")
    int mergeSessionIntoUser(@Param("sessionId") String sessionId, @Param("user") User user);

    // Trang "Sản phẩm đã xem" — gom theo sản phẩm (1 sản phẩm có thể xem nhiều lần), sắp xếp
    // theo lần xem gần nhất. Không lọc active/quantity ở đây, việc đó thuộc bước hydrate.
    @Query("SELECT pv.product.id FROM ProductView pv WHERE pv.user.id = :userId " +
            "GROUP BY pv.product.id ORDER BY MAX(pv.viewedAt) DESC")
    Page<Long> findDistinctProductIdsByUserId(@Param("userId") long userId, Pageable pageable);
}
