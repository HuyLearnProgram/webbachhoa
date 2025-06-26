package com.app.webnongsan.service;

import com.app.webnongsan.domain.*;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.order.OrderDTO;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import com.app.webnongsan.repository.OrderDetailRepository;
import com.app.webnongsan.repository.OrderRepository;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminOrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderDetailRepository orderDetailRepository;

    @InjectMocks
    private OrderDetailService orderDetailService;

    @InjectMocks
    private OrderService orderService;

    private Order sampleOrder;
    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setEmail("test@example.com");
        sampleUser.setName("Test User");

        sampleOrder = new Order();
        sampleOrder.setId(1L);
        sampleOrder.setUser(sampleUser);
        sampleOrder.setStatus(0);
        sampleOrder.setPhone("123456789");
        sampleOrder.setTotal_price(100.0);
    }


    @Test
    void testCheckValidOrderDetailIdExists() {
        OrderDetailId id = new OrderDetailId(1L, 2L);
        when(orderDetailRepository.existsById(id)).thenReturn(true);

        boolean result = orderDetailService.checkValidOrderDetailId(1L, 2L);
        assertTrue(result);
        verify(orderDetailRepository).existsById(id);
    }


    @Test
    void testGetOrderDetailByIdWithPagination() {
        long orderId = 1L;
        Pageable pageable = PageRequest.of(0, 2);

        Product product = new Product();
        product.setProductName("Apple");
        product.setPrice(10000.0);
        product.setImageUrl("apple.png");

        Order order = new Order();
        order.setId(orderId);

        OrderDetail od = new OrderDetail();
        od.setOrder(order);
        od.setQuantity(3);
        od.setProduct(product);

        Page<OrderDetail> page = new PageImpl<>(List.of(od), pageable, 1);
        when(orderDetailRepository.findByOrderId(orderId, pageable)).thenReturn(page);

        PaginationDTO result = orderDetailService.getOrderDetailById(pageable, orderId);

        assertNotNull(result);
        assertNotNull(result.getMeta());
        assertEquals(1, result.getMeta().getPages());
        assertEquals(1, result.getMeta().getTotal());
        assertEquals(1, ((List<?>) result.getResult()).size());

        OrderDetailDTO dto = (OrderDetailDTO) ((List<?>) result.getResult()).get(0);
        assertEquals("Apple", dto.getProductName());
        assertEquals(3, dto.getQuantity());
        assertEquals(10000.0, dto.getUnit_price());
        assertEquals("apple.png", dto.getImageUrl());
        assertEquals(orderId, dto.getOrderId());
    }



    @Test
    void testGetOrderListByFilter_FilterByStatus() {
        // Arrange
        Order order1 = new Order();
        order1.setId(1L);
        order1.setStatus(0);
        order1.setUser(sampleUser);
        order1.setOrderTime(Instant.now());
        order1.setTotal_price(100.0);

        Order order2 = new Order();
        order2.setId(2L);
        order2.setStatus(1);
        order2.setUser(sampleUser);
        order2.setOrderTime(Instant.now());
        order2.setTotal_price(200.0);

        // Chỉ trả về order có status = 0
        List<Order> filteredOrders = Arrays.asList(order1);
        Page<Order> orderPage = new PageImpl<>(filteredOrders,
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "orderTime")), 1);

        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(orderPage);

        // Tạo Specification cho status = 0
        Specification<Order> spec = (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("status"), 0);

        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "orderTime"));

        // Act - Gọi trực tiếp service method getAll
        PaginationDTO result = orderService.getAll(spec, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getMeta().getTotal());
        assertEquals(1, result.getMeta().getPage());
        assertEquals(10, result.getMeta().getPageSize());
        assertEquals(1, result.getMeta().getPages());

        List<OrderDTO> orderDTOs = (List<OrderDTO>) result.getResult();
        assertEquals(1, orderDTOs.size());
        assertEquals(0, orderDTOs.get(0).getStatus());
        assertEquals(1L, orderDTOs.get(0).getId());
        assertEquals(sampleUser.getEmail(), orderDTOs.get(0).getUserEmail());

        verify(orderRepository).findAll(any(Specification.class), eq(pageable));
    }



    @Test
    void testGetOrderByIdWhenExists() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
        Order result = orderService.get(1L);
        assertNotNull(result);
        assertEquals(1L, result.getId());
    }


    @Test
    void testPendingOrderToDeliveryOrder(){
        // Arrange
        sampleOrder.setStatus(0); // Đảm bảo trạng thái ban đầu là 0 (Pending)

        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(sampleOrder);

        // Act
        Order result = orderService.get(1L);

        // Kiểm tra trạng thái ban đầu
        assertEquals(0, result.getStatus());

        // Thay đổi trạng thái từ 0 sang 1
        result.setStatus(1);

        // Lưu order
        orderService.save(result);

        // Assert
        assertEquals(1, result.getStatus());

        // Verify interactions
        verify(orderRepository).findById(1L);
        verify(orderRepository).save(argThat(order ->
                order.getStatus() == 1
        ));
    }
    @Test
    void testDeliveryOrderToSuccessOrder(){
        // Arrange
        sampleOrder.setStatus(1);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(sampleOrder);

        // Act
        Order result = orderService.get(1L);

        // Kiểm tra trạng thái ban đầu
        assertEquals(1, result.getStatus());


        result.setStatus(2);

        // Lưu order
        orderService.save(result);

        // Assert
        assertEquals(2, result.getStatus());

        // Verify interactions
        verify(orderRepository).findById(1L);
        verify(orderRepository).save(argThat(order ->
                order.getStatus() == 2
        ));
    }

    @Test
    void testPendingOrderToCancelOrder(){
        // Arrange
        sampleOrder.setStatus(0);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(sampleOrder);

        // Act
        Order result = orderService.get(1L);

        // Kiểm tra trạng thái ban đầu
        assertEquals(0, result.getStatus());


        result.setStatus(3);

        // Lưu order
        orderService.save(result);

        // Assert
        assertEquals(3, result.getStatus());

        // Verify interactions
        verify(orderRepository).findById(1L);
        verify(orderRepository).save(argThat(order ->
                order.getStatus() == 3
        ));
    }


    @Test
    void testOrder_FindOrder_WhenExists() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
        Optional<OrderDTO> result = orderService.findOrder(1L);
        assertTrue(result.isPresent());
        assertEquals(sampleOrder.getId(), result.get().getId());
    }


    @Test
    void testUpdatePhoneAndAddressSuccess() throws ResourceInvalidException {
        // Arrange
        Order existingOrder = new Order();
        existingOrder.setId(1L);
        existingOrder.setPhone("0123456789");
        existingOrder.setAddress("123 Old Street");
        existingOrder.setStatus(0);
        existingOrder.setUser(sampleUser);
        existingOrder.setTotal_price(100.0);
        existingOrder.setOrderTime(Instant.now());

        // Mock repository behavior
        when(orderRepository.findById(1L)).thenReturn(Optional.of(existingOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(existingOrder);

        // Act - Gọi trực tiếp service method để update
        Order result = orderService.get(1L);
        String newPhone = "921021";
        String newAddress = "1978 5 Hải Hoàng Đường Thái Phúc";
        result.setPhone(newPhone);
        result.setAddress("newAddress");
        orderService.save(result);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals(newPhone, result.getPhone());
        assertEquals("newAddress", result.getAddress());
        assertEquals(0, result.getStatus()); // Status không thay đổi
        assertEquals(sampleUser, result.getUser()); // User không thay đổi

        // Verify interactions
        verify(orderRepository).findById(1L);
        verify(orderRepository).save(argThat(order ->
                order.getPhone().equals(newPhone) &&
                        order.getAddress().equals("newAddress")
        ));
    }

}
