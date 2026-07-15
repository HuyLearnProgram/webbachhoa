package com.app.webnongsan.repository;

import com.app.webnongsan.domain.AutoGrantType;
import com.app.webnongsan.domain.VoucherAutoGrantRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherAutoGrantRuleRepository extends JpaRepository<VoucherAutoGrantRule, Long> {

    // WELCOME/FIRST_ORDER/BIRTHDAY/WIN_BACK/REFERRAL_REFERRER/REFERRAL_REFEREE: cho phép NHIỀU rule
    // active cùng loại — VoucherGrantService trao TẤT CẢ rule trong danh sách này mỗi lần trigger nổ ra
    // (VD REFERRAL_REFEREE có 10 rule theo 10 danh mục -> user nhận đủ cả 10 voucher, KHÔNG chọn ngẫu
    // nhiên 1 trong số đó — quyết định trực tiếp của user). Loại chỉ có 1 rule active (đa số trường
    // hợp hiện tại) thì hành vi không đổi.
    List<VoucherAutoGrantRule> findAllByAutoGrantTypeAndIsActiveTrue(AutoGrantType autoGrantType);

    // MILESTONE: nhiều rule cùng loại nhưng khác milestoneOrderCount (mốc 5 đơn, 10 đơn...)
    Optional<VoucherAutoGrantRule> findFirstByAutoGrantTypeAndMilestoneOrderCountAndIsActiveTrue(
            AutoGrantType autoGrantType, Integer milestoneOrderCount);

    List<VoucherAutoGrantRule> findAllByOrderByAutoGrantTypeAsc();

    // CART_RECOVERY: nhiều rule active cùng loại, chia bậc theo minProductPrice (VD 5% nếu <150k, 10%
    // nếu >=150k) — lấy rule có ngưỡng cao nhất mà giá sản phẩm vẫn đạt; null = rule "catch-all" (áp
    // dụng mọi mức giá), luôn xếp SAU CÙNG để rule có ngưỡng cụ thể ưu tiên hơn. Dùng bởi
    // CartRecoveryScheduler thay vì đọc số cứng từ application.properties — admin sửa mức giảm/ngưỡng
    // qua trang "Quy tắc trao voucher tự động" không cần sửa code/restart.
    @Query("SELECT r FROM VoucherAutoGrantRule r WHERE r.autoGrantType = com.app.webnongsan.domain.AutoGrantType.CART_RECOVERY "
            + "AND r.isActive = true AND (r.minProductPrice IS NULL OR r.minProductPrice <= :price) "
            + "ORDER BY CASE WHEN r.minProductPrice IS NULL THEN 0 ELSE 1 END DESC, r.minProductPrice DESC")
    List<VoucherAutoGrantRule> findMatchingCartRecoveryRules(@Param("price") double price);
}
