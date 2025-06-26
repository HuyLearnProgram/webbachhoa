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

    @Query("SELECT SUM(o.total_price) FROM Order o WHERE o.status = :status")
    double sumTotalPriceByStatus(@Param("status") int status);
}

