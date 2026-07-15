package com.app.webnongsan.domain;

// Các loại trigger tự động trao voucher — dùng chung bởi VoucherAutoGrantRule (cấu hình admin),
// VoucherGrantLog (chống trao trùng) và VoucherGrantService (logic trao).
public enum AutoGrantType {
    WELCOME,            // đăng ký tài khoản mới
    FIRST_ORDER,        // đơn hàng PAID đầu tiên
    MILESTONE,          // đạt mốc số đơn PAID (milestoneOrderCount)
    CART_RECOVERY,      // nhắc giỏ hàng bị bỏ quên có sản phẩm đang khuyến mãi
    BIRTHDAY,           // sinh nhật hằng năm
    WIN_BACK,           // không mua hàng lâu ngày
    REFERRAL_REFERRER,  // thưởng cho người giới thiệu khi bạn được giới thiệu PAID đơn đầu tiên
    REFERRAL_REFEREE,   // thưởng cho người MỚI đăng ký bằng mã giới thiệu hợp lệ (trao ngay lúc tạo tài khoản)
    LUCKY_DRAW          // trúng giải rút thăm may mắn sau đơn hàng
}
