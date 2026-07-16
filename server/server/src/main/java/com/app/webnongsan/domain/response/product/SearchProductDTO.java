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
    private Double discountPrice;
    private String promotionType;
    private Integer promoBuyQuantity;
    private Integer promoFreeQuantity;
    private Integer promoBundleQuantity;
    private Double promoBundlePrice;
    private Integer quantity;

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

    // Dùng cho các query gợi ý (recommendation) — cần thêm quantity để ProductCard biết còn hàng hay không.
    // Set trực tiếp từng field (không delegate rồi patch thêm) — tránh im lặng lệch field nếu constructor
    // 11-arg bên dưới đổi thứ tự/tập field sau này.
    public SearchProductDTO(long id, String product_name, double price, String imageUrl, String category, double rating,
                            Double discountPrice, String promotionType, Integer promoBuyQuantity, Integer promoFreeQuantity,
                            Integer promoBundleQuantity, Double promoBundlePrice, Integer quantity) {
        this.id = id;
        this.product_name = product_name;
        this.price = price;
        this.imageUrl = imageUrl;
        this.category = category;
        this.rating = rating;
        this.discountPrice = discountPrice;
        this.promotionType = promotionType;
        this.promoBuyQuantity = promoBuyQuantity;
        this.promoFreeQuantity = promoFreeQuantity;
        this.promoBundleQuantity = promoBundleQuantity;
        this.promoBundlePrice = promoBundlePrice;
        this.quantity = quantity;
    }

    public SearchProductDTO(long id, String product_name, double price, String imageUrl, String category,
                            Double discountPrice, String promotionType, Integer promoBuyQuantity, Integer promoFreeQuantity,
                            Integer promoBundleQuantity, Double promoBundlePrice) {
        this.id = id;
        this.product_name = product_name;
        this.price = price;
        this.imageUrl = imageUrl;
        this.category = category;
        this.discountPrice = discountPrice;
        this.promotionType = promotionType;
        this.promoBuyQuantity = promoBuyQuantity;
        this.promoFreeQuantity = promoFreeQuantity;
        this.promoBundleQuantity = promoBundleQuantity;
        this.promoBundlePrice = promoBundlePrice;
    }
}
