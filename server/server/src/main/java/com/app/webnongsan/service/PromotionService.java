package com.app.webnongsan.service;

import com.app.webnongsan.domain.Product;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.stereotype.Service;

// Tính tiền 1 dòng sản phẩm theo loại khuyến mãi — dùng ở OrderService.create() làm nguồn tính total
// duy nhất, chống giả mạo giá (không tin số liệu client gửi lên), khớp công thức phía frontend (src/utils/promotion.js)
@Service
public class PromotionService {

    @Getter
    @AllArgsConstructor
    public static class LineTotal {
        private final double total;
        private final int freeUnits;
    }

    public LineTotal calculateLineTotal(Product product, int quantity) {
        String type = product.getPromotionType() == null ? "NONE" : product.getPromotionType();
        switch (type) {
            case "BUY_X_GET_Y": {
                // "quantity" là số lượng khách MUA (trả tiền), quà tặng là số lượng CỘNG THÊM, không trừ vào giá phải trả.
                // VD "Mua 4 tặng 1": mua 8 (2 lần 4) -> tặng 2, vẫn tính tiền đủ 8 (không phải 6).
                Integer buyQty = product.getPromoBuyQuantity();
                Integer freeQty = product.getPromoFreeQuantity();
                if (buyQty == null || freeQty == null || buyQty < 1 || freeQty < 1) {
                    return new LineTotal(product.getPrice() * quantity, 0);
                }
                int freeUnits = (quantity / buyQty) * freeQty;
                return new LineTotal(product.getPrice() * quantity, freeUnits);
            }
            case "BUNDLE_PRICE": {
                Integer bundleQty = product.getPromoBundleQuantity();
                Double bundlePrice = product.getPromoBundlePrice();
                if (bundleQty == null || bundlePrice == null || bundleQty < 2) {
                    return new LineTotal(product.getPrice() * quantity, 0);
                }
                int bundles = quantity / bundleQty;
                int remainder = quantity % bundleQty;
                return new LineTotal(bundles * bundlePrice + remainder * product.getPrice(), 0);
            }
            default:
                return new LineTotal(product.getPrice() * quantity, 0);
        }
    }
}
