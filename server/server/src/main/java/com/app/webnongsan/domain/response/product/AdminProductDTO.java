package com.app.webnongsan.domain.response.product;
import java.time.Instant;

public class AdminProductDTO {
    private long id;

    private String product_name;

    private double price;

    private String imageUrl;

    private int quantity;

    private double rating;

    private int sold;

    private Instant createdAt;

    private String createdBy;

    private Instant updatedAt;

    private String updatedBy;

    private String unit;
}
