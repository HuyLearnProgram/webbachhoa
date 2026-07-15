package com.app.webnongsan.repository;

import com.app.webnongsan.domain.LuckyDrawCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface LuckyDrawCampaignRepository extends JpaRepository<LuckyDrawCampaign, Long> {
    // Lấy campaign active trong khung thời gian hiện tại — nếu admin lỡ tạo nhiều campaign chồng
    // nhau thì lấy 1 cái là đủ (không phải lỗi nghiêm trọng cần chặn cứng).
    @Query("SELECT c FROM LuckyDrawCampaign c WHERE c.isActive = true " +
            "AND :now BETWEEN c.startDate AND c.endDate ORDER BY c.id DESC")
    List<LuckyDrawCampaign> findActiveCampaigns(@Param("now") Instant now);

    default Optional<LuckyDrawCampaign> findFirstActiveCampaign(Instant now) {
        List<LuckyDrawCampaign> list = findActiveCampaigns(now);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    List<LuckyDrawCampaign> findAllByOrderByIdDesc();
}
