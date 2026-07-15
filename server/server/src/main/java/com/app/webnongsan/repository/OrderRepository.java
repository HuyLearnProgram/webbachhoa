package com.app.webnongsan.repository;
import com.app.webnongsan.domain.Order;
import com.app.webnongsan.domain.response.cart.CartItemDTO;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
//    @Query("SELECT new com.app.webnongsan.domain.response.order.OrderDetailDTO" +
//            "(p.id, p.productName, od.quantity, od.unit_price, p.imageUrl, p.category.name, o.id, o.orderTime, o.status) " +
//            "FROM OrderDetail od JOIN od.order o JOIN od.product p " +
//            "WHERE o.user.id = :userId "+
//            "AND (:status IS NULL OR o.status = :status) " +
//            "ORDER BY o.orderTime DESC ")
//    Page<OrderDetailDTO> findOrderItemsByUserId(
//            @Param("userId") Long userId,
//            @Param("status") Integer status,
//            Pageable pageable);
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND (:status IS NULL OR o.status = :status) ORDER BY orderTime desc")
    Page<Order> findOrdersWithOptionalStatus(@Param("userId") Long userId, @Param("status") Integer status, Pageable pageable);

    @Query(value = "CALL GetRevenueByWeekCycle(:month, :year)", nativeQuery = true)
    List<Object[]> getMonthlyRevenue(int month, int year);

    @Query("SELECT COALESCE(SUM(o.total_price), 0) FROM Order o WHERE o.status = :status")
    double sumTotalPriceByStatus(@Param("status") int status);

    @Query("SELECT COALESCE(SUM(o.total_price), 0) FROM Order o WHERE o.paymentStatus = :paymentStatus")
    double sumTotalPriceByPaymentStatus(@Param("paymentStatus") String paymentStatus);

    long countByStatus(int status);

    long countByPaymentStatus(String paymentStatus);

    // Bản có lọc theo tháng/năm của 4 method trên — dùng cho Overview admin (biểu đồ "Đơn hàng theo
    // trạng thái"/"Giá trị đơn hàng theo tình trạng thanh toán" khi chọn tháng/năm cụ thể).
    @Query("SELECT COALESCE(SUM(o.total_price), 0) FROM Order o WHERE o.status = :status AND o.orderTime >= :start AND o.orderTime < :end")
    double sumTotalPriceByStatusAndMonth(@Param("status") int status, @Param("start") java.time.Instant start, @Param("end") java.time.Instant end);

    long countByStatusAndOrderTimeBetween(int status, java.time.Instant start, java.time.Instant end);

    @Query("SELECT COALESCE(SUM(o.total_price), 0) FROM Order o WHERE o.paymentStatus = :paymentStatus AND o.orderTime >= :start AND o.orderTime < :end")
    double sumTotalPriceByPaymentStatusAndMonth(@Param("paymentStatus") String paymentStatus, @Param("start") java.time.Instant start, @Param("end") java.time.Instant end);

    long countByPaymentStatusAndOrderTimeBetween(String paymentStatus, java.time.Instant start, java.time.Instant end);

    long countByUser_Id(Long userId);

    // Đếm số đơn PAID của 1 user — dùng cho hệ trao voucher tự động (FIRST_ORDER/MILESTONE), khác
    // countByUser_Id (đếm MỌI đơn bất kể trạng thái) và countByPaymentStatus (đếm toàn hệ thống).
    long countByUser_IdAndPaymentStatus(Long userId, String paymentStatus);

    // Win-back (hệ trao voucher tự động, Phase 5): user CÓ ít nhất 1 đơn trong quá khứ nhưng đơn gần
    // nhất đã cũ hơn cutoff — không nhắm vào user chưa từng mua (đó là việc của WELCOME/FIRST_ORDER).
    // Object[]{userId (Long), lastOrderTime (Instant)}
    @Query("SELECT o.user.id, MAX(o.orderTime) FROM Order o GROUP BY o.user.id HAVING MAX(o.orderTime) < :cutoff")
    List<Object[]> findUsersWithLastOrderBefore(@Param("cutoff") java.time.Instant cutoff);

    // Referral (Phase 6) — đếm số người được giới thiệu (referredBy = mã của mình) ĐÃ có ít nhất 1
    // đơn PAID, dùng cho thống kê trang "Giới thiệu bạn bè" của user.
    @Query("SELECT COUNT(DISTINCT o.user.id) FROM Order o WHERE o.user.referredBy = :referralCode AND o.paymentStatus = 'PAID'")
    long countConvertedReferredUsers(@Param("referralCode") String referralCode);

    Optional<Order> findByVnpTxnRef(String vnpTxnRef);

    @Query("SELECT COUNT(DISTINCT od.order.id) FROM OrderDetail od WHERE od.product.id = :productId AND od.order.status = :status")
    long countOrdersByProductIdAndStatus(@Param("productId") Long productId, @Param("status") int status);

    // Dùng để chặn hard-delete voucher đã từng được dùng trong đơn hàng thật
    boolean existsByVoucher_Id(Long voucherId);

    // Tổng tiền đã tiết kiệm nhờ voucher của 1 user (chỉ tính đơn PAID, khớp phạm vi "Tổng chi tiêu")
    // — hiện ở trang "Ví voucher" khách hàng lẫn popup chi tiết chi tiêu admin.
    @Query("SELECT COALESCE(SUM(o.voucherDiscountAmount), 0) FROM Order o WHERE o.user.id = :userId AND o.paymentStatus = 'PAID'")
    double sumVoucherSavingsByUser(@Param("userId") Long userId);
}

