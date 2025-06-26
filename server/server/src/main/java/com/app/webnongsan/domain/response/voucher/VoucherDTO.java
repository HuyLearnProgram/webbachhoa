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
    private Integer usedCount;
    private Boolean isActive;
    private Instant startDate;
    private Instant endDate;

    private Boolean isUsed;
    private Instant assignedAt;
}
