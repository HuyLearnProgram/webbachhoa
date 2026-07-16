package com.app.webnongsan.service;

import com.app.webnongsan.domain.CartId;
import com.app.webnongsan.domain.CartRecoveryDiscount;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.domain.VoucherAutoGrantRule;
import com.app.webnongsan.repository.CartEventRepository;
import com.app.webnongsan.repository.CartRecoveryDiscountRepository;
import com.app.webnongsan.repository.CartRepository;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.repository.VoucherAutoGrantRuleRepository;
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
// cho mọi khách như trước). Mức giảm/ngưỡng giá đọc từ bảng voucher_auto_grant_rules (loại
// CART_RECOVERY, xem VoucherAutoGrantRuleRepository.findMatchingCartRecoveryRules) — admin sửa qua
// trang "Quy tắc trao voucher tự động" không cần sửa code/restart; KHÔNG có rule active nào ->
// coi như tính năng đang tắt cho sản phẩm đó (kill-switch tự nhiên, không cần cờ riêng). Hết hạn
// 22h00 CÙNG NGÀY được cấp, và chỉ THỰC SỰ có hiệu lực trong khung giờ Flash Sale (xem
// PromotionService.isWithinFlashSaleWindow) — xem chi tiết luồng đọc giá ở
// PromotionService.getActivePersonalDiscount()/CartService.enrichPersonalDiscount().
//
// Lưu ý: rule CART_RECOVERY KHÔNG tạo Voucher/UserVoucher (khác 6 loại trigger còn lại dùng
// VoucherGrantService) — output là CartRecoveryDiscount, áp thẳng vào giá hiển thị trong giỏ, không
// có mã để nhập. Do đó codePrefix/validityDays/minimumOrderAmount trên rule bị bỏ qua, chỉ
// discountType/discountValue/maxDiscountAmount/minProductPrice có tác dụng.
@Component
public class CartRecoveryScheduler {
    private static final Logger log = LoggerFactory.getLogger(CartRecoveryScheduler.class);

    private final CartEventRepository cartEventRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CartRecoveryDiscountRepository cartRecoveryDiscountRepository;
    private final VoucherAutoGrantRuleRepository voucherAutoGrantRuleRepository;
    private final EmailService emailService;

    private final long staleThresholdHours;

    public CartRecoveryScheduler(CartEventRepository cartEventRepository,
                                  CartRepository cartRepository,
                                  ProductRepository productRepository,
                                  UserRepository userRepository,
                                  CartRecoveryDiscountRepository cartRecoveryDiscountRepository,
                                  VoucherAutoGrantRuleRepository voucherAutoGrantRuleRepository,
                                  EmailService emailService,
                                  @Value("${cart-recovery.stale-threshold-hours:48}") long staleThresholdHours) {
        this.cartEventRepository = cartEventRepository;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.cartRecoveryDiscountRepository = cartRecoveryDiscountRepository;
        this.voucherAutoGrantRuleRepository = voucherAutoGrantRuleRepository;
        this.emailService = emailService;
        this.staleThresholdHours = staleThresholdHours;
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
        // Job lên lịch cố định 9h sáng nên bình thường luôn còn dư 13 tiếng tới 22h — nhưng nếu bị gọi
        // thủ công để debug, hoặc scheduler "bắt kịp" 1 lần chạy bị trễ qua 22h00, todayAt22h() sẽ trả
        // về 1 thời điểm ĐÃ Ở QUÁ KHỨ. Cấp CartRecoveryDiscount với expiresAt trong quá khứ sẽ vô hiệu
        // ngay lập tức (getActivePersonalDiscount() luôn lọc expiresAt > now) — âm thầm, không lỗi gì
        // hiện ra. Bỏ qua cả lần chạy này thay vì cấp phát vô nghĩa.
        if (!expiresAt.isAfter(now)) {
            log.warn("Cart Recovery: job chạy sau 22h00 (now={}, expiresAt tính được={} đã ở quá khứ) — " +
                    "bỏ qua lần chạy này để tránh cấp Flash Sale cá nhân hết hạn ngay lập tức.", now, expiresAt);
            return;
        }

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

                // Không có rule CART_RECOVERY active nào khớp giá sản phẩm -> coi như tính năng đang tắt
                // (admin deactivate hết rule = kill-switch, không cần cờ bật/tắt riêng).
                List<VoucherAutoGrantRule> matches = voucherAutoGrantRuleRepository.findMatchingCartRecoveryRules(product.getPrice());
                if (matches.isEmpty()) continue;
                VoucherAutoGrantRule rule = matches.get(0);
                if (rule.getDiscountType() != Voucher.VoucherType.PERCENT) {
                    log.warn("Cart Recovery: rule id={} kiểu FIXED không được hỗ trợ (CartRecoveryDiscount chỉ nhận %), bỏ qua", rule.getId());
                    continue;
                }

                User user = userRepository.findById(userId).orElse(null);
                if (user == null) continue;

                double percent = rule.getDiscountValue();
                Double maxAmount = rule.getMaxDiscountAmount(); // null = không giới hạn trần
                double rawDiscount = product.getPrice() * percent / 100.0;
                double discountAmount = maxAmount != null ? Math.min(rawDiscount, maxAmount) : rawDiscount;
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

                log.info("Cart Recovery: cấp Flash Sale cá nhân user={} product={} (rule id={}, {}%, tối đa {}, hết hạn {}) do bị bỏ quên trong giỏ >= {}h",
                        userId, productId, rule.getId(), percent, maxAmount, expiresAt, staleThresholdHours);
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
