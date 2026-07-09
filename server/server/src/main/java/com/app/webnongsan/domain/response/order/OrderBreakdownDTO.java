package com.app.webnongsan.domain.response.order;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class OrderBreakdownDTO {
    private List<StatusCountDTO> byStatus;
    private List<PaymentStatusCountDTO> byPaymentStatus;
}
