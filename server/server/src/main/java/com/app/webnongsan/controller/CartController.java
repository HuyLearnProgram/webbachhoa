package com.app.webnongsan.controller;

import com.app.webnongsan.domain.Cart;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.cart.CartItemDTO;
import com.app.webnongsan.service.CartService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.turkraft.springfilter.boot.Filter;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class CartController {
    private final CartService cartService;

    @PostMapping("cart")
    @ApiMessage("Add to cart")
    public ResponseEntity<Cart> add(@RequestBody Cart cart) throws ResourceInvalidException {
        return ResponseEntity.status(HttpStatus.CREATED).body(this.cartService.addOrUpdateCart(cart));
    }

    @DeleteMapping("cart/{productId}")
    @ApiMessage("Delete product from cart")
    public ResponseEntity<Void> delete(@PathVariable long productId) throws ResourceInvalidException {
        this.cartService.deleteFromCart(productId);
        return ResponseEntity.ok(null);
    }

    @GetMapping("cart")
    @ApiMessage("Get cart by user")
    public ResponseEntity<PaginationDTO> getCartByUser(Pageable pageable) throws ResourceInvalidException {
        return ResponseEntity.ok(this.cartService.getCartByCurrentUser(pageable));
    }
    @GetMapping("cart/product-selected")
    @ApiMessage("Get products from cart")
    public ResponseEntity<List<CartItemDTO>> getSelectedItemsCart(@RequestParam("productIds") List<Long> productIds, Pageable pageable)throws ResourceInvalidException {
        return ResponseEntity.ok(this.cartService.getCartItemsByProductIds(productIds, pageable));
    }
}
