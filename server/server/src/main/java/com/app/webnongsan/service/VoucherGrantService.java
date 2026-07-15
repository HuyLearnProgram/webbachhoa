package com.app.webnongsan.service;

import com.app.webnongsan.domain.AutoGrantType;
import com.app.webnongsan.domain.Order;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.UserVoucher;
import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.domain.VoucherAutoGrantRule;
import com.app.webnongsan.domain.VoucherGrantLog;
import com.app.webnongsan.repository.OrderRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.repository.UserVoucherRepository;
import com.app.webnongsan.repository.VoucherAutoGrantRuleRepository;
import com.app.webnongsan.repository.VoucherGrantLogRepository;
import com.app.webnongsan.repository.VoucherRepository;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

// Trung tâm của hệ "trao voucher tự động" — mọi trigger (welcome/first-order/milestone/
// cart-recovery/birthday/win-back/referral/lucky-draw) đều gọi qua đây, KHÔNG tự viết logic tạo
// voucher riêng lẻ ở nơi khác (đúng bài học "nhiều nơi tự dựng logic phân kỳ nhau" đã ghi CLAUDE.md).
//
// Nguyên tắc: mỗi lần trao TẠO MỚI 1 dòng Voucher (mã tự sinh, maxUsage=1, isPublic=false) + 1 dòng
// UserVoucher gán thẳng cho user đích — từ đó trở đi voucher này y hệt voucher cá nhân bình thường,
// toàn bộ luồng checkout/hiển thị hiện tại không cần biết gì về nguồn gốc "tự động" của nó.
//
// Mọi method ở đây KHÔNG ném exception ra ngoài — lỗi (rule chưa cấu hình, voucher trùng mã hiếm gặp,
// gửi email thất bại...) chỉ log rồi bỏ qua, không được phép phá luồng nghiệp vụ chính (đăng ký/đặt
// hàng/...) đang gọi tới nó — đúng convention attributeOrderConversions() đã dùng cho hệ gợi ý AI.
@Service
@AllArgsConstructor
public class VoucherGrantService {
    private static final Logger log = LoggerFactory.getLogger(VoucherGrantService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    // Bỏ ký tự dễ nhầm lẫn khi đọc (0/O, 1/I)
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final VoucherAutoGrantRuleRepository ruleRepository;
    private final VoucherGrantLogRepository grantLogRepository;
    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final EmailService emailService;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    /**
     * Hook dùng chung cho MỌI điểm set paymentStatus=PAID — dự án có 2 điểm không dùng chung 1 hàm
     * (OrderController.updateOrderStatus cho COD, PaymentService.confirmVnPayCallback cho VNPay),
     * cả 2 phải gọi tới đây SAU KHI đã lưu đơn hàng, bọc try-catch ở nơi gọi.
     */
    public void onOrderPaid(Order order) {
        User user = order.getUser();
        long paidCount = orderRepository.countByUser_IdAndPaymentStatus(user.getId(), "PAID");
        if (paidCount == 1) {
            grantIfEligible(user, AutoGrantType.FIRST_ORDER, "");
            grantReferralBonusIfEligible(user);
        }
        grantMilestoneIfEligible(user, (int) paidCount); // no-op nếu admin chưa cấu hình mốc này
    }

    /**
     * Referral (Phase 6) — chỉ thưởng người giới thiệu KHI người được giới thiệu vừa PAID đơn ĐẦU
     * TIÊN (gọi từ onOrderPaid khi paidCount==1). periodKey = id người được giới thiệu, đảm bảo mỗi
     * người bạn chỉ mang lại thưởng đúng 1 lần cho referrer, không giới hạn tổng số bạn giới thiệu.
     */
    private void grantReferralBonusIfEligible(User referee) {
        String referredByCode = referee.getReferredBy();
        if (referredByCode == null || referredByCode.isBlank()) return;
        User referrer = userRepository.findByReferralCode(referredByCode);
        if (referrer == null) return;
        grantIfEligible(referrer, AutoGrantType.REFERRAL_REFERRER, String.valueOf(referee.getId()));
    }

    /**
     * Trao voucher theo loại đơn giản (WELCOME/FIRST_ORDER/BIRTHDAY/WIN_BACK/REFERRAL_REFERRER/
     * REFERRAL_REFEREE) — trao TẤT CẢ rule active cùng loại (VD REFERRAL_REFEREE có 10 rule theo
     * 10 danh mục khác nhau -> user nhận đủ cả 10 voucher trong 1 lần, KHÔNG chọn ngẫu nhiên 1 trong
     * số đó — quyết định trực tiếp của user, xem CLAUDE.md). Mỗi rule ghi 1 dòng VoucherGrantLog
     * RIÊNG (periodKey nối thêm id rule) để vẫn chống trao trùng ĐÚNG RULE đó cho cùng 1 sự kiện,
     * trong khi các rule khác cùng sự kiện vẫn trao được bình thường (khác điều kiện unique). periodKey
     * gốc truyền "" nếu loại đó chỉ trao 1 lần trong đời (KHÔNG truyền null — xem lý do ở VoucherGrantLog).
     */
    public void grantIfEligible(User user, AutoGrantType type, String periodKey) {
        List<VoucherAutoGrantRule> rules = ruleRepository.findAllByAutoGrantTypeAndIsActiveTrue(type);
        for (VoucherAutoGrantRule rule : rules) {
            grant(user, rule, type, periodKey + ":" + rule.getId());
        }
    }

    /**
     * Trao voucher MILESTONE — tìm rule theo đúng mốc số đơn (milestoneOrderCount).
     */
    public void grantMilestoneIfEligible(User user, int milestoneOrderCount) {
        Optional<VoucherAutoGrantRule> ruleOpt = ruleRepository
                .findFirstByAutoGrantTypeAndMilestoneOrderCountAndIsActiveTrue(AutoGrantType.MILESTONE, milestoneOrderCount);
        if (ruleOpt.isEmpty()) return;
        grant(user, ruleOpt.get(), AutoGrantType.MILESTONE, String.valueOf(milestoneOrderCount));
    }

    /**
     * Trao voucher theo 1 rule CỤ THỂ đã biết trước (dùng cho Lucky Draw — nhiều prize/rule LUCKY_DRAW
     * cùng tồn tại song song nên không tra theo type như các loại khác). Trả về Voucher vừa tạo (hoặc
     * null nếu không trao được/đã trao rồi) để LuckyDrawService lấy mã trả về ngay cho FE.
     */
    public Voucher grantSpecificRule(User user, VoucherAutoGrantRule rule, String periodKey) {
        return grant(user, rule, AutoGrantType.LUCKY_DRAW, periodKey);
    }

    private Voucher grant(User user, VoucherAutoGrantRule rule, AutoGrantType type, String periodKey) {
        VoucherGrantLog logEntry = new VoucherGrantLog();
        logEntry.setUserId(user.getId());
        logEntry.setAutoGrantType(type);
        logEntry.setPeriodKey(periodKey == null ? "" : periodKey);
        try {
            // saveAndFlush để bắt lỗi trùng NGAY tại đây (không chờ tới cuối transaction bao ngoài,
            // nếu có) — atomic, không cần lock, y hệt pattern UserService.create() bắt trùng email.
            grantLogRepository.saveAndFlush(logEntry);
        } catch (DataIntegrityViolationException e) {
            return null; // Đã trao rồi (cùng user + type + periodKey) — không trao lại
        }

        Voucher voucher = new Voucher();
        voucher.setCode(generateUniqueCode(rule.getCodePrefix(), user.getId()));
        voucher.setType(rule.getDiscountType());
        voucher.setDiscountValue(rule.getDiscountValue());
        voucher.setMinimumOrderAmount(rule.getMinimumOrderAmount());
        voucher.setMaxDiscountAmount(rule.getMaxDiscountAmount());
        voucher.setApplicableCategory(rule.getApplicableCategory());
        voucher.setAutoGrantType(type);
        voucher.setMaxUsage(1);
        voucher.setUsedCount(0);
        voucher.setIsActive(true);
        voucher.setIsPublic(false);
        voucher.setIsFlashSale(false);
        Instant now = Instant.now();
        voucher.setStartDate(now);
        voucher.setEndDate(now.plus(rule.getValidityDays(), ChronoUnit.DAYS));

        try {
            voucher = voucherRepository.save(voucher);
        } catch (Exception e) {
            log.warn("Không tạo được voucher tự động (type={}, user={}): {}", type, user.getId(), e.getMessage());
            return null;
        }

        UserVoucher userVoucher = new UserVoucher();
        userVoucher.setUser(user);
        userVoucher.setVoucher(voucher);
        userVoucherRepository.save(userVoucher);

        try {
            emailService.sendVoucherGrantedEmail(user.getEmail(), user.getName(), reasonText(type), voucher);
        } catch (Exception e) {
            log.warn("Không gửi được email trao voucher (type={}, user={}): {}", type, user.getId(), e.getMessage());
        }

        return voucher;
    }

    private String reasonText(AutoGrantType type) {
        return switch (type) {
            case WELCOME -> "Chào mừng bạn đến với Bách Hóa! Đây là voucher dành riêng cho thành viên mới.";
            case FIRST_ORDER -> "Cảm ơn bạn đã hoàn tất đơn hàng đầu tiên! Đây là voucher cho lần mua tiếp theo.";
            case MILESTONE -> "Cảm ơn bạn đã đồng hành cùng Bách Hóa! Đây là quà tri ân cho cột mốc mua sắm mới.";
            case CART_RECOVERY -> "Sản phẩm bạn quan tâm vẫn đang chờ trong giỏ hàng — đây là ưu đãi thêm để bạn hoàn tất đơn hàng.";
            case BIRTHDAY -> "Chúc mừng sinh nhật! Bách Hóa gửi tặng bạn một voucher đặc biệt.";
            case WIN_BACK -> "Đã lâu không thấy bạn ghé thăm — đây là voucher chào đón bạn quay lại.";
            case REFERRAL_REFERRER -> "Cảm ơn bạn đã giới thiệu bạn bè đến với Bách Hóa! Đây là quà cảm ơn dành cho bạn.";
            case REFERRAL_REFEREE -> "Chào mừng bạn đến với Bách Hóa qua lời giới thiệu của bạn bè! Đây là voucher dành riêng cho bạn.";
            case LUCKY_DRAW -> "Chúc mừng bạn đã trúng thưởng từ vòng quay may mắn!";
        };
    }

    private String generateUniqueCode(String prefix, long userId) {
        for (int attempt = 0; attempt < 5; attempt++) {
            String code = (prefix + "-" + userId + "-" + randomSuffix(4)).toUpperCase();
            if (!voucherRepository.existsByCode(code)) return code;
        }
        // Cực hiếm khi xảy ra hết 5 lần thử vẫn trùng — thêm timestamp để chắc chắn không trùng
        return (prefix + "-" + userId + "-" + Instant.now().toEpochMilli()).toUpperCase();
    }

    private String randomSuffix(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
