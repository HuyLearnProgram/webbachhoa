package com.app.webnongsan.domain.response.product;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SearchProductDTO {
    private long id;
    private String product_name;
    private double price;
    private String imageUrl;
    private String category;
    private double rating;
    private Double originalPrice;
    private String promotionType;
    private Integer promoBuyQuantity;
    private Integer promoFreeQuantity;
    private Integer promoBundleQuantity;
    private Double promoBundlePrice;

    public SearchProductDTO(long id, String product_name, double price, String imageUrl, String category) {
        this.id = id;
        this.product_name = product_name;
        this.price = price;
        this.imageUrl = imageUrl;
        this.category = category;
    }

    public SearchProductDTO(long id, String product_name, double price, String imageUrl, String category, double rating) {
        this.id = id;
        this.product_name = product_name;
        this.price = price;
        this.imageUrl = imageUrl;
        this.category = category;
        this.rating = rating;
    }

    public SearchProductDTO(long id, String product_name, double price, String imageUrl, String category,
                            Double originalPrice, String promotionType, Integer promoBuyQuantity, Integer promoFreeQuantity,
                            Integer promoBundleQuantity, Double promoBundlePrice) {
        this.id = id;
        this.product_name = product_name;
        this.price = price;
        this.imageUrl = imageUrl;
        this.category = category;
        this.originalPrice = originalPrice;
        this.promotionType = promotionType;
        this.promoBuyQuantity = promoBuyQuantity;
        this.promoFreeQuantity = promoFreeQuantity;
        this.promoBundleQuantity = promoBundleQuantity;
        this.promoBundlePrice = promoBundlePrice;
    }
}
