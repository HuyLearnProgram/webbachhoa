package com.app.webnongsan.service;

import com.app.webnongsan.domain.Product;
import com.app.webnongsan.repository.ProductRepository;
import lombok.AllArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

// Hạ tầng scheduler đầu tiên của dự án — tự động khôi phục sản phẩm về trạng thái không khuyến mãi
// khi promotionExpiresAt đã qua (được tính lúc admin nhập "số ngày hiệu lực" ở ProductController).
@Component
@AllArgsConstructor
public class PromotionExpiryScheduler {
    private final ProductRepository productRepository;

    @Scheduled(cron = "0 0 * * * *")
    public void revertExpiredPromotions() {
        List<Product> expired = this.productRepository.findByPromotionExpiresAtLessThanEqual(Instant.now());
        if (expired.isEmpty()) return;

        for (Product product : expired) {
            // `price` (giá bán ổn định) không bao giờ bị đổi khi bật/tắt khuyến mãi — chỉ cần xoá
            // discountPrice, không còn gì để "khôi phục" như cơ chế originalPrice cũ.
            product.setPromotionType("NONE");
            product.setDiscountPrice(null);
            product.setPromoBuyQuantity(null);
            product.setPromoFreeQuantity(null);
            product.setPromoBundleQuantity(null);
            product.setPromoBundlePrice(null);
            product.setPromotionExpiresAt(null);
            // isFlashSale chỉ có ý nghĩa khi còn khuyến mãi — hết hạn thì tự rời khỏi banner Flash Sale.
            product.setIsFlashSale(false);
        }
        this.productRepository.saveAll(expired);
    }
}
