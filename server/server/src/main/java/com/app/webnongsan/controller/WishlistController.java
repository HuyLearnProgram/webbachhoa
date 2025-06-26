package com.app.webnongsan.controller;

import com.app.webnongsan.domain.Wishlist;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.service.WishlistService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.turkraft.springfilter.boot.Filter;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class WishlistController {
    private final WishlistService wishlistService;

    @PostMapping("wishlist")
    @ApiMessage("Add wishlist")
    public ResponseEntity<Wishlist> add(@RequestBody Wishlist w) throws ResourceInvalidException {
        return ResponseEntity.status(HttpStatus.CREATED).body(this.wishlistService.addWishlist(w));
    }

    @DeleteMapping("wishlist")
    @ApiMessage("Delete wishlist")
    public ResponseEntity<Void> delete(@RequestParam("pid") long productId) throws ResourceInvalidException {
        this.wishlistService.deleteWishlist(productId);
        return ResponseEntity.ok(null);
    }

    @GetMapping("wishlist")
    @ApiMessage("Get list wishlist")
    public ResponseEntity<PaginationDTO> getAll(Pageable pageable) throws ResourceInvalidException {
        return ResponseEntity.ok(this.wishlistService.getWishlistsByCurrentUser(pageable));
    }
}
