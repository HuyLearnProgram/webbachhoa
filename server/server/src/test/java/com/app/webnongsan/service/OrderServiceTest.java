package com.app.webnongsan.service;

import com.app.webnongsan.domain.*;
import com.app.webnongsan.domain.response.order.OrderDTO;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import com.app.webnongsan.repository.*;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
@Disabled("Tạm thời disable toàn bộ OrderServiceTest")
public class OrderServiceTest {
    @InjectMocks
    private OrderService orderService;

    @Mock
    private ProductRepository productRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private UserService userService;
    @Mock private VoucherRepository voucherRepository;
    @Mock private UserVoucherRepository userVoucherRepository;
    @Mock private OrderDetailRepository orderDetailRepository;

    private User mockUser;

    @BeforeEach
    void setup() {
        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("test@gmail.com");

        Mockito.when(userService.getUserByUsername(Mockito.any())).thenReturn(mockUser);
    }

    @Test
    void TC01_createOrderWithoutVoucher_shouldSucceed() throws ResourceInvalidException {
        // Mock sản phẩm
        Product product = new Product();
        product.setId(1L);
        product.setProductName("SP1");
        product.setPrice(100.0);
        product.setQuantity(10);

        // Mock người dùng
        User user = new User();
        user.setId(1L);
        user.setEmail("test@gmail.com");

        // Mock các repository gọi DB
        Mockito.when(userService.getUserByUsername(Mockito.any())).thenReturn(user);
        Mockito.when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        Mockito.when(orderRepository.save(Mockito.any(Order.class)))
                .thenAnswer(invocation -> {
                    Order order = invocation.getArgument(0);
                    order.setId(999L); // Giả lập DB gán ID
                    return order;
                });
        Mockito.when(orderDetailRepository.save(Mockito.any())).thenReturn(null);

        // Chuẩn bị DTO
        OrderDetailDTO item = new OrderDetailDTO();
        item.setProductId(1L);
        item.setQuantity(2); // 2 * 100 = 200.0

        OrderDTO dto = new OrderDTO();
        dto.setAddress("123 Đường A");
        dto.setPhone("0900000000");
        dto.setPaymentMethod("COD");
        dto.setUserId(1L);
        dto.setItems(List.of(item));

        // Gọi service
        Order result = orderService.create(dto);

        // Kiểm tra kết quả
        assertNotNull(result);
        assertEquals(999L, result.getId());
        assertEquals(200.0, result.getTotal_price());
    }
    @Test
    void TC02_createOrderWithPercentVoucher_shouldApplyDiscountCorrectly() throws ResourceInvalidException {
        // 1. Mock sản phẩm
        Product product = new Product();
        product.setId(1L);
        product.setProductName("SP1");
        product.setPrice(100.0);
        product.setQuantity(10); // đủ hàng

        // 2. Mock voucher phần trăm 10%
        Voucher voucher = new Voucher();
        voucher.setId(100L);
        voucher.setDiscountValue(10.0); // 10%
        voucher.setType(Voucher.VoucherType.PERCENT);
        voucher.setMinimumOrderAmount(0.0);
        voucher.setUsedCount(0);
        voucher.setIsActive(true);
        voucher.setStartDate(Instant.now().minus(1, ChronoUnit.DAYS));
        voucher.setEndDate(Instant.now().plus(1, ChronoUnit.DAYS));

        // giả định hợp lệ

        // 3. Mock UserVoucher
        UserVoucher userVoucher = new UserVoucher();
        userVoucher.setVoucher(voucher);
        userVoucher.setUser(mockUser);
        userVoucher.setIsUsed(false); // chưa dùng

        // 4. Mock repository
        Mockito.when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        Mockito.when(voucherRepository.findById(100L)).thenReturn(Optional.of(voucher));
        Mockito.when(userVoucherRepository.findByUserIdAndVoucherId(1L, 100L)).thenReturn(Optional.of(userVoucher));
        Mockito.when(orderRepository.save(Mockito.any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(888L);
            return order;
        });
        Mockito.when(orderDetailRepository.save(Mockito.any())).thenReturn(null);
        Mockito.when(voucherRepository.save(Mockito.any())).thenReturn(voucher);
        Mockito.when(userVoucherRepository.save(Mockito.any())).thenReturn(userVoucher);

        // 5. Chuẩn bị DTO đơn hàng
        OrderDetailDTO item = new OrderDetailDTO();
        item.setProductId(1L);
        item.setQuantity(2); // 2 * 100 = 200

        OrderDTO dto = new OrderDTO();
        dto.setAddress("123 Đường B");
        dto.setPhone("0901234567");
        dto.setPaymentMethod("VNPAY");
        dto.setUserId(1L);
        dto.setItems(List.of(item));
        dto.setVoucherId(100L);

        // 6. Gọi service
        Order result = orderService.create(dto);

        // 7. Kiểm tra kết quả
        assertNotNull(result);
        assertEquals(888L, result.getId());
        assertEquals(180.0, result.getTotal_price()); // 200 - 10% = 180
    }
    @Test
    void TC03_createOrderWithNonExistentProduct_shouldThrowException() {
        // Given: OrderDetailDTO có productId không tồn tại
        OrderDetailDTO item = new OrderDetailDTO();
        item.setProductId(999L);  // giả lập ID không tồn tại
        item.setQuantity(1);

        OrderDTO dto = new OrderDTO();
        dto.setUserId(1L);
        dto.setAddress("456 Đường C");
        dto.setPhone("0912345678");
        dto.setPaymentMethod("COD");
        dto.setItems(List.of(item));

        // Mock người dùng hợp lệ
        Mockito.when(userService.getUserByUsername(Mockito.any()))
                .thenReturn(mockUser);

        // Không mock productRepository.findById → sẽ trả về Optional.empty()

        // When & Then
        ResourceInvalidException exception = assertThrows(ResourceInvalidException.class, () -> {
            orderService.create(dto);
        });

        assertEquals("Sản phẩm không tồn tại", exception.getMessage());
    }
    @Test
    void TC04_createOrderWithOutOfStockProduct_shouldThrowException() {
        // Given: Sản phẩm có quantity = 0
        Product outOfStockProduct = new Product();
        outOfStockProduct.setId(2L);
        outOfStockProduct.setProductName("SP2");
        outOfStockProduct.setPrice(150.0);
        outOfStockProduct.setQuantity(0); // hết hàng

        OrderDetailDTO item = new OrderDetailDTO();
        item.setProductId(2L);
        item.setQuantity(1);

        OrderDTO dto = new OrderDTO();
        dto.setUserId(1L);
        dto.setAddress("456 Đường D");
        dto.setPhone("0933222111");
        dto.setPaymentMethod("COD");
        dto.setItems(List.of(item));

        // Mock người dùng hợp lệ
        Mockito.when(userService.getUserByUsername(Mockito.any()))
                .thenReturn(mockUser);

        // Mock sản phẩm nhưng hết hàng
        Mockito.when(productRepository.findById(2L)).thenReturn(Optional.of(outOfStockProduct));

        // When & Then
        ResourceInvalidException exception = assertThrows(ResourceInvalidException.class, () -> {
            orderService.create(dto);
        });

        assertEquals("Sản phẩm không còn hàng", exception.getMessage());
    }
    @Test
    void TC05_createOrderWithInvalidVoucherId_shouldThrowException() {
        // Mock sản phẩm hợp lệ
        Product product = new Product();
        product.setId(1L);
        product.setProductName("SP1");
        product.setPrice(100.0);
        product.setQuantity(5);

        OrderDetailDTO item = new OrderDetailDTO();
        item.setProductId(1L);
        item.setQuantity(1);

        OrderDTO dto = new OrderDTO();
        dto.setUserId(1L);
        dto.setAddress("123 Đường Test");
        dto.setPhone("0900999888");
        dto.setPaymentMethod("BANK");
        dto.setItems(List.of(item));
        dto.setVoucherId(1000L); // Voucher ID không tồn tại

        // Mock user và sản phẩm
        Mockito.when(userService.getUserByUsername(Mockito.any())).thenReturn(mockUser);
        Mockito.when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        Mockito.when(voucherRepository.findById(1000L)).thenReturn(Optional.empty()); // Không tồn tại

        // Gọi service và kiểm tra exception
        ResourceInvalidException exception = assertThrows(ResourceInvalidException.class, () -> {
            orderService.create(dto);
        });

        assertEquals("Voucher không tồn tại", exception.getMessage());
    }
    @Test
    void TC06_createOrderWithInactiveVoucher_shouldThrowException() {
        // 1. Mock sản phẩm hợp lệ
        Product product = new Product();
        product.setId(1L);
        product.setProductName("SP1");
        product.setPrice(100.0);
        product.setQuantity(5);

        // 2. Mock voucher không còn hiệu lực
        Voucher inactiveVoucher = Mockito.mock(Voucher.class);
        //Mockito.when(inactiveVoucher.getId()).thenReturn(100L);
        Mockito.when(inactiveVoucher.isActiveNow()).thenReturn(false); // Không hợp lệ

        // 3. Chỉ mock những gì cần thiết
        Mockito.when(voucherRepository.findById(100L)).thenReturn(Optional.of(inactiveVoucher));
        Mockito.when(userService.getUserByUsername(Mockito.any())).thenReturn(mockUser);
        Mockito.when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        // 4. Chuẩn bị đơn hàng
        OrderDetailDTO item = new OrderDetailDTO();
        item.setProductId(1L);
        item.setQuantity(1);

        OrderDTO dto = new OrderDTO();
        dto.setUserId(1L);
        dto.setAddress("123 Đường Hết Hạn");
        dto.setPhone("0900111222");
        dto.setPaymentMethod("COD");
        dto.setItems(List.of(item));
        dto.setVoucherId(100L); // Dùng voucher không hợp lệ

        // 5. Gọi service và kiểm tra ngoại lệ
        ResourceInvalidException exception = assertThrows(ResourceInvalidException.class, () -> {
            orderService.create(dto);
        });

        assertEquals("Voucher không còn hiệu lực", exception.getMessage());
    }
    @Test
    void TC07_createOrderWithVoucherBelowMinimumAmount_shouldThrowException() {
        // 1. Mock sản phẩm hợp lệ (giá trị nhỏ hơn điều kiện áp dụng voucher)
        Product product = new Product();
        product.setId(1L);
        product.setProductName("SP nhỏ");
        product.setPrice(50.0); // chỉ 50.000đ
        product.setQuantity(10);

        // 2. Mock voucher yêu cầu tổng đơn hàng > 100.000đ
        Voucher voucher = new Voucher();
        voucher.setId(200L);
        voucher.setType(Voucher.VoucherType.PERCENT);
        voucher.setDiscountValue(10.0);
        voucher.setMinimumOrderAmount(100.0); // yêu cầu 100.000đ trở lên
        voucher.setStartDate(Instant.now().minus(1, ChronoUnit.DAYS));
        voucher.setEndDate(Instant.now().plus(1, ChronoUnit.DAYS));
        voucher.setIsActive(true);
        voucher.setUsedCount(0);

        // 3. Mock UserVoucher (chưa dùng)
        UserVoucher uv = new UserVoucher();
        uv.setIsUsed(false);

        // 4. Cấu hình mock
        Mockito.when(userService.getUserByUsername(Mockito.any())).thenReturn(mockUser);
        Mockito.when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        Mockito.when(voucherRepository.findById(200L)).thenReturn(Optional.of(voucher));
        //Mockito.when(userVoucherRepository.findByUserIdAndVoucherId(mockUser.getId(), voucher.getId())).thenReturn(Optional.of(uv));

        // 5. Tạo đơn hàng
        OrderDetailDTO item = new OrderDetailDTO();
        item.setProductId(1L);
        item.setQuantity(1); // tổng: 50.000

        OrderDTO dto = new OrderDTO();
        dto.setUserId(mockUser.getId());
        dto.setItems(List.of(item));
        dto.setAddress("123 Đường Không Đủ");
        dto.setPhone("0900123456");
        dto.setPaymentMethod("COD");
        dto.setVoucherId(200L); // gán voucher cần test

        // 6. Gọi service và kiểm tra ngoại lệ
        ResourceInvalidException ex = assertThrows(ResourceInvalidException.class, () -> {
            orderService.create(dto);
        });

        assertEquals("Đơn hàng không đủ điều kiện để sử dụng voucher", ex.getMessage());
    }
    @Test
    void TC08_createOrderWithUsedVoucher_shouldThrowException() {
        // 1. Mock sản phẩm hợp lệ
        Product product = new Product();
        product.setId(1L);
        product.setProductName("Sản phẩm test");
        product.setPrice(100.0);
        product.setQuantity(10);

        // 2. Mock voucher đang còn hạn sử dụng
        Voucher voucher = new Voucher();
        voucher.setId(200L);
        voucher.setType(Voucher.VoucherType.PERCENT);
        voucher.setDiscountValue(10.0);
        voucher.setMinimumOrderAmount(50.0);
        voucher.setStartDate(Instant.now().minus(2, ChronoUnit.DAYS));
        voucher.setEndDate(Instant.now().plus(2, ChronoUnit.DAYS));
        voucher.setIsActive(true);
        voucher.setUsedCount(0);

        // 3. Mock UserVoucher đã được dùng rồi
        UserVoucher userVoucher = new UserVoucher();
        userVoucher.setUser(mockUser);
        userVoucher.setVoucher(voucher);
        userVoucher.setIsUsed(true); // ĐÃ DÙNG

        // 4. Mock hành vi DB
        Mockito.when(userService.getUserByUsername(Mockito.any())).thenReturn(mockUser);
        Mockito.when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        Mockito.when(voucherRepository.findById(200L)).thenReturn(Optional.of(voucher));
        Mockito.when(userVoucherRepository.findByUserIdAndVoucherId(mockUser.getId(), voucher.getId()))
                .thenReturn(Optional.of(userVoucher));

        // 5. Tạo đơn hàng với voucher đã dùng
        OrderDetailDTO item = new OrderDetailDTO();
        item.setProductId(1L);
        item.setQuantity(1); // 100.000đ

        OrderDTO dto = new OrderDTO();
        dto.setAddress("Test address");
        dto.setPhone("0900888999");
        dto.setPaymentMethod("COD");
        dto.setUserId(mockUser.getId());
        dto.setItems(List.of(item));
        dto.setVoucherId(200L); // Gán voucher đã dùng

        // 6. Gọi service và kiểm tra ngoại lệ
        ResourceInvalidException exception = assertThrows(ResourceInvalidException.class, () -> {
            orderService.create(dto);
        });

        assertEquals("Mã giảm giá đã được sử dụng", exception.getMessage());
    }
}
