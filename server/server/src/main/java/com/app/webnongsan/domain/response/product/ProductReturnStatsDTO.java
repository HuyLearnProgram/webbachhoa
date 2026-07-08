package com.app.webnongsan.domain.response.product;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductReturnStatsDTO {
    private long deliveredCount;
    private long returnedCount;
    private double returnRate;
}
