package com.app.webnongsan.domain;

import jakarta.persistence.Embeddable;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
@Getter
@Setter

@AllArgsConstructor
@NoArgsConstructor


public class OrderDetailId implements Serializable {
    private Long orderId;
    private Long productId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        OrderDetailId orderDetailId = (OrderDetailId) o;
        return Objects.equals(orderId, orderDetailId.orderId) && Objects.equals(productId, orderDetailId.productId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderId, productId);
    }
}
