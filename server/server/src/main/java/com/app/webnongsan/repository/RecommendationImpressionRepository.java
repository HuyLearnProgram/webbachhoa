package com.app.webnongsan.repository;

import com.app.webnongsan.domain.RecommendationImpression;
import com.app.webnongsan.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecommendationImpressionRepository extends JpaRepository<RecommendationImpression, Long> {
    @Modifying
    @Query("UPDATE RecommendationImpression ri SET ri.user = :user WHERE ri.sessionId = :sessionId AND ri.user IS NULL")
    int mergeSessionIntoUser(@Param("sessionId") String sessionId, @Param("user") User user);

    Optional<RecommendationImpression> findFirstByRequestIdAndProductIdOrderByShownAtDesc(String requestId, Long productId);
}
