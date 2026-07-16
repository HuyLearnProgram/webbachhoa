import React from "react";
import { PROMOTION_TYPES } from "@/utils/constants";
import { formatMoney, resolveImageUrl } from "@/utils/helper";
import product_default from "@/assets/product_default.png";

const resolveProductImage = (imageUrl) => resolveImageUrl(imageUrl, "product", product_default);

// Box "🔥 ƯU ĐÃI ĐẶC BIỆT" cho khuyến mãi Mua X tặng Y / Mua N giá cố định — loại giảm giá (PRICE_DISCOUNT)
// đã có badge % riêng ở nơi khác nên không hiện box này.
const PromotionOfferBox = ({ product, compact = false }) => {
  const type = product?.promotionType;
  if (type !== PROMOTION_TYPES.BUY_X_GET_Y && type !== PROMOTION_TYPES.BUNDLE_PRICE) return null;

  const title = type === PROMOTION_TYPES.BUY_X_GET_Y
    ? `MUA ${product.promoBuyQuantity} TẶNG ${product.promoFreeQuantity} ${product.productName} BẤT KỲ`
    : `MUA ${product.promoBundleQuantity} SẢN PHẨM GIÁ ${formatMoney(product.promoBundlePrice)}Đ`;

  return (
    <div className={`border border-orange-300 bg-orange-50 rounded-lg ${compact ? "p-2" : "p-4"}`}>
      <div className={`flex items-center gap-2 text-orange-600 font-semibold ${compact ? "text-sm" : "text-base"}`}>
        <span>🔥</span>
        <span>ƯU ĐÃI ĐẶC BIỆT</span>
      </div>
      <div className={`font-bold mt-1 ${compact ? "text-xs" : "text-sm"}`}>{title}</div>
      <div className="flex items-center gap-2 mt-2">
        <img
          src={resolveProductImage(product.imageUrl)}
          alt={product.productName}
          className={compact ? "w-8 h-8 object-cover rounded" : "w-12 h-12 object-cover rounded"}
        />
        <span className={compact ? "text-xs" : "text-sm"}>{product.productName}</span>
      </div>
    </div>
  );
};

export default PromotionOfferBox;
