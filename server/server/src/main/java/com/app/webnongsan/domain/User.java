package com.app.webnongsan.domain;

import com.app.webnongsan.util.SecurityUtil;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @NotBlank(message = "Tên không được để trống")
    private String name;

    @NotBlank(message = "Không được để trống email")
    @Column(unique = true)
    private String email;

//    @NotBlank(message = "Không được để trống password")
    // Phòng vệ nhiều lớp — FORCE_LAZY_LOADING (Hibernate6Module) khiến mọi field không @JsonIgnore
    // trên entity đều có nguy cơ lộ ra JSON nếu code tương lai lỡ serialize User trực tiếp thay vì
    // qua DTO. password (bcrypt hash) không bao giờ cần trả về client.
    @JsonIgnore
    private String password;

    private int status;

    private String phone;

    private String address;
    private String provider;
    private String providerId;
    private String avatarUrl;

    // Thời điểm tạo tài khoản — phục vụ hệ trao voucher tự động (welcome, mốc "tài khoản mới N ngày").
    // Dòng cũ trước khi thêm cột này sẽ có giá trị NULL, không backfill vì không có giá trị suy ra đúng.
    private Instant createdAt;

    // Ngày sinh (tuỳ chọn, user tự cập nhật ở trang cá nhân) — phục vụ voucher sinh nhật tự động.
    private LocalDate birthday;

    // Mã giới thiệu của CHÍNH user này — tự sinh lúc đăng ký, dùng để chia sẻ cho bạn bè.
    @Column(unique = true)
    private String referralCode;

    // referralCode của NGƯỜI ĐÃ GIỚI THIỆU user này (nếu có, nhập lúc đăng ký) — không FK, decouple
    // đơn giản, tra ngược qua UserRepository.findByReferralCode khi cần.
    private String referredBy;

    // refreshToken là bí mật xác thực (JWT) — cùng lý do @JsonIgnore như password ở trên.
    @Column(columnDefinition = "MEDIUMTEXT")
    @JsonIgnore
    private String refreshToken;
    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "user")
    private List<Feedback> feedbacks;

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "user")
    private List<Order> orders;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<UserVoucher> userVouchers;

    // Không lưu DB - chỉ dùng tạm để truyền lý do khoá tài khoản vào email thông báo
    @Transient
    private String lockReason;
}
