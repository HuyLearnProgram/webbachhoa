package com.app.webnongsan.domain.response.cart;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class CartItemDTO {
    private Long id;
    private String productName;
    private Double price;
    private int quantity;
    private String imageUrl;
    private String category;
    private int stock;
}
