import { PROMOTION_TYPES } from "./constants";
import { formatMoney } from "./helper";

// Tính tiền 1 dòng sản phẩm theo loại khuyến mãi — PHẢI khớp công thức backend
// (server/.../service/PromotionService.java) vì đây chỉ dùng để hiển thị, tổng tiền thật
// luôn được backend tính lại độc lập ở OrderService.create().
export const calculateLineTotal = (product, quantity) => {
  const type = product?.promotionType || PROMOTION_TYPES.NONE;
  const price = product?.price || 0;

  if (type === PROMOTION_TYPES.BUY_X_GET_Y) {
    // "quantity" là số lượng khách MUA (trả tiền), quà tặng là số lượng CỘNG THÊM, không trừ vào giá phải trả.
    // VD "Mua 4 tặng 1": mua 8 (2 lần 4) -> tặng 2, vẫn tính tiền đủ 8 (không phải 6).
    const buyQty = product?.promoBuyQuantity;
    const freeQty = product?.promoFreeQuantity;
    if (!buyQty || !freeQty || buyQty < 1 || freeQty < 1) {
      return { total: price * quantity, freeUnits: 0 };
    }
    const freeUnits = Math.floor(quantity / buyQty) * freeQty;
    return { total: price * quantity, freeUnits };
  }

  if (type === PROMOTION_TYPES.BUNDLE_PRICE) {
    const bundleQty = product?.promoBundleQuantity;
    const bundlePrice = product?.promoBundlePrice;
    if (!bundleQty || !bundlePrice || bundleQty < 2) {
      return { total: price * quantity, freeUnits: 0 };
    }
    const bundles = Math.floor(quantity / bundleQty);
    const remainder = quantity % bundleQty;
    return { total: bundles * bundlePrice + remainder * price, freeUnits: 0 };
  }

  return { total: price * quantity, freeUnits: 0 };
};

// % giảm giá cho loại PRICE_DISCOUNT (originalPrice > price) — gom về 1 chỗ thay vì lặp lại ở ProductCard/ProductDetail/admin table
export const getDiscountPercent = (product) => {
  if (!product?.originalPrice || product.originalPrice <= product.price) return null;
  return Math.round((1 - product.price / product.originalPrice) * 100);
};

// Nhãn ngắn cho loại BUY_X_GET_Y/BUNDLE_PRICE — dùng ở badge nhỏ (ProductCard), Tag (admin table), text (admin ProductDetail)
export const getPromotionBadgeLabel = (product) => {
  const type = product?.promotionType;
  if (type === PROMOTION_TYPES.BUY_X_GET_Y && product?.promoBuyQuantity && product?.promoFreeQuantity) {
    return `Mua ${product.promoBuyQuantity} tặng ${product.promoFreeQuantity}`;
  }
  if (type === PROMOTION_TYPES.BUNDLE_PRICE && product?.promoBundleQuantity && product?.promoBundlePrice) {
    return `Mua ${product.promoBundleQuantity} giá ${formatMoney(product.promoBundlePrice)}đ`;
  }
  return null;
};

// Số lượng free đã "chốt" khi giỏ hàng đạt đủ ngưỡng — dùng để hiện section "được tặng quà"
export const getFreeGiftUnits = (product, quantity) => {
  if (product?.promotionType !== PROMOTION_TYPES.BUY_X_GET_Y) return 0;
  return calculateLineTotal(product, quantity).freeUnits;
};

// Số lượng tối đa khách có thể ĐẶT (trả tiền) sao cho quantity + quà tặng đi kèm không vượt tồn kho —
// chỉ dùng để hiển thị cảnh báo UI, KHÔNG phải nguồn xác thực (backend tự validate lại độc lập).
export const getMaxOrderableQuantity = (product, stock) => {
  if (!stock || stock <= 0) return 0;
  for (let q = stock; q >= 1; q--) {
    if (q + getFreeGiftUnits(product, q) <= stock) return q;
  }
  return 0;
};

// Nhãn khuyến mãi cho 1 dòng ĐÃ ĐẶT HÀNG (OrderDetail) — dùng snapshot lưu tại thời điểm đặt hàng
// (promotionType/freeUnits/promoBundleQuantity/promoBundlePrice), KHÔNG dùng field khuyến mãi hiện tại
// của product vì có thể đã bị PromotionExpiryScheduler xoá sau khi hết hạn.
export const getOrderLinePromotionLabel = (item) => {
  if (!item?.promotionType) return null;
  if (item.promotionType === PROMOTION_TYPES.BUY_X_GET_Y && item.freeUnits > 0) {
    return `Tặng ${item.freeUnits}`;
  }
  if (item.promotionType === PROMOTION_TYPES.BUNDLE_PRICE && item.promoBundleQuantity && item.promoBundlePrice) {
    return `Mua ${item.promoBundleQuantity} giá ${formatMoney(item.promoBundlePrice)}đ`;
  }
  if (item.promotionType === PROMOTION_TYPES.PRICE_DISCOUNT) {
    return "Giảm giá";
  }
  return null;
};

// Dòng ĐÃ ĐẶT HÀNG có đủ dữ liệu để hiện giá gốc gạch ngang + giá đã giảm hay không (PRICE_DISCOUNT)
export const hasOrderLineDiscount = (item) =>
  item?.promotionType === PROMOTION_TYPES.PRICE_DISCOUNT &&
  item?.originalPrice > item?.unit_price;
