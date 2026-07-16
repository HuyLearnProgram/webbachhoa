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

    // Trần giảm giá tối đa — chỉ có ý nghĩa với type=PERCENT (voucher FIXED không cần trần vì
    // discountValue đã là số tiền cố định). null = không giới hạn trần.
    @PositiveOrZero(message = "Trần giảm giá tối đa không được âm")
    private Double maxDiscountAmount;

    @Min(value = 0, message = "Số lượt đã dùng không được âm")
    private Integer usedCount = 0;

    @Column(columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean isActive = true;

    // true = voucher công khai, hiện trong danh sách "voucher công khai" cho mọi user tự lưu (hành vi
    // gốc trước khi có hệ trao voucher tự động). false = voucher do hệ thống tự sinh riêng cho 1 user
    // cụ thể (welcome/first-order/milestone/cart-recovery/birthday/win-back/referral/lucky-draw) —
    // không được lọt vào danh sách công khai dù isActive=true, vì nó chỉ dành cho đúng 1 người.
    @Column(columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean isPublic = true;

    // true = hiện trên banner "Flash Sale" trang chủ (Phase 3 hệ trao voucher tự động). Admin tick tay
    // khi tạo/sửa voucher — không phải MỌI voucher active/public đều nên nổi bật làm flash-sale.
    @Column(columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean isFlashSale = false;

    // null = áp dụng cho toàn bộ đơn hàng (hành vi gốc). Khác null = chỉ áp dụng cho sản phẩm thuộc
    // đúng danh mục này — VoucherValidationService tính giảm giá/đơn tối thiểu trên tổng tiền của
    // riêng danh mục này trong giỏ, không phải toàn đơn.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicable_category_id")
    private Category applicableCategory;

    // null = voucher tạo tay qua trang admin (isPublic=true, chiến dịch công khai). Khác null = do
    // VoucherGrantService tự sinh theo 1 rule cụ thể — cho user/admin biết voucher này "vì sao mà có"
    // (VD "Thưởng người giới thiệu bạn bè") thay vì chỉ thấy mã trông ngẫu nhiên trong ví/danh sách.
    @Enumerated(EnumType.STRING)
    private AutoGrantType autoGrantType;

    private Instant startDate;

    // KHÔNG @Future ở entity — validate "phải ở tương lai" chỉ có ý nghĩa lúc TẠO MỚI, đã đủ ở
    // VoucherRequestDTO. Nếu để ở đây, admin sửa (VD chỉ đổi isActive=false) 1 voucher đã hết hạn sẽ có
    // rủi ro ConstraintViolationException nếu Hibernate lifecycle validation từng được bật.
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
        return endDate != null && Instant.now().isAfter(endDate);
    }
    @JsonIgnore
    public boolean isActiveNow() {
        return Boolean.TRUE.equals(isActive)
                && startDate != null && endDate != null
                && Instant.now().isAfter(startDate)
                && Instant.now().isBefore(endDate);
    }
    public static enum VoucherType {
        PERCENT,   // phần trăm (%)
        FIXED      // giá trị cố định (VNĐ)
    }
}