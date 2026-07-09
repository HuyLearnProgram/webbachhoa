package com.app.webnongsan.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// Audit log cho hành vi giỏ hàng — bảng cart hiện dùng hard-delete nên không giữ được
// lịch sử add/remove (tín hiệu intent quan trọng cho recommender, nhất là remove).
@Entity
@Table(name = "cart_events", indexes = {
        @Index(name = "idx_ce_user", columnList = "user_id"),
        @Index(name = "idx_ce_session", columnList = "sessionId"),
        @Index(name = "idx_ce_product_time", columnList = "product_id, occurredAt")
})
@Getter
@Setter
public class CartEvent {
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

    // ADD | REMOVE | UPDATE_QTY
    @Column(length = 20)
    private String eventType;

    private int quantity;

    private Instant occurredAt;

    @PrePersist
    public void handleCreate() {
        this.occurredAt = Instant.now();
    }
}
