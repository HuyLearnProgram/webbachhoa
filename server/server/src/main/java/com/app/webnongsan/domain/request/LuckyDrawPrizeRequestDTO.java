package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LuckyDrawPrizeRequestDTO {
    @NotBlank(message = "Tên giải thưởng không được để trống")
    private String label;

    // null = giải "trượt"
    private Long voucherAutoGrantRuleId;

    @NotNull(message = "Trọng số là bắt buộc")
    @Min(value = 1, message = "Trọng số phải lớn hơn 0")
    private Integer probabilityWeight;

    // null = không giới hạn số lượng
    @Min(value = 0, message = "Tổng số lượng không được âm")
    private Integer totalQuantity;
}
