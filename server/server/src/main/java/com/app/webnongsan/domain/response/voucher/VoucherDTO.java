package com.app.webnongsan.domain.response.voucher;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor // Cần thêm
public class VoucherDTO {

    private Long id;
    private String code;
    private String type; // "PERCENT" / "FIXED"
    private Double discountValue;
    private Double minimumOrderAmount;
    private Integer maxUsage;
    private Double maxDiscountAmount;
    private Integer usedCount;
    private Boolean isActive;
    private Instant startDate;
    private Instant endDate;

    private Boolean isUsed;
    private Instant assignedAt;

    // null = áp dụng toàn bộ đơn hàng — khác null = chỉ áp dụng cho sản phẩm thuộc danh mục này.
    private Long categoryId;
    private String categoryName;

    // null = voucher tạo tay (chiến dịch công khai). Khác null = tên loại trigger tự động đã sinh ra
    // voucher này (VD "WELCOME", "REFERRAL_REFERRER") — FE map sang nhãn tiếng Việt qua
    // autoGrantTypeOptions (utils/constants.jsx) để hiện lý do được tặng trong ví voucher.
    private String autoGrantType;
}
