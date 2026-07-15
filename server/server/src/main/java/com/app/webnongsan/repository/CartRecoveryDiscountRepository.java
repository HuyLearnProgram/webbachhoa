package com.app.webnongsan.repository;

import com.app.webnongsan.domain.CartRecoveryDiscount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface CartRecoveryDiscountRepository extends JpaRepository<CartRecoveryDiscount, Long> {

    // Lấy grant còn hiệu lực (chưa hết hạn) của đúng user + product — dùng để tính giá hiệu lực lúc
    // hiển thị giỏ hàng và lúc tính tiền thật ở OrderService. Nếu có nhiều dòng (không nên xảy ra do
    // guard existsBy... khi cấp), lấy dòng hết hạn muộn nhất.
    Optional<CartRecoveryDiscount> findFirstByUser_IdAndProduct_IdAndExpiresAtAfterOrderByExpiresAtDesc(
            Long userId, Long productId, Instant now);

    // Chống cấp trùng trong CartRecoveryScheduler — user+product đã có grant còn hiệu lực thì bỏ qua.
    boolean existsByUser_IdAndProduct_IdAndExpiresAtAfter(Long userId, Long productId, Instant now);

    // Dọn rác định kỳ (hygiene, không ảnh hưởng tính đúng — grant hết hạn tự vô hiệu qua điều kiện
    // expiresAt ở 2 query trên) — CartRecoveryScheduler gọi mỗi lần chạy để bảng không phình vô hạn.
    @Modifying
    @Query("DELETE FROM CartRecoveryDiscount d WHERE d.expiresAt < :cutoff")
    void deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
