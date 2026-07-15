package com.app.webnongsan.domain.response.cart;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class CartItemDTO {
    private Long id;
    private String productName;
    private Double price;
    private Double discountPrice;
    private String promotionType;
    private Integer promoBuyQuantity;
    private Integer promoFreeQuantity;
    private Integer promoBundleQuantity;
    private Double promoBundlePrice;
    private int quantity;
    private String imageUrl;
    private String category;
    private int stock;
    private Instant addedAt;

    // Flash Sale CÁ NHÂN (Cart Recovery) — KHÔNG nằm trong constructor JPQL bên dưới, CartService tự
    // set qua setter SAU khi fetch (xem enrichPersonalDiscount) vì cần gọi PromotionService theo
    // userId, JPQL constructor-projection không làm được việc này. null/false = không có Flash Sale
    // cá nhân đang hiệu lực cho user hiện tại — FE fallback về giá/khuyến mãi công khai như cũ.
    private Boolean personalFlashSaleActive;
    private Double personalDiscountPrice;
    private Instant personalFlashSaleEndsAt;

    // Constructor DÙNG BỞI JPQL "SELECT new ...CartItemDTO(...)" trong CartRepository — PHẢI giữ
    // đúng 14 tham số theo đúng thứ tự này, KHÔNG thêm/bớt/đổi thứ tự (sửa là vỡ query). 3 field
    // Flash Sale cá nhân ở trên set riêng qua setter, không qua đây (trước đây dùng @AllArgsConstructor
    // của Lombok — đã đổi sang constructor tay để thêm field mới không tự động phá vỡ constructor cũ).
    public CartItemDTO(Long id, String productName, Double price, Double discountPrice, String promotionType,
                        Integer promoBuyQuantity, Integer promoFreeQuantity, Integer promoBundleQuantity,
                        Double promoBundlePrice, int quantity, String imageUrl, String category, int stock,
                        Instant addedAt) {
        this.id = id;
        this.productName = productName;
        this.price = price;
        this.discountPrice = discountPrice;
        this.promotionType = promotionType;
        this.promoBuyQuantity = promoBuyQuantity;
        this.promoFreeQuantity = promoFreeQuantity;
        this.promoBundleQuantity = promoBundleQuantity;
        this.promoBundlePrice = promoBundlePrice;
        this.quantity = quantity;
        this.imageUrl = imageUrl;
        this.category = category;
        this.stock = stock;
        this.addedAt = addedAt;
    }
}
