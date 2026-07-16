package com.app.webnongsan.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

// Chiến dịch "Rút thăm may mắn sau đơn hàng" (Phase 7 hệ trao voucher tự động).
@Entity
@Table(name = "lucky_draw_campaigns")
@Getter
@Setter
public class LuckyDrawCampaign {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Tên chiến dịch không được để trống")
    private String name;

    @Column(columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean isActive = true;

    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    private Instant startDate;

    @NotNull(message = "Thời gian kết thúc là bắt buộc")
    private Instant endDate;

    // Đơn hàng phải đạt giá trị tối thiểu này mới được quay — null = không yêu cầu
    @PositiveOrZero(message = "Giá trị đơn tối thiểu không được âm")
    private Double minOrderAmount;

    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id asc")
    private List<LuckyDrawPrize> prizes;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "campaign")
    private List<LuckyDrawSpin> spins;

    @AssertTrue(message = "Thời gian kết thúc phải sau thời gian bắt đầu")
    public boolean isValidDateRange() {
        return startDate != null && endDate != null && endDate.isAfter(startDate);
    }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public boolean isActiveNow() {
        return Boolean.TRUE.equals(isActive)
                && startDate != null && endDate != null
                && Instant.now().isAfter(startDate) && Instant.now().isBefore(endDate);
    }
}
