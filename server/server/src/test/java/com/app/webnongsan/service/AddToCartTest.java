package com.app.webnongsan.service;

import com.app.webnongsan.domain.Cart;
import com.app.webnongsan.domain.CartId;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.repository.CartRepository;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AddToCartTest {

    @InjectMocks
    private CartService cartService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CartRepository cartRepository;

    private User mockUser;
    private Product mockProduct;
    private CartId cartId;
    private MockedStatic<SecurityUtil> mockedSecurity;

    @BeforeEach
    void setup() {
        // Khởi tạo mock objects
        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("test@gmail.com");

        mockProduct = new Product();
        mockProduct.setId(1L);
        mockProduct.setProductName("Test Product");
        mockProduct.setPrice(50000.0);
        mockProduct.setQuantity(100);

        cartId = new CartId();
        cartId.setUserId(1L);
        cartId.setProductId(1L);

        // Setup MockedStatic với scope rộng hơn
        mockedSecurity = Mockito.mockStatic(SecurityUtil.class);
        mockedSecurity.when(SecurityUtil::getCurrentUserLogin)
                .thenReturn(Optional.of("test@gmail.com"));

        // Setup repository mocks
        lenient().when(userRepository.findByEmail("test@gmail.com")).thenReturn(mockUser);
        lenient().when(productRepository.findById(1L)).thenReturn(Optional.of(mockProduct));
    }

    @AfterEach
    void tearDown() {
        // Đóng MockedStatic sau mỗi test
        if (mockedSecurity != null) {
            mockedSecurity.close();
        }
    }

    // ==================== PHÂN VÙNG TƯƠNG ĐƯƠNG ====================

    /**
     * TC03-EP-1: Phân vùng hợp lệ (1 ≤ quantity ≤ 100)
     */
    @Test
    void TC03_EP1_validQuantityRange_shouldSucceed() throws ResourceInvalidException {
        // Arrange
        Cart inputCart = createCartWithQuantity(5);
        when(cartRepository.findById(cartId)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Cart result = cartService.addOrUpdateCart(inputCart);

        // Assert
        assertNotNull(result);
        assertEquals(5, result.getQuantity());
        assertEquals(mockUser, result.getUser());
        assertEquals(mockProduct, result.getProduct());

        verify(cartRepository).save(any(Cart.class));
    }

    /**
     * TC03-EP-2: Phân vùng không hợp lệ (quantity ≤ 0)
     */
    @Test
    void TC03_EP2_zeroQuantity_shouldThrowException() {
        // Arrange
        Cart inputCart = createCartWithQuantity(0);
        when(cartRepository.findById(cartId)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceInvalidException exception = assertThrows(
                ResourceInvalidException.class,
                () -> cartService.addOrUpdateCart(inputCart)
        );

        assertEquals("Số lượng sản phẩm không hợp lệ", exception.getMessage());
        verify(cartRepository, never()).save(any());
    }

    /**
     * TC03-EP-3: Phân vùng không hợp lệ (quantity > stock)
     */
    @Test
    void TC03_EP3_quantityExceedsStock_shouldThrowException() {
        // Arrange
        Cart inputCart = createCartWithQuantity(150);
        //when(cartRepository.findById(cartId)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceInvalidException exception = assertThrows(
                ResourceInvalidException.class,
                () -> cartService.addOrUpdateCart(inputCart)
        );

        assertEquals("Số lượng hàng không đủ", exception.getMessage());
        verify(cartRepository, never()).save(any());
    }


    // ==================== BOUNDARY VALUE ANALYSIS ====================

    /**
     * TC03-BV-1: Boundary Value - Dưới biên dưới (quantity = 0)
     */
    @Test
    void TC03_BV1_belowLowerBoundary_shouldThrowException() {
        // Arrange
        Cart inputCart = createCartWithQuantity(0);
        //when(cartRepository.findById(cartId)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceInvalidException exception = assertThrows(
                ResourceInvalidException.class,
                () -> cartService.addOrUpdateCart(inputCart)
        );

        assertEquals("Số lượng sản phẩm phải lớn hơn 0", exception.getMessage());
    }

    /**
     * TC03-BV-2: Boundary Value - Biên dưới (quantity = 1)
     */
    @Test
    void TC03_BV2_lowerBoundary_shouldSucceed() throws ResourceInvalidException {
        // Arrange
        Cart inputCart = createCartWithQuantity(1);
        when(cartRepository.findById(cartId)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Cart result = cartService.addOrUpdateCart(inputCart);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getQuantity());
        verify(cartRepository).save(any(Cart.class));
    }

    /**
     * TC03-BV-3: Boundary Value - Sau biên dưới (quantity = 2)
     */
    @Test
    void TC03_BV3_aboveLowerBoundary_shouldSucceed() throws ResourceInvalidException {
        // Arrange
        Cart inputCart = createCartWithQuantity(2);
        when(cartRepository.findById(cartId)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Cart result = cartService.addOrUpdateCart(inputCart);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.getQuantity());
        verify(cartRepository).save(any(Cart.class));
    }

    /**
     * TC03-BV-4: Boundary Value - Trước biên trên (quantity = 99)
     */
    @Test
    void TC03_BV4_belowUpperBoundary_shouldSucceed() throws ResourceInvalidException {
        // Arrange
        Cart inputCart = createCartWithQuantity(99);
        when(cartRepository.findById(cartId)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Cart result = cartService.addOrUpdateCart(inputCart);

        // Assert
        assertNotNull(result);
        assertEquals(99, result.getQuantity());
        verify(cartRepository).save(any(Cart.class));
    }

    /**
     * TC03-BV-5: Boundary Value - Biên trên (quantity = 100)
     */
    @Test
    void TC03_BV5_upperBoundary_shouldSucceed() throws ResourceInvalidException {
        // Arrange
        Cart inputCart = createCartWithQuantity(100);
        when(cartRepository.findById(cartId)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Cart result = cartService.addOrUpdateCart(inputCart);

        // Assert
        assertNotNull(result);
        assertEquals(100, result.getQuantity());
        verify(cartRepository).save(any(Cart.class));
    }

    /**
     * TC03-BV-6: Boundary Value - Trên biên trên (quantity = 101)
     */
    @Test
    void TC03_BV6_aboveUpperBoundary_shouldThrowException() {
        // Arrange
        Cart inputCart = createCartWithQuantity(101);
        //when(cartRepository.findById(cartId)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceInvalidException exception = assertThrows(
                ResourceInvalidException.class,
                () -> cartService.addOrUpdateCart(inputCart)
        );

        assertEquals("Số lượng hàng không đủ", exception.getMessage());
        verify(cartRepository, never()).save(any());
    }

    /**
     * TC03-BV-7: Boundary Value - Giá trị âm (quantity = -1)
     */
    @Test
    void TC03_BV7_negativeQuantity_shouldThrowException() {
        // Arrange
        Cart inputCart = createCartWithQuantity(-1);
        //when(cartRepository.findById(cartId)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceInvalidException exception = assertThrows(
                ResourceInvalidException.class,
                () -> cartService.addOrUpdateCart(inputCart)
        );

        assertEquals("Số lượng sản phẩm phải lớn hơn 0", exception.getMessage());
        verify(cartRepository, never()).save(any());
    }


    // ==================== EXISTING CART TESTS ====================

    /**
     * TC03-EC-1: Cập nhật cart đã tồn tại - Tổng quantity hợp lệ
     */
    @Test
    void TC03_EC1_updateExistingCart_validTotalQuantity_shouldSucceed() throws ResourceInvalidException {
        // Arrange
        Cart inputCart = createCartWithQuantity(30);
        Cart existingCart = createExistingCartWithQuantity(20);

        when(cartRepository.findById(cartId)).thenReturn(Optional.of(existingCart));
        when(cartRepository.save(any(Cart.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Cart result = cartService.addOrUpdateCart(inputCart);

        // Assert
        assertNotNull(result);
        assertEquals(50, result.getQuantity()); // 20 + 30 = 50
        verify(cartRepository).save(existingCart);
    }
    /**
     * TC03-EC-2: Cập nhật cart đã tồn tại - Tổng quantity vượt quá stock
     */
    @Test
    void TC03_EC2_updateExistingCart_totalQuantityExceedsStock_shouldThrowException() {
        // Arrange
        Cart inputCart = createCartWithQuantity(60);
        Cart existingCart = createExistingCartWithQuantity(50);

        when(cartRepository.findById(cartId)).thenReturn(Optional.of(existingCart));

        // Act & Assert
        ResourceInvalidException exception = assertThrows(
                ResourceInvalidException.class,
                () -> cartService.addOrUpdateCart(inputCart)
        );

        assertEquals("Số lượng hàng trong kho không đủ", exception.getMessage());
        verify(cartRepository, never()).save(any());
    }
    /**
     * TC03-EC-3: Cập nhật cart với quantity âm (giảm số lượng)
     */
    @Test
    void TC03_EC3_updateExistingCart_negativeQuantity_shouldThrowException() {
        // Arrange
        Cart inputCart = createCartWithQuantity(-30);
        Cart existingCart = createExistingCartWithQuantity(20);

        //when(cartRepository.findById(cartId)).thenReturn(Optional.of(existingCart));

        // Act & Assert
        ResourceInvalidException exception = assertThrows(
                ResourceInvalidException.class,
                () -> cartService.addOrUpdateCart(inputCart)
        );

        assertEquals("Số lượng sản phẩm phải lớn hơn 0", exception.getMessage());
        verify(cartRepository, never()).save(any());
    }


    // ==================== PARAMETERIZED TESTS ====================

    /**
     * TC03-PT: Parameterized Test cho tất cả boundary values hợp lệ
     */
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 5, 10, 50, 99, 100})
    @DisplayName("TC03-PT: Valid quantity values should succeed")
    void TC03_PT_validQuantityValues_shouldSucceed(int quantity) throws ResourceInvalidException {
        // Arrange
        Cart inputCart = createCartWithQuantity(quantity);

        // Setup mocks cần thiết cho test case này
        when(cartRepository.findById(cartId)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Cart result = cartService.addOrUpdateCart(inputCart);

        // Assert
        assertNotNull(result);
        assertEquals(quantity, result.getQuantity());
        assertEquals(mockUser, result.getUser());
        assertEquals(mockProduct, result.getProduct());

        // Verify interactions
        verify(cartRepository).save(any(Cart.class));

        // Reset mocks for next iteration
        reset(cartRepository);
    }

    /**
     * TC03-PT: Parameterized Test cho tất cả boundary values
     */

    @ParameterizedTest
    @ValueSource(ints = {-10, -1, 0, 101, 150, 1000})
    @DisplayName("TC03-NT: Invalid quantity values should throw exception")
    void TC03_NT_invalidQuantityValues_shouldThrowException(int quantity) {
        // Arrange
        Cart inputCart = createCartWithQuantity(quantity);

        // Act & Assert
        assertThrows(ResourceInvalidException.class,
                () -> cartService.addOrUpdateCart(inputCart));

        verify(cartRepository, never()).save(any());

        // Reset mocks for next iteration
        Mockito.reset(cartRepository);
    }


    // ==================== HELPER METHODS ====================

    private Cart createCartWithQuantity(int quantity) {
        Cart cart = new Cart();
        cart.setId(cartId);
        cart.setQuantity(quantity);
        return cart;
    }

    private Cart createExistingCartWithQuantity(int quantity) {
        Cart existingCart = new Cart();
        existingCart.setId(cartId);
        existingCart.setQuantity(quantity);
        existingCart.setUser(mockUser);
        existingCart.setProduct(mockProduct);
        return existingCart;
    }
}
