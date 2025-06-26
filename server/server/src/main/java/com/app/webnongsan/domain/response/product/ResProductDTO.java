package com.app.webnongsan.domain.response.product;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResProductDTO {
    private long id;

    private String product_name;

    private double price;

    private String imageUrl;

    private int quantity;

    private String unit;

    private int sold;

    private double rating;

    private String description;

    private String category;

}
