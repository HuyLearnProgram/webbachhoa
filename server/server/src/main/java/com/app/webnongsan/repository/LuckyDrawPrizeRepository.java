package com.app.webnongsan.repository;

import com.app.webnongsan.domain.LuckyDrawPrize;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LuckyDrawPrizeRepository extends JpaRepository<LuckyDrawPrize, Long> {
    List<LuckyDrawPrize> findByCampaignId(Long campaignId);

    // Còn giải nếu totalQuantity null (không giới hạn) hoặc remainingQuantity > 0
    @Query("SELECT p FROM LuckyDrawPrize p WHERE p.campaign.id = :campaignId " +
            "AND (p.totalQuantity IS NULL OR p.remainingQuantity > 0)")
    List<LuckyDrawPrize> findAvailableByCampaignId(@Param("campaignId") Long campaignId);

    // Atomic conditional update — y hệt mẫu VoucherRepository.incrementUsedCountIfAvailable, chặn
    // race condition khi nhiều request đồng thời trúng cùng 1 giải sắp hết số lượng.
    @Modifying(clearAutomatically = true)
    @Query("UPDATE LuckyDrawPrize p SET p.remainingQuantity = p.remainingQuantity - 1 " +
            "WHERE p.id = :id AND p.remainingQuantity IS NOT NULL AND p.remainingQuantity > 0")
    int decrementRemainingIfAvailable(@Param("id") Long id);
}
