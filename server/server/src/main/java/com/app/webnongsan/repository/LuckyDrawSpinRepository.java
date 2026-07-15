package com.app.webnongsan.repository;

import com.app.webnongsan.domain.LuckyDrawSpin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LuckyDrawSpinRepository extends JpaRepository<LuckyDrawSpin, Long> {
    boolean existsByCampaignIdAndOrderId(Long campaignId, Long orderId);
}
