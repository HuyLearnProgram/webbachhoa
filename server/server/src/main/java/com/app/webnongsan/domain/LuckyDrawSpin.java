package com.app.webnongsan.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// 1 lượt quay đã thực hiện — unique (campaign_id, order_id) chặn quay 2 lần/đơn (bắt
// DataIntegrityViolationException khi insert trùng, giống pattern UserService.create() bắt trùng email).
@Entity
@Table(name = "lucky_draw_spins", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"campaign_id", "order_id"})
})
@Getter
@Setter
public class LuckyDrawSpin {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    @JsonIgnore
    private LuckyDrawCampaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    // null = trúng giải "trượt"
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prize_id")
    private LuckyDrawPrize prize;

    private Instant spunAt;

    @PrePersist
    public void onCreate() {
        this.spunAt = Instant.now();
    }
}
