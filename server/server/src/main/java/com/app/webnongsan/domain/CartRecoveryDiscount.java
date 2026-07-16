package com.app.webnongsan.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// Giảm giá CÁ NHÂN (khác hẳn Product.discountPrice công khai) — cấp cho ĐÚNG 1 user vì họ để 1 sản
// phẩm nằm im trong giỏ hàng quá lâu (xem CartRecoveryScheduler). Chỉ user này thấy giá đã giảm, chỉ
// trong trang Giỏ hàng, và chỉ trong khung giờ Flash Sale (xem PromotionService.isWithinFlashSaleWindow)
// — hết hiệu lực tự nhiên khi Instant.now() > expiresAt, không cần scheduler dọn dẹp riêng để "tắt".
@Entity
@Table(name = "cart_recovery_discounts", indexes = {
        @Index(name = "idx_crd_user_product", columnList = "user_id, product_id")
})
@Getter
@Setter
public class CartRecoveryDiscount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // @JsonIgnore — nhất quán với các entity khác, chặn đường lộ User.password/refreshToken nếu code
    // nào sau này lỡ serialize entity này trực tiếp thay vì qua DTO.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private Double discountPercent;
    private Double maxDiscountAmount;

    private Instant grantedAt;
    // Hết hạn 22h00 CÙNG NGÀY được cấp (không carry sang ngày sau) — bao trọn cả 2 khung giờ Flash
    // Sale còn lại trong ngày (12h-14h nếu job chạy trước 12h, và 20h-22h).
    private Instant expiresAt;
}
