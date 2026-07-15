package com.app.webnongsan.domain.response.user;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

// Thống kê giới thiệu bạn bè (Phase 6 hệ trao voucher tự động) — trang "Giới thiệu bạn bè" (member)
@Getter
@Setter
@AllArgsConstructor
public class ReferralStatsDTO {
    private String referralCode;
    private long referredCount;   // tổng số user đã đăng ký với mã của mình
    private long convertedCount;  // trong số đó, số user đã có ít nhất 1 đơn PAID
}
