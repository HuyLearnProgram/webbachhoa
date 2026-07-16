package com.app.webnongsan.repository;

import com.app.webnongsan.domain.OrderDetail;

import com.app.webnongsan.domain.OrderDetailId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;



import java.time.Instant;
import java.util.List;
//@Repository
//public interface OrderDetailRepository extends JpaRepository<OrderDetail, OrderDetailId>, JpaSpecificationExecutor<OrderDetail> {
//
//    Page<OrderDetail> findByOrderId(long orderId, Pageable pageable);
////    List<OrderDetail> findByOrderId(long orderId);
////    boolean existsById(OrderDetailId id);
////    List<OrderDetail> findAllByOrderId(Long orderId);
//}


@Repository
public interface OrderDetailRepository extends JpaRepository<OrderDetail, Long>, JpaSpecificationExecutor<OrderDetail> {
        Page<OrderDetail> findByOrderId(long orderId, Pageable pageable);
        boolean existsById(OrderDetailId id);
        List<OrderDetail> findByOrderId(long orderId);

        // 1 query cho cả trang đơn hàng thay vì gọi findByOrderId() trong vòng lặp per-order (N+1) —
        // dùng ở OrderService.getOrderByCurrentUser().
        List<OrderDetail> findByOrderIdIn(List<Long> orderIds);

        // Top sản phẩm bán chạy trong khoảng thời gian (chỉ đơn PAID) — dùng cho biểu đồ "Top 5 sản
        // phẩm bán chạy" ở Overview admin khi lọc theo tháng/năm. Object[]{productId, productName, totalSold}
        @Query("SELECT od.product.id, od.product.productName, SUM(od.quantity) FROM OrderDetail od " +
                "WHERE od.order.orderTime >= :start AND od.order.orderTime < :end AND od.order.paymentStatus = 'PAID' " +
                "GROUP BY od.product.id, od.product.productName ORDER BY SUM(od.quantity) DESC")
        List<Object[]> findTopSellingProductsByMonth(@Param("start") Instant start, @Param("end") Instant end, Pageable pageable);
}

