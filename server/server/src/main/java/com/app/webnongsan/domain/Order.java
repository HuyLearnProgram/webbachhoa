package com.app.webnongsan.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    private Instant orderTime;

    private Instant deliveryTime;

    private int status;

    private String paymentMethod;

    private String address;

    private String phone;

    private double total_price;

    // UNPAID, PENDING_PAYMENT, PAID, PAYMENT_FAILED, REFUND_PENDING, REFUNDED
    private String paymentStatus;

    private String vnpTxnRef;

    private String transactionNo;

    private Instant paidAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // FK chỉ dùng để truy vấn/thống kê ("đơn nào từng dùng voucher X") — KHÔNG dùng để hiển thị
    // số tiền đã giảm, vì voucher có thể bị admin sửa sau này. Dùng 4 field snapshot bên dưới.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_id")
    private Voucher voucher;

    // Snapshot tại thời điểm đặt hàng — nguồn sự thật duy nhất khi hiển thị lịch sử đơn hàng.
    private String voucherCode;
    private String voucherType; // "PERCENT" / "FIXED"
    @Column(columnDefinition = "DOUBLE DEFAULT 0")
    private Double voucherDiscountValue = 0.0;
    @Column(columnDefinition = "DOUBLE DEFAULT 0")
    private Double voucherDiscountAmount = 0.0; // số tiền THỰC TẾ đã giảm (đã áp trần nếu có)

    @PrePersist
    public void handleBeforeCreate() {
        this.orderTime = Instant.now();
    }
}
