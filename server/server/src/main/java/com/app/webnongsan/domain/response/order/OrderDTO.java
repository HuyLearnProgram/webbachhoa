package com.app.webnongsan.domain.response.order;

import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.List;


@Getter
@Setter
public class OrderDTO {
    private long id;
    private Instant orderTime;
    private Instant deliveryTime;
    private int status;
    private String paymentMethod;
    private String address;
    private String phone;
    private double total_price;
    private String userEmail;
    private String userName;
    private Long userId;
    private Double totalPrice;
    private List<OrderDetailDTO> items;

    private Long voucherId;
    private String voucherCode;
    private String voucherType; // "PERCENT" or "FIXED"
    private Double voucherDiscountValue;
}
