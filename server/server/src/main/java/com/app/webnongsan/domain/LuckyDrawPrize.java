package com.app.webnongsan.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

// 1 giải thưởng trong 1 chiến dịch rút thăm — voucherAutoGrantRule NULL nghĩa là "trượt, chúc may
// mắn lần sau" (bắt buộc phải có ít nhất 1 giải "trượt" với trọng số > 0 để kiểm soát chi phí).
@Entity
@Table(name = "lucky_draw_prizes")
@Getter
@Setter
public class LuckyDrawPrize {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    @JsonIgnore
    private LuckyDrawCampaign campaign;

    @NotBlank(message = "Tên giải thưởng không được để trống")
    private String label;

    // null = "trượt" (không trao gì) — ngược lại trỏ tới rule để VoucherGrantService tạo voucher thật
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_auto_grant_rule_id")
    private VoucherAutoGrantRule voucherAutoGrantRule;

    @Min(value = 1, message = "Trọng số phải lớn hơn 0")
    private Integer probabilityWeight;

    // null = không giới hạn số lượng
    @Min(value = 0, message = "Tổng số lượng không được âm")
    private Integer totalQuantity;

    @Min(value = 0, message = "Số lượng còn lại không được âm")
    private Integer remainingQuantity;
}
