package com.app.webnongsan.service;

import com.app.webnongsan.domain.Cart;
import com.app.webnongsan.domain.CartEvent;
import com.app.webnongsan.domain.CartId;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.cart.CartItemDTO;
import com.app.webnongsan.repository.CartEventRepository;
import com.app.webnongsan.repository.CartRepository;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.util.PaginationHelper;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
public class CartService {
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PaginationHelper paginationHelper;
    private final PromotionService promotionService;
    private final CartEventRepository cartEventRepository;

    // Audit log hành vi giỏ hàng (tín hiệu cho hệ thống gợi ý AI) — ghi server-side để không
    // phụ thuộc frontend gọi tracking; lỗi khi ghi log không được làm hỏng thao tác giỏ hàng chính
    private void logCartEvent(User user, Product product, String eventType, int quantity) {
        try {
            CartEvent event = new CartEvent();
            event.setUser(user);
            event.setProduct(product);
            event.setEventType(eventType);
            event.setQuantity(quantity);
            this.cartEventRepository.save(event);
        } catch (Exception e) {
            System.out.println(">>> Cart event log error: " + e.getMessage());
        }
    }

    public Cart addOrUpdateCart(Cart cart) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User u = this.userRepository.findByEmail(email);
        if (u == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }
        Product p = this.productRepository.findById(cart.getId().getProductId()).orElseThrow(() -> new ResourceInvalidException("Product không tồn tại"));

        Optional<Cart> existingCart = cartRepository.findById(new CartId(u.getId(), p.getId()));
        if (existingCart.isPresent()) {
            Cart cartItem = existingCart.get();
            int newQuantity = cartItem.getQuantity() + cart.getQuantity();
            if (newQuantity < 0){
                throw new ResourceInvalidException("Số lượng sản phẩm không hợp lệ");
            }
            // Tồn kho phải đủ cho cả số lượng trả tiền LẪN quà tặng đi kèm (BUY_X_GET_Y) — cả 2 lấy chung 1 kho
            int freeUnits = this.promotionService.calculateLineTotal(p, newQuantity, u.getId()).getFreeUnits();
            if (newQuantity + freeUnits > p.getQuantity()) {
                throw new ResourceInvalidException("Số lượng hàng trong kho không đủ");
            }

            cartItem.setQuantity(newQuantity);
            Cart saved = this.cartRepository.save(cartItem);
            this.logCartEvent(u, p, "UPDATE_QTY", newQuantity);
            return saved;
        } else {
            // Thêm mới vào giỏ — trước đây hoàn toàn không có bước kiểm tra tồn kho nào ở nhánh này
            int freeUnits = this.promotionService.calculateLineTotal(p, cart.getQuantity(), u.getId()).getFreeUnits();
            if (cart.getQuantity() + freeUnits > p.getQuantity()) {
                throw new ResourceInvalidException("Số lượng hàng trong kho không đủ");
            }
            cart.setUser(u);
            cart.setProduct(p);
            Cart saved = this.cartRepository.save(cart);
            this.logCartEvent(u, p, "ADD", cart.getQuantity());
            return saved;
        }

    }

    public void deleteFromCart(long productId) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User user = this.userRepository.findByEmail(email);

        if (user == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }

        boolean exists = this.cartRepository.existsById(new CartId(user.getId(), productId));
        if (!exists) {
            throw new ResourceInvalidException("Sản phẩm không tồn tại trong giỏ hàng");
        }

        CartId cartId = new CartId(user.getId(), productId);
        this.cartRepository.deleteById(cartId);
        this.productRepository.findById(productId)
                .ifPresent(p -> this.logCartEvent(user, p, "REMOVE", 0));
    }

    public PaginationDTO getCartByCurrentUser(Pageable pageable) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User user = this.userRepository.findByEmail(email);

        if (user == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }

        Page<CartItemDTO> cartItems = this.cartRepository.findCartItemsByUserId(user.getId(), pageable);
        cartItems.forEach(item -> enrichPersonalDiscount(item, user.getId()));
        return this.paginationHelper.fetchAllEntities(cartItems);
    }

    public List<CartItemDTO> getCartItemsByProductIds(List<Long> productIds, Pageable pageable) throws ResourceInvalidException{
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User user = this.userRepository.findByEmail(email);

        if (user == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }
        List<CartItemDTO> items = this.cartRepository.findCartItemsByUserIdAndProductId(user.getId(),productIds, pageable);
        items.forEach(item -> enrichPersonalDiscount(item, user.getId()));
        return items;
    }

    // Flash Sale CÁ NHÂN (Cart Recovery) — CHỈ hiển thị trong trang Giỏ hàng (không đụng PDP/ProductCard/
    // gợi ý), xem PromotionService.getActivePersonalDiscount() — nguồn logic DUY NHẤT, không tự tính lại
    // ở đây để tránh lệch công thức với OrderService lúc tính tiền thật.
    private void enrichPersonalDiscount(CartItemDTO item, Long userId) {
        this.promotionService.getActivePersonalDiscount(item.getId(), userId, item.getPrice())
                .ifPresent(discount -> {
                    item.setPersonalFlashSaleActive(true);
                    item.setPersonalDiscountPrice(discount.getEffectivePrice());
                    item.setPersonalFlashSaleEndsAt(discount.getExpiresAt());
                });
    }

    public long countProductInCart(long userId){
        return this.cartRepository.countProductsByUserId(userId);
    }
}
