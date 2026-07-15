package com.app.webnongsan.repository;

import com.app.webnongsan.domain.CartEvent;
import com.app.webnongsan.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface CartEventRepository extends JpaRepository<CartEvent, Long> {
    @Modifying
    @Query("UPDATE CartEvent ce SET ce.user = :user WHERE ce.sessionId = :sessionId AND ce.user IS NULL")
    int mergeSessionIntoUser(@Param("sessionId") String sessionId, @Param("user") User user);

    // Cart Recovery: cặp (user, product) có lần cuối động vào giỏ (ADD/REMOVE/UPDATE_QTY) ĐÃ CŨ hơn
    // cutoff — dùng để tìm sản phẩm bị bỏ quên >= ngưỡng giờ, xét tự động giảm giá. Không tính user
    // chưa từng đăng nhập (guest, ce.user NULL).
    // Object[]{userId (Long), productId (Long), lastActivity (Instant)}
    @Query("SELECT ce.user.id, ce.product.id, MAX(ce.occurredAt) FROM CartEvent ce " +
            "WHERE ce.user IS NOT NULL GROUP BY ce.user.id, ce.product.id " +
            "HAVING MAX(ce.occurredAt) < :cutoff")
    List<Object[]> findStaleUserProductActivity(@Param("cutoff") Instant cutoff);
}
