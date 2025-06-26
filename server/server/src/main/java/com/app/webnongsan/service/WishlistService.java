package com.app.webnongsan.service;

import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.Wishlist;
import com.app.webnongsan.domain.WishlistId;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.wishlist.WishlistItemDTO;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.repository.WishlistRepository;
import com.app.webnongsan.util.PaginationHelper;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class WishlistService {
    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PaginationHelper paginationHelper;

    public Wishlist addWishlist(Wishlist w) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User u = this.userRepository.findByEmail(email);
        if (u == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }
        Product p = this.productRepository.findById(w.getId().getProductId()).orElseThrow(() -> new ResourceInvalidException("Product không tồn tại"));

        boolean exists = wishlistRepository.existsByUserIdAndProductId(u.getId(), p.getId());

        if (exists) {
            throw new ResourceInvalidException("Sản phẩm đã có trong danh sách yêu thích");
        }

        w.setUser(u);
        w.setProduct(p);
        return this.wishlistRepository.save(w);
    }

    public void deleteWishlist(Long productId) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User user = this.userRepository.findByEmail(email);

        if (user == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }

        boolean exists = wishlistRepository.existsByUserIdAndProductId(user.getId(), productId);
        if (!exists) {
            throw new ResourceInvalidException("Sản phẩm không tồn tại trong danh sách yêu thích");
        }

        WishlistId wishlistId = new WishlistId(user.getId(), productId);
        wishlistRepository.deleteById(wishlistId);
    }

    public PaginationDTO getWishlistsByCurrentUser( Pageable pageable) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        User user = this.userRepository.findByEmail(email);

        if (user == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }

        Page<WishlistItemDTO> wishlistItems = this.wishlistRepository.findWishlistItemsByUserId(user.getId(), pageable);
        return this.paginationHelper.fetchAllEntities(wishlistItems);
    }
}
