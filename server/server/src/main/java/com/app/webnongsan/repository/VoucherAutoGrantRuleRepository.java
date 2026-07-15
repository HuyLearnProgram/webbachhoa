package com.app.webnongsan.repository;

import com.app.webnongsan.domain.AutoGrantType;
import com.app.webnongsan.domain.VoucherAutoGrantRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherAutoGrantRuleRepository extends JpaRepository<VoucherAutoGrantRule, Long> {

    // WELCOME/FIRST_ORDER/MILESTONE/BIRTHDAY/WIN_BACK/REFERRAL_REFERRER: chỉ 1 rule active tại 1 thời
    // điểm cho mỗi loại — lấy rule active bất kỳ (nếu admin lỡ tạo >1, lấy 1 cái là đủ, không phải lỗi
    // nghiêm trọng cần chặn cứng).
    Optional<VoucherAutoGrantRule> findFirstByAutoGrantTypeAndIsActiveTrue(AutoGrantType autoGrantType);

    // MILESTONE: nhiều rule cùng loại nhưng khác milestoneOrderCount (mốc 5 đơn, 10 đơn...)
    Optional<VoucherAutoGrantRule> findFirstByAutoGrantTypeAndMilestoneOrderCountAndIsActiveTrue(
            AutoGrantType autoGrantType, Integer milestoneOrderCount);

    List<VoucherAutoGrantRule> findAllByOrderByAutoGrantTypeAsc();
}
