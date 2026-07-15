package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Input cho POST /vouchers/preview — dùng chung cho cả luồng chọn-từ-danh-sách (voucherId)
// và nhập-tay (code) ở Checkout, thuần đọc/validate, không mutate state.
@Getter
@Setter
public class VoucherPreviewRequestDTO {
    private Long voucherId; // dùng khi chọn từ danh sách
    private String code;    // dùng khi nhập tay — đúng 1 trong 2 (voucherId hoặc code) phải có

    @NotNull(message = "orderTotal không được để trống")
    @PositiveOrZero(message = "orderTotal không được âm")
    private Double orderTotal;

    // Chi tiết từng sản phẩm trong giỏ — chỉ thực sự cần khi voucher bị scope theo category, nhưng
    // FE luôn gửi kèm để BE tự quyết định có cần dùng hay không.
    private List<VoucherItemLineDTO> items;
}
