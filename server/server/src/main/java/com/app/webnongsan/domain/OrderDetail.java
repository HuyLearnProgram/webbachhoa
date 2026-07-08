package com.app.webnongsan.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "order_detail")
@Getter
@Setter
public class OrderDetail {
    @EmbeddedId
    private OrderDetailId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("orderId")
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    private int quantity;

    private Double unit_price;

    // Snapshot khuyến mãi tại thời điểm đặt hàng — không re-derive từ Product (khuyến mãi có thể hết hạn/đổi sau khi đặt).
    @Column(columnDefinition = "DOUBLE DEFAULT 0")
    private Double lineTotal;

    @Column(columnDefinition = "VARCHAR(20) DEFAULT 'NONE'")
    private String promotionType = "NONE";

    @Column(columnDefinition = "INT DEFAULT 0")
    private Integer freeUnits = 0;

    // Snapshot chi tiết luật khuyến mãi (BUNDLE_PRICE) và giá gốc trước giảm (PRICE_DISCOUNT) tại thời điểm đặt hàng —
    // Product có thể bị PromotionExpiryScheduler xoá các field này về null sau khi hết hạn, nên phải lưu riêng ở đây.
    private Integer promoBundleQuantity;

    private Double promoBundlePrice;

    private Double originalPrice;
}
