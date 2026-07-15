package com.app.webnongsan.service;

import com.app.webnongsan.domain.CartId;
import com.app.webnongsan.domain.CartRecoveryDiscount;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.repository.CartEventRepository;
import com.app.webnongsan.repository.CartRecoveryDiscountRepository;
import com.app.webnongsan.repository.CartRepository;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

// Khôi phục giỏ hàng bị bỏ quên — sản phẩm CHƯA có khuyến mãi nào (promotionType=NONE) bị 1 user bất
// kỳ bỏ quên trong giỏ >= staleThresholdHours (mặc định 48h) -> cấp 1 Flash Sale CÁ NHÂN
// (CartRecoveryDiscount) CHỈ cho đúng user đó — KHÔNG đụng Product.discountPrice (không còn công khai
// cho mọi khách như trước). Mức giảm chia bậc theo giá sản phẩm (5%/tối đa 15k nếu <150k, 10%/tối đa
// 30k nếu >=150k). Hết hạn 22h00 CÙNG NGÀY được cấp, và chỉ THỰC SỰ có hiệu lực trong khung giờ Flash
// Sale (xem PromotionService.isWithinFlashSaleWindow) — xem chi tiết luồng đọc giá ở
// PromotionService.getActivePersonalDiscount()/CartService.enrichPersonalDiscount().
@Component
public class CartRecoveryScheduler {
    private static final Logger log = LoggerFactory.getLogger(CartRecoveryScheduler.class);

    private final CartEventRepository cartEventRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CartRecoveryDiscountRepository cartRecoveryDiscountRepository;
    private final EmailService emailService;

    private final long staleThresholdHours;
    private final double priceTierThreshold;
    private final double discountPercentLow;
    private final double discountPercentHigh;
    private final double maxDiscountAmountLow;
    private final double maxDiscountAmountHigh;

    public CartRecoveryScheduler(CartEventRepository cartEventRepository,
                                  CartRepository cartRepository,
                                  ProductRepository productRepository,
                                  UserRepository userRepository,
                                  CartRecoveryDiscountRepository cartRecoveryDiscountRepository,
                                  EmailService emailService,
                                  @Value("${cart-recovery.stale-threshold-hours:48}") long staleThresholdHours,
                                  @Value("${cart-recovery.price-tier-threshold:150000}") double priceTierThreshold,
                                  @Value("${cart-recovery.discount-percent-low:5}") double discountPercentLow,
                                  @Value("${cart-recovery.discount-percent-high:10}") double discountPercentHigh,
                                  @Value("${cart-recovery.max-discount-amount-low:15000}") double maxDiscountAmountLow,
                                  @Value("${cart-recovery.max-discount-amount-high:30000}") double maxDiscountAmountHigh) {
        this.cartEventRepository = cartEventRepository;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.cartRecoveryDiscountRepository = cartRecoveryDiscountRepository;
        this.emailService = emailService;
        this.staleThresholdHours = staleThresholdHours;
        this.priceTierThreshold = priceTierThreshold;
        this.discountPercentLow = discountPercentLow;
        this.discountPercentHigh = discountPercentHigh;
        this.maxDiscountAmountLow = maxDiscountAmountLow;
        this.maxDiscountAmountHigh = maxDiscountAmountHigh;
    }

    // @Transactional bắt buộc cho deleteExpiredBefore (@Modifying DELETE) — pattern chung của dự án
    // là caller tự @Transactional thay vì annotate trên repository method (xem incrementUsedCountIfAvailable
    // dùng trong OrderService.create() vốn đã @Transactional).
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void run() {
        grantPersonalFlashSaleDiscounts();
        cartRecoveryDiscountRepository.deleteExpiredBefore(Instant.now().minus(7, ChronoUnit.DAYS));
    }

    private void grantPersonalFlashSaleDiscounts() {
        Instant cutoff = Instant.now().minus(staleThresholdHours, ChronoUnit.HOURS);

        List<Object[]> rows;
        try {
            rows = cartEventRepository.findStaleUserProductActivity(cutoff);
        } catch (Exception e) {
            log.warn("Cart Recovery: lỗi truy vấn hoạt động giỏ hàng: {}", e.getMessage());
            return;
        }

        Instant now = Instant.now();
        Instant expiresAt = todayAt22h(now);

        for (Object[] row : rows) {
            Long userId = (Long) row[0];
            Long productId = (Long) row[1];
            try {
                // Chỉ tính nếu sản phẩm THỰC SỰ còn trong giỏ của user tại thời điểm chạy job (không
                // tính user đã checkout/xoá khỏi giỏ từ lúc ghi CartEvent tới nay).
                if (!cartRepository.existsById(new CartId(userId, productId))) continue;

                Product product = productRepository.findById(productId).orElse(null);
                // Guard bắt buộc: bỏ qua nếu sản phẩm ĐANG có bất kỳ khuyến mãi công khai nào (admin
                // cấu hình tay) — không cấp Flash Sale cá nhân chồng lên khuyến mãi công khai.
                if (product == null || !"NONE".equals(product.getPromotionType())) continue;

                // Chống cấp trùng — user này đã có grant còn hiệu lực cho đúng sản phẩm này thì bỏ qua
                // (VD job chạy lỡ 2 lần 1 ngày, hoặc user vẫn chưa mua từ hôm trước — hôm trước KHÔNG
                // xảy ra vì grant hết hạn 22h hôm trước, cart_events lúc đó lại không còn "cũ" nữa do
                // user vẫn giữ nguyên sản phẩm trong giỏ mà không động vào — cùng lắm bị bỏ lỡ 1 ngày
                // cấp lại, không phải lỗi nghiêm trọng).
                if (cartRecoveryDiscountRepository.existsByUser_IdAndProduct_IdAndExpiresAtAfter(userId, productId, now)) continue;

                User user = userRepository.findById(userId).orElse(null);
                if (user == null) continue;

                boolean lowTier = product.getPrice() < priceTierThreshold;
                double percent = lowTier ? discountPercentLow : discountPercentHigh;
                double maxAmount = lowTier ? maxDiscountAmountLow : maxDiscountAmountHigh;
                double discountAmount = Math.min(product.getPrice() * percent / 100.0, maxAmount);
                double discountedPrice = product.getPrice() - discountAmount;

                CartRecoveryDiscount discount = new CartRecoveryDiscount();
                discount.setUser(user);
                discount.setProduct(product);
                discount.setDiscountPercent(percent);
                discount.setMaxDiscountAmount(maxAmount);
                discount.setGrantedAt(now);
                discount.setExpiresAt(expiresAt);
                cartRecoveryDiscountRepository.save(discount);

                try {
                    emailService.sendCartRecoveryDiscountEmail(user.getEmail(), user.getName(), product.getProductName(),
                            percent, product.getPrice(), discountedPrice, expiresAt);
                } catch (Exception e) {
                    log.warn("Cart Recovery: lỗi gửi email thông báo user={}: {}", userId, e.getMessage());
                }

                log.info("Cart Recovery: cấp Flash Sale cá nhân user={} product={} ({}%, tối đa {}đ, hết hạn {}) do bị bỏ quên trong giỏ >= {}h",
                        userId, productId, percent, maxAmount, expiresAt, staleThresholdHours);
            } catch (Exception e) {
                log.warn("Cart Recovery: lỗi xử lý user={} product={}: {}", userId, productId, e.getMessage());
            }
        }
    }

    private Instant todayAt22h(Instant now) {
        ZonedDateTime zdt = now.atZone(ZoneId.systemDefault())
                .withHour(22).withMinute(0).withSecond(0).withNano(0);
        return zdt.toInstant();
    }
}
