package com.app.webnongsan.service;

import com.app.webnongsan.domain.Cart;
import com.app.webnongsan.domain.CartId;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.cart.CartItemDTO;
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

    public Cart addOrUpdateCart(Cart cart) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User u = this.userRepository.findByEmail(email);
        if (u == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }
        Product p = this.productRepository.findById(cart.getId().getProductId()).orElseThrow(() -> new ResourceInvalidException("Product không tồn tại"));

        // Cần khi test code
//        if (cart.getQuantity() <= 0) {
//            throw new ResourceInvalidException("Số lượng sản phẩm phải lớn hơn 0");
//        }
//
//        if (cart.getQuantity() > p.getQuantity()) {
//            throw new ResourceInvalidException("Số lượng hàng không đủ");
//        }

        Optional<Cart> existingCart = cartRepository.findById(new CartId(u.getId(), p.getId()));
        if (existingCart.isPresent()) {
            Cart cartItem = existingCart.get();
            int newQuantity = cartItem.getQuantity() + cart.getQuantity();
            if (newQuantity < 0){
                throw new ResourceInvalidException("Số lượng sản phẩm không hợp lệ");
            }
            if (newQuantity > p.getQuantity()) {
                throw new ResourceInvalidException("Số lượng hàng trong kho không đủ");
            }

            cartItem.setQuantity(newQuantity);
            return this.cartRepository.save(cartItem);
        } else {
            cart.setUser(u);
            cart.setProduct(p);
            return this.cartRepository.save(cart);
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
    }

    public PaginationDTO getCartByCurrentUser(Pageable pageable) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User user = this.userRepository.findByEmail(email);

        if (user == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }

        Page<CartItemDTO> cartItems = this.cartRepository.findCartItemsByUserId(user.getId(), pageable);
        return this.paginationHelper.fetchAllEntities(cartItems);
    }

    public List<CartItemDTO> getCartItemsByProductIds(List<Long> productIds, Pageable pageable) throws ResourceInvalidException{
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User user = this.userRepository.findByEmail(email);

        if (user == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }
        return this.cartRepository.findCartItemsByUserIdAndProductId(user.getId(),productIds, pageable);
    }

    public long countProductInCart(long userId){
        return this.cartRepository.countProductsByUserId(userId);
    }
}
