package com.app.webnongsan.domain.request;

import com.app.webnongsan.domain.Voucher;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// Input tạo/sửa voucher qua Admin — tách khỏi entity Voucher để tránh mass-assignment (client
// không được tự set id/usedCount/createdBy qua request body).
@Getter
@Setter
public class VoucherRequestDTO {
    @NotBlank(message = "Mã giảm giá không được để trống")
    private String code;

    @NotNull(message = "Loại giảm giá là bắt buộc")
    private Voucher.VoucherType type;

    @Positive(message = "Giá trị giảm giá phải lớn hơn 0")
    private Double discountValue;

    @PositiveOrZero(message = "Giá trị đơn hàng tối thiểu không được âm")
    private Double minimumOrderAmount;

    @Min(value = 0, message = "Số lượt sử dụng tối đa không được âm")
    private Integer maxUsage; // null = không giới hạn

    @PositiveOrZero(message = "Trần giảm giá tối đa không được âm")
    private Double maxDiscountAmount; // null = không trần, chỉ hợp lệ khi type=PERCENT

    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    private Instant startDate;

    @NotNull(message = "Thời gian kết thúc là bắt buộc")
    @Future(message = "Thời gian kết thúc phải ở tương lai")
    private Instant endDate;

    private Boolean isActive;

    // Hiện trên banner Flash Sale trang chủ hay không — không liên quan isPublic (admin không tự set
    // isPublic qua DTO này, hệ trao voucher tự động mới cần tới isPublic=false).
    private Boolean isFlashSale;

    // null = áp dụng toàn bộ đơn hàng. Khác null = chỉ áp dụng cho sản phẩm thuộc đúng danh mục này.
    private Long categoryId;

    @AssertTrue(message = "Thời gian kết thúc phải sau thời gian bắt đầu")
    private boolean isValidDateRange() {
        return startDate != null && endDate != null && endDate.isAfter(startDate);
    }
}
