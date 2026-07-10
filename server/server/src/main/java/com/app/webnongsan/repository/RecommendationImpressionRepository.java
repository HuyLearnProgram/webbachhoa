package com.app.webnongsan.repository;

import com.app.webnongsan.domain.RecommendationImpression;
import com.app.webnongsan.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface RecommendationImpressionRepository extends JpaRepository<RecommendationImpression, Long> {
    @Modifying
    @Query("UPDATE RecommendationImpression ri SET ri.user = :user WHERE ri.sessionId = :sessionId AND ri.user IS NULL")
    int mergeSessionIntoUser(@Param("sessionId") String sessionId, @Param("user") User user);

    Optional<RecommendationImpression> findFirstByRequestIdAndProductIdOrderByShownAtDesc(String requestId, Long productId);

    // Phase 3 — conversion attribution (last-touch): tìm impression gần nhất chưa converted
    // của user/session cho 1 sản phẩm trong cửa sổ attribution, ưu tiên impression đã click
    // (clicked DESC) rồi mới tới mới nhất. Dùng index idx_ri_user / idx_ri_session sẵn có.
    Optional<RecommendationImpression> findFirstByUserIdAndProductIdAndConvertedFalseAndShownAtAfterOrderByClickedDescShownAtDesc(
            Long userId, Long productId, Instant cutoff);

    Optional<RecommendationImpression> findFirstBySessionIdAndProductIdAndConvertedFalseAndShownAtAfterOrderByClickedDescShownAtDesc(
            String sessionId, Long productId, Instant cutoff);
}
