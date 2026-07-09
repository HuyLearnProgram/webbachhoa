package com.app.webnongsan.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "recommendation_impressions", indexes = {
        @Index(name = "idx_ri_user", columnList = "user_id"),
        @Index(name = "idx_ri_session", columnList = "sessionId"),
        @Index(name = "idx_ri_request", columnList = "requestId"),
        @Index(name = "idx_ri_shown_at", columnList = "shownAt")
})
@Getter
@Setter
public class RecommendationImpression {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @Column(length = 64)
    private String sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    private Product product;

    // HOME_PERSONALIZED | PDP_SIMILAR | PDP_FBT | CART_SUGGESTION
    @Column(length = 30)
    private String placement;

    // CONTENT_BASED | CO_PURCHASE | POPULARITY | CF | BANDIT_EXPLORE | RULE_BASED_FALLBACK
    // bắt buộc để attribute click/conversion về đúng nguồn thuật toán khi đánh giá
    @Column(length = 30)
    private String algorithmSource;

    private int rankPosition;

    // nhóm các impression thuộc cùng 1 lần trả gợi ý (1 slate) — dùng tính intra-list diversity
    @Column(length = 64)
    private String requestId;

    private Instant shownAt;

    @Column(columnDefinition = "TINYINT(1) DEFAULT 0")
    private boolean clicked;

    private Instant clickedAt;

    @Column(columnDefinition = "TINYINT(1) DEFAULT 0")
    private boolean converted;

    private Long convertedOrderId;

    @PrePersist
    public void handleCreate() {
        this.shownAt = Instant.now();
    }
}
