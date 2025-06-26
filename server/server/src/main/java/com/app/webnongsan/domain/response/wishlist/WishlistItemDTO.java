package com.app.webnongsan.domain.response.wishlist;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class WishlistItemDTO {
    private Long id;
    private String productName;
    private Double price;
    private String imageUrl;
    private String category;
}
