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
            if ("PRICE_DISCOUNT".equals(product.getPromotionType()) && product.getOriginalPrice() != null) {
                product.setPrice(product.getOriginalPrice());
            }
            product.setPromotionType("NONE");
            product.setOriginalPrice(null);
            product.setPromoBuyQuantity(null);
            product.setPromoFreeQuantity(null);
            product.setPromoBundleQuantity(null);
            product.setPromoBundlePrice(null);
            product.setPromotionExpiresAt(null);
        }
        this.productRepository.saveAll(expired);
    }
}
