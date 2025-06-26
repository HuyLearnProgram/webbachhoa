package com.app.webnongsan.repository;

import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.domain.Voucher.VoucherType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
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

    // Lấy các voucher đang hoạt động (trong thời gian, active, còn lượt dùng)
    @Query("SELECT v FROM Voucher v WHERE v.isActive = true " +
            "AND :now BETWEEN v.startDate AND v.endDate " +
            "AND (v.maxUsage IS NULL OR v.usedCount < v.maxUsage)")
    List<Voucher> findAllActiveVouchers(@Param("now") Instant now);

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
}
