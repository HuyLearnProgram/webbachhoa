package com.app.webnongsan.domain.response.product;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class ResProductDTO {
    private long id;

    private String product_name;

    private String sku;

    private double price;

    private Double originalPrice;

    private String promotionType;

    private Integer promoBuyQuantity;

    private Integer promoFreeQuantity;

    private Integer promoBundleQuantity;

    private Double promoBundlePrice;

    private Instant promotionExpiresAt;

    private Boolean active;

    private String imageUrl;

    private int quantity;

    private String unit;

    private int sold;

    private double rating;

    private String description;

    private String category;

}
