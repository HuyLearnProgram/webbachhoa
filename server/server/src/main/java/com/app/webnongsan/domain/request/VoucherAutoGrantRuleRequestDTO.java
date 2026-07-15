package com.app.webnongsan.domain.request;

import com.app.webnongsan.domain.AutoGrantType;
import com.app.webnongsan.domain.Voucher;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

// Input tạo/sửa rule trao voucher tự động qua Admin — tách khỏi entity để tránh mass-assignment.
@Getter
@Setter
public class VoucherAutoGrantRuleRequestDTO {
    @NotNull(message = "Loại trigger là bắt buộc")
    private AutoGrantType autoGrantType;

    @Min(value = 1, message = "Mốc số đơn phải lớn hơn 0")
    private Integer milestoneOrderCount;

    @NotNull(message = "Loại giảm giá là bắt buộc")
    private Voucher.VoucherType discountType;

    @Positive(message = "Giá trị giảm giá phải lớn hơn 0")
    private Double discountValue;

    @PositiveOrZero(message = "Giá trị đơn hàng tối thiểu không được âm")
    private Double minimumOrderAmount;

    @PositiveOrZero(message = "Trần giảm giá tối đa không được âm")
    private Double maxDiscountAmount;

    @Min(value = 1, message = "Số ngày hiệu lực phải lớn hơn 0")
    @NotNull(message = "Số ngày hiệu lực là bắt buộc")
    private Integer validityDays;

    @NotBlank(message = "Tiền tố mã là bắt buộc")
    private String codePrefix;

    // Chỉ có ý nghĩa khi autoGrantType = CART_RECOVERY
    @PositiveOrZero(message = "Giá sản phẩm tối thiểu không được âm")
    private Double minProductPrice;

    private Boolean isActive;
}
