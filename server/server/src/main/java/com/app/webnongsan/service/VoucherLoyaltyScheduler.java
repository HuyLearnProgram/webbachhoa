package com.app.webnongsan.service;

import com.app.webnongsan.domain.AutoGrantType;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.repository.OrderRepository;
import com.app.webnongsan.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

// Sinh nhật + Win-back (hệ trao voucher tự động, Phase 5) — chạy 8h sáng hằng ngày. Khác
// PromotionExpiryScheduler (không log/không try-catch): hậu quả lỗi ở đây liên quan tiền/voucher
// nặng hơn, nên bọc try-catch quanh TỪNG user để 1 user lỗi không chặn cả batch.
@Component
public class VoucherLoyaltyScheduler {
    private static final Logger log = LoggerFactory.getLogger(VoucherLoyaltyScheduler.class);

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final VoucherGrantService voucherGrantService;
    private final long winBackMinDays;

    public VoucherLoyaltyScheduler(UserRepository userRepository,
                                    OrderRepository orderRepository,
                                    VoucherGrantService voucherGrantService,
                                    @Value("${loyalty.win-back-min-days:60}") long winBackMinDays) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.voucherGrantService = voucherGrantService;
        this.winBackMinDays = winBackMinDays;
    }

    @Scheduled(cron = "0 0 8 * * *")
    public void run() {
        runBirthday();
        runWinBack();
    }

    private void runBirthday() {
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        String periodKey = String.valueOf(today.getYear()); // 1 lần/năm

        List<User> users;
        try {
            users = userRepository.findByBirthdayMonthAndDay(today.getMonthValue(), today.getDayOfMonth());
        } catch (Exception e) {
            log.warn("Voucher sinh nhật: lỗi truy vấn user: {}", e.getMessage());
            return;
        }

        for (User user : users) {
            try {
                voucherGrantService.grantIfEligible(user, AutoGrantType.BIRTHDAY, periodKey);
            } catch (Exception e) {
                log.warn("Voucher sinh nhật: lỗi xử lý user={}: {}", user.getId(), e.getMessage());
            }
        }
    }

    private void runWinBack() {
        Instant cutoff = Instant.now().minus(winBackMinDays, ChronoUnit.DAYS);
        String periodKey = YearMonth.now(ZoneId.systemDefault()).toString(); // tối đa 1 lần/tháng

        List<Object[]> rows;
        try {
            rows = orderRepository.findUsersWithLastOrderBefore(cutoff);
        } catch (Exception e) {
            log.warn("Voucher win-back: lỗi truy vấn đơn hàng: {}", e.getMessage());
            return;
        }

        for (Object[] row : rows) {
            Long userId = (Long) row[0];
            try {
                User user = userRepository.findById(userId).orElse(null);
                if (user == null) continue;
                voucherGrantService.grantIfEligible(user, AutoGrantType.WIN_BACK, periodKey);
            } catch (Exception e) {
                log.warn("Voucher win-back: lỗi xử lý user={}: {}", userId, e.getMessage());
            }
        }
    }
}
