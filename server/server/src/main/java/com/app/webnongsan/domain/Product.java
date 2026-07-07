package com.app.webnongsan.domain;

import com.app.webnongsan.util.SecurityUtil;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.*;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "products")
@Getter
@Setter
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @NotBlank(message = "Tên không được để trống")
    private String productName;

    // Mã định danh sản phẩm, dùng làm khoá để import/export Excel cập nhật đúng sản phẩm đã tồn tại
    @Column(unique = true)
    private String sku;

    private double price;

    // Giá gốc trước giảm (nullable) — chỉ hiển thị khuyến mãi khi originalPrice > price
    private Double originalPrice;

    // Ẩn/hiện sản phẩm thay cho hard delete; DEFAULT 1 để dữ liệu cũ tự thành "đang bán" khi ddl-auto=update thêm cột
    @Column(columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean active = true;

    private String imageUrl;

    private int quantity;

    private double rating;

    private int sold;

    private Instant createdAt;

    private String createdBy;

    private Instant updatedAt;

    private String updatedBy;

    private String unit;

    @Column(columnDefinition = "MEDIUMTEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    @NotNull(message = "Category không được để trống")
    private Category category;

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "product")
    @JsonIgnore
    private List<Feedback> feedbacks;

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "product")
    @JsonIgnore
    private List<OrderDetail> orderDetails;

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "product")
    @JsonIgnore
    private List<Wishlist> wishlist;

    // Ảnh phụ (gallery) — ảnh chính vẫn là imageUrl để tương thích ProductCard/bảng admin hiện có
    @OneToMany(fetch = FetchType.EAGER, mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder asc")
    private List<ProductImage> images;

    @PrePersist
    public void handleBeforeCreate() {
        this.createdBy = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        this.createdAt = Instant.now();
    }

    @PreUpdate
    public void handleBeforeUpdate(){
        this.updatedBy = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
        this.updatedAt = Instant.now();
    }
}
