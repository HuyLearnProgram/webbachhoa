package com.app.webnongsan.domain.response.voucher;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// Response cho POST /vouchers/preview — không có field "valid": endpoint chỉ trả 200 khi hợp lệ,
// mọi trường hợp không hợp lệ ném ResourceInvalidException (400 kèm message nghiệp vụ rõ ràng),
// FE phân biệt qua HTTP status thay vì đọc field boolean thừa.
@Getter
@Setter
@AllArgsConstructor
public class VoucherPreviewResponseDTO {
    private Long voucherId;
    private String code;
    private String type; // "PERCENT" / "FIXED"
    private Double discountValue;
    private Double discountAmount;      // đã tính sẵn, đã áp trần maxDiscountAmount nếu có
    private Double totalAfterDiscount;  // orderTotal - discountAmount, đã clamp >= 0
    private Double minimumOrderAmount;
    private Instant startDate;
    private Instant endDate;

    // null = áp dụng toàn bộ đơn hàng — khác null = chỉ áp dụng cho sản phẩm thuộc danh mục này.
    private Long categoryId;
    private String categoryName;
}
