package com.app.webnongsan.repository;

import com.app.webnongsan.domain.UserVoucher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserVoucherRepository extends JpaRepository<UserVoucher, Long> {

    // Lấy danh sách voucher của người dùng
    List<UserVoucher> findByUserId(Long userId);

    // Kiểm tra user đã được cấp voucher chưa
    boolean existsByUserIdAndVoucherId(Long userId, Long voucherId);

    // Lấy 1 voucher cụ thể của user
    Optional<UserVoucher> findByUserIdAndVoucherId(Long userId, Long voucherId);

    // Lấy các voucher chưa sử dụng
    List<UserVoucher> findByUserIdAndIsUsedFalse(Long userId);

    // Hoặc phân trang nếu cần
    Page<UserVoucher> findByUserId(Long userId, Pageable pageable);
    // Chỉ trả voucher user CÒN DÙNG ĐƯỢC: chưa dùng riêng (isUsed) + voucher gốc vẫn active/còn hạn/còn
    // lượt toàn cục — trước đây chỉ lọc isUsed nên voucher hết hạn/hết lượt vẫn lọt vào ví + popup
    // chọn voucher ở Checkout (2 nơi cùng đọc endpoint này).
    @Query("SELECT uv FROM UserVoucher uv WHERE uv.user.id = :userId " +
            "AND (uv.isUsed = false OR uv.isUsed IS NULL) " +
            "AND uv.voucher.isActive = true AND :now BETWEEN uv.voucher.startDate AND uv.voucher.endDate " +
            "AND (uv.voucher.maxUsage IS NULL OR uv.voucher.usedCount < uv.voucher.maxUsage)")
    Page<UserVoucher> findActiveUserVouchers(@Param("userId") Long userId, @Param("now") Instant now, Pageable pageable);

}
