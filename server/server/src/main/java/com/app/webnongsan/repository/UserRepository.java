package com.app.webnongsan.repository;

import com.app.webnongsan.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    User findByEmail(String email);
    boolean existsByEmail(String email);
    User findByEmailAndRefreshToken(String email, String token);

    // Voucher sinh nhật (hệ trao voucher tự động, Phase 5) — user có ngày sinh trùng tháng/ngày hôm
    // nay (bỏ qua năm sinh). MONTH()/DAY() theo giờ server, chấp nhận sai số nhỏ theo múi giờ.
    @Query("SELECT u FROM User u WHERE u.birthday IS NOT NULL " +
            "AND FUNCTION('MONTH', u.birthday) = :month AND FUNCTION('DAY', u.birthday) = :day")
    List<User> findByBirthdayMonthAndDay(@Param("month") int month, @Param("day") int day);

    // Referral (Phase 6) — tra ngược người giới thiệu qua mã, kiểm tra mã hợp lệ lúc đăng ký,
    // đếm số người đã giới thiệu để hiện thống kê ở trang "Giới thiệu bạn bè".
    boolean existsByReferralCode(String referralCode);
    User findByReferralCode(String referralCode);
    long countByReferredBy(String referralCode);
}
