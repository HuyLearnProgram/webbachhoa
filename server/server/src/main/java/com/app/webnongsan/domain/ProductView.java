package com.app.webnongsan.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "product_views", indexes = {
        @Index(name = "idx_pv_user", columnList = "user_id"),
        @Index(name = "idx_pv_session", columnList = "sessionId"),
        @Index(name = "idx_pv_product_time", columnList = "product_id, viewedAt")
})
@Getter
@Setter
public class ProductView {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    // null khi khách chưa đăng nhập — chỉ có sessionId, merge lại sau khi login
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

    private Instant viewedAt;

    // HOME_FEED | SEARCH_RESULT | SIMILAR | CATEGORY_PAGE | DIRECT
    @Column(length = 30, columnDefinition = "VARCHAR(30) DEFAULT 'DIRECT'")
    private String source;

    // sản phẩm gốc nếu view này đến từ rail "sản phẩm tương tự" của sản phẩm khác
    private Long referrerProductId;

    @PrePersist
    public void handleCreate() {
        this.viewedAt = Instant.now();
        if (this.source == null) {
            this.source = "DIRECT";
        }
    }
}
