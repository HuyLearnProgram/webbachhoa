package com.app.webnongsan.domain.response.order;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class OverviewStatsDTO {
    private double totalProfit;
    private long totalUsers;
    private long totalProducts;
    private long totalOrders;
}
