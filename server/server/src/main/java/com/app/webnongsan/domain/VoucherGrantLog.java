package com.app.webnongsan.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// Log chống trao trùng cho hệ trao voucher tự động — insert trước khi tạo Voucher/UserVoucher, bắt
// DataIntegrityViolationException nếu đã tồn tại (atomic, không cần lock, y hệt pattern
// UserService.create() bắt trùng email).
//
// LƯU Ý QUAN TRỌNG: periodKey KHÔNG được để null dù về mặt nghiệp vụ có loại "chỉ trao 1 lần trong
// đời" (WELCOME, FIRST_ORDER) — vì MySQL coi NHIỀU NULL là các giá trị PHÂN BIỆT trong unique index
// (NULL <> NULL), nên unique constraint (user_id, auto_grant_type, period_key) sẽ KHÔNG chặn được
// trùng nếu period_key=NULL. Quy ước: dùng chuỗi rỗng "" cho các loại không cần phân biệt theo chu kỳ
// (WELCOME, FIRST_ORDER) thay vì null — xem VoucherGrantService.
@Entity
@Table(name = "voucher_grant_logs", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "auto_grant_type", "period_key"})
})
@Getter
@Setter
public class VoucherGrantLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "auto_grant_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private AutoGrantType autoGrantType;

    // "" (chuỗi rỗng) = không phân biệt chu kỳ (chỉ trao 1 lần trong đời) — KHÔNG dùng null, xem lý do ở trên.
    @Column(name = "period_key", nullable = false)
    private String periodKey;

    private Instant grantedAt;

    @PrePersist
    public void onCreate() {
        this.grantedAt = Instant.now();
    }
}
