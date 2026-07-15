package com.app.webnongsan.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// Cấu hình ("rule") do admin thiết lập cho từng loại trao voucher tự động — KHÔNG phải 1 dòng
// Voucher trực tiếp (Voucher bắt buộc code/endDate cụ thể, không hợp với 1 rule tồn tại lâu dài
// không có ngày hết hạn cố định). Khi trigger nổ ra, VoucherGrantService đọc rule này để TẠO MỚI
// 1 dòng Voucher + UserVoucher cho đúng user đích — xem VoucherGrantService.
@Entity
@Table(name = "voucher_auto_grant_rules")
@Getter
@Setter
public class VoucherAutoGrantRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Loại trigger là bắt buộc")
    @Enumerated(EnumType.STRING)
    private AutoGrantType autoGrantType;

    // Chỉ có ý nghĩa khi autoGrantType = MILESTONE (mốc số đơn PAID, VD 5, 10)
    @Min(value = 1, message = "Mốc số đơn phải lớn hơn 0")
    private Integer milestoneOrderCount;

    @NotNull(message = "Loại giảm giá là bắt buộc")
    @Enumerated(EnumType.STRING)
    private Voucher.VoucherType discountType;

    @Positive(message = "Giá trị giảm giá phải lớn hơn 0")
    private Double discountValue;

    @PositiveOrZero(message = "Giá trị đơn hàng tối thiểu không được âm")
    private Double minimumOrderAmount;

    // Chỉ có ý nghĩa khi discountType = PERCENT
    @PositiveOrZero(message = "Trần giảm giá tối đa không được âm")
    private Double maxDiscountAmount;

    // Số ngày voucher được tạo ra có hiệu lực, TÍNH TỪ LÚC TRAO (không phải ngày cố định như Voucher)
    @Min(value = 1, message = "Số ngày hiệu lực phải lớn hơn 0")
    @NotNull(message = "Số ngày hiệu lực là bắt buộc")
    private Integer validityDays;

    // Tiền tố mã voucher tự sinh, VD "WELCOME" -> "WELCOME-42-A1B2"
    @NotBlank(message = "Tiền tố mã là bắt buộc")
    private String codePrefix;

    // Chỉ có ý nghĩa khi autoGrantType = CART_RECOVERY — cho phép nhiều rule cùng loại theo ngưỡng
    // giá sản phẩm bị bỏ quên (VD giảm 5% nếu giá < 150k, 10% nếu >= 150k). null = áp dụng mọi mức
    // giá (rule "catch-all", chỉ dùng khi không cần chia bậc). Xem VoucherAutoGrantRuleRepository.
    @PositiveOrZero(message = "Giá sản phẩm tối thiểu không được âm")
    private Double minProductPrice;

    private Boolean isActive = true;

    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = Instant.now();
        if (this.isActive == null) this.isActive = true;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    @AssertTrue(message = "Trần giảm giá tối đa chỉ áp dụng cho loại phần trăm")
    public boolean isMaxDiscountValidForType() {
        return discountType != Voucher.VoucherType.FIXED || maxDiscountAmount == null;
    }

    @AssertTrue(message = "Giá sản phẩm tối thiểu chỉ áp dụng cho loại Giỏ hàng bị bỏ quên")
    public boolean isMinProductPriceValidForType() {
        return autoGrantType == AutoGrantType.CART_RECOVERY || minProductPrice == null;
    }
}
