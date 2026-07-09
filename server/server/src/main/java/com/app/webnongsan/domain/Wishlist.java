package com.app.webnongsan.domain;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "wishlists")
@Getter
@Setter
public class Wishlist {
    @EmbeddedId
    private WishlistId id;

    @ManyToOne
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @ManyToOne
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    @JsonIgnore
    private Product product;

    // NULL với các dòng có trước khi thêm cột (không suy ra được thời điểm thật)
    private Instant addedAt;

    @PrePersist
    public void handleAddToWishlist() {
        this.addedAt = Instant.now();
    }
}