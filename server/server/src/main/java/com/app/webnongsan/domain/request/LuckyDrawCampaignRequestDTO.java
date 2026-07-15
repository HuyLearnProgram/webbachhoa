package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class LuckyDrawCampaignRequestDTO {
    @NotBlank(message = "Tên chiến dịch không được để trống")
    private String name;

    private Boolean isActive;

    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    private Instant startDate;

    @NotNull(message = "Thời gian kết thúc là bắt buộc")
    private Instant endDate;

    @PositiveOrZero(message = "Giá trị đơn tối thiểu không được âm")
    private Double minOrderAmount;
}
