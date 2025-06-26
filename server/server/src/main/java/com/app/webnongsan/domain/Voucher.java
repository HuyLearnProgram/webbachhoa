package com.app.webnongsan.domain;

import com.app.webnongsan.util.SecurityUtil;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "vouchers")
@Getter
@Setter
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Mã giảm giá không được để trống")
    @Column(unique = true)
    private String code;

    @NotNull(message = "Loại giảm giá là bắt buộc") // PERCENT hoặc FIXED
    @Enumerated(EnumType.STRING)
    private VoucherType type;

    @Positive(message = "Giá trị giảm giá phải lớn hơn 0")
    private Double discountValue;

    @PositiveOrZero(message = "Giá trị đơn hàng tối thiểu không được âm")
    private Double minimumOrderAmount;

    @Min(value = 0, message = "Số lượt sử dụng tối đa không được âm")
    private Integer maxUsage;

    @Min(value = 0, message = "Số lượt đã dùng không được âm")
    private Integer usedCount = 0;

    private Boolean isActive = true;

    private Instant startDate;

    @Future(message = "Thời gian kết thúc phải ở tương lai")
    private Instant endDate;

    private Instant createdAt;
    private Instant updatedAt;

    private String createdBy;
    private String updatedBy;

    @OneToMany(mappedBy = "voucher", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Order> orders;

    @OneToMany(mappedBy = "voucher", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<UserVoucher> userVouchers;

    @PrePersist
    public void onCreate() {
        this.createdAt = Instant.now();
        this.createdBy = SecurityUtil.getCurrentUserLogin().orElse("system");
        // Nếu startDate chưa được set thì gán là now
        if (this.startDate == null) {
            this.startDate = Instant.now();
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
        this.updatedBy = SecurityUtil.getCurrentUserLogin().orElse("system");
    }
    @AssertTrue(message = "Thời gian kết thúc phải sau thời gian bắt đầu")
    public boolean isValidDateRange() {
        return startDate != null && endDate != null && endDate.isAfter(startDate);
    }
    @JsonIgnore
    public boolean isExpired() {
        return Instant.now().isAfter(endDate);
    }
    @JsonIgnore
    public boolean isActiveNow() {
        return Boolean.TRUE.equals(isActive)
                && Instant.now().isAfter(startDate)
                && Instant.now().isBefore(endDate);
    }
    public static enum VoucherType {
        PERCENT,   // phần trăm (%)
        FIXED      // giá trị cố định (VNĐ)
    }
}