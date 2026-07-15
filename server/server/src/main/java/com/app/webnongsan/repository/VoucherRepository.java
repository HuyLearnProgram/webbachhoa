package com.app.webnongsan.repository;

import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.domain.Voucher.VoucherType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long>, JpaSpecificationExecutor<Voucher> {

    Optional<Voucher> findByCode(String code);

    boolean existsByCode(String code);

    // Lấy các voucher đang hoạt động (trong thời gian, active, còn lượt dùng) — CHỈ voucher công khai
    // (isPublic=true). Voucher hệ thống tự sinh riêng cho 1 user (welcome/birthday/lucky-draw...) có
    // isPublic=false, không được lọt vào đây dù isActive=true — nếu không, voucher cá nhân của người
    // này sẽ hiện ra cho người khác tự lưu.
    @Query("SELECT v FROM Voucher v WHERE v.isActive = true AND v.isPublic = true " +
            "AND :now BETWEEN v.startDate AND v.endDate " +
            "AND (v.maxUsage IS NULL OR v.usedCount < v.maxUsage)")
    List<Voucher> findAllActiveVouchers(@Param("now") Instant now);

    // Voucher flash-sale đang hiệu lực để hiện banner trang chủ, sắp hết hạn hiện trước (tạo cảm giác
    // khẩn cấp). Vẫn chỉ lấy voucher công khai — flash-sale không áp dụng cho voucher cá nhân.
    @Query("SELECT v FROM Voucher v WHERE v.isActive = true AND v.isPublic = true AND v.isFlashSale = true " +
            "AND :now BETWEEN v.startDate AND v.endDate " +
            "AND (v.maxUsage IS NULL OR v.usedCount < v.maxUsage) " +
            "ORDER BY v.endDate ASC")
    List<Voucher> findFlashSaleVouchers(@Param("now") Instant now);

    // Tìm các voucher PERCENT còn hoạt động
    List<Voucher> findByTypeAndIsActiveTrueAndEndDateAfter(VoucherType type, Instant now);

    // (Optional) Lọc theo minOrder
    @Query("SELECT v FROM Voucher v WHERE " +
            "v.isActive = true AND :now BETWEEN v.startDate AND v.endDate " +
            "AND (v.maxUsage IS NULL OR v.usedCount < v.maxUsage) " +
            "AND (v.minimumOrderAmount IS NULL OR v.minimumOrderAmount <= :orderTotal)")
    List<Voucher> findValidVouchersForOrder(@Param("now") Instant now,
                                            @Param("orderTotal") Double orderTotal);

    // Dành cho Admin hoặc phân trang voucher
    Page<Voucher> findAllByIsActiveTrue(Pageable pageable);

    // Atomic conditional update — enforcement THẬT của maxUsage, chặn race condition khi nhiều
    // request đồng thời cùng dùng 1 voucher sắp hết lượt (check-then-act ở tầng Java không an toàn).
    // Trả về số dòng bị ảnh hưởng: 0 nghĩa là hết lượt (đã bị request khác giành mất hoặc đã hết sẵn).
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Voucher v SET v.usedCount = COALESCE(v.usedCount, 0) + 1 " +
            "WHERE v.id = :id AND (v.maxUsage IS NULL OR COALESCE(v.usedCount, 0) < v.maxUsage)")
    int incrementUsedCountIfAvailable(@Param("id") Long id);
}
