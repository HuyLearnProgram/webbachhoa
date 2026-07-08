package com.app.webnongsan.domain.response.order;

import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderDetailDTO {
    private long productId;
    private String productName;
    private int quantity;
    private Double unit_price;

    // Snapshot khuyến mãi tại thời điểm đặt hàng (từ OrderDetail), không phải trạng thái khuyến mãi hiện tại của product
    private Double lineTotal;
    private String promotionType;
    private Integer freeUnits;
    private Integer promoBundleQuantity;
    private Double promoBundlePrice;
    private Double originalPrice;

    @Transient
    private String imageUrl;
    @Transient
    private String category;

    @Transient
    private long orderId;
    @Transient
    private Instant orderTime;
    @Transient
    private int status;
    @Transient
    private String formattedPrice;
    @Transient
    private Long voucherId;
    @Transient
    private String voucherCode;
    @Transient
    private String voucherType; // "PERCENT" or "FIXED"
    @Transient
    private Double voucherDiscountValue;
    @Transient
    private Instant deliveryTime;
    @Transient
    private String paymentStatus;
    // Constructor không bao gồm formattedPrice để Hibernate sử dụng
    public OrderDetailDTO(long productId, String productName, int quantity, Double unit_price,
                          String imageUrl, String category, long orderId, Instant orderTime, int status) {
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.unit_price = unit_price;
        this.imageUrl = imageUrl;
        this.category = category;
        this.orderId = orderId;
        this.orderTime = orderTime;
        this.status = status;
    }

    public OrderDetailDTO(long productId, String productName, int quantity, Double unit_price) {
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.unit_price = unit_price;
    }
}
