import { PROMOTION_TYPES } from "./constants";
import { formatMoney } from "./helper";

// Khung giờ Flash Sale — giá trị mặc định CHỈ dùng khi chưa kịp gọi setFlashSaleWindowsConfig() (VD
// lần render đầu tiên trước khi App.jsx fetch xong). Nguồn sự thật THẬT SỰ là backend
// (application.properties flash-sale.window*, đọc qua GET products/flash-sale-windows) — App.jsx gọi
// setFlashSaleWindowsConfig() 1 lần lúc mount để đồng bộ, tránh đúng bug đã gặp: hardcode ở đây lệch
// với config admin vừa đổi khiến giá Flash Sale hiện sai (giá thường thay vì giá giảm).
const DEFAULT_FLASH_SALE_WINDOWS = [
  { start: "12:00", end: "14:00" },
  { start: "20:00", end: "22:00" },
];
let flashSaleWindowsOverride = null;

export const setFlashSaleWindowsConfig = (config) => {
  if (!config?.window1Start || !config?.window2Start) return;
  flashSaleWindowsOverride = [
    { start: config.window1Start, end: config.window1End },
    { start: config.window2Start, end: config.window2End },
  ];
};

const getFlashSaleWindows = () => flashSaleWindowsOverride || DEFAULT_FLASH_SALE_WINDOWS;

export const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const isWithinFlashSaleWindow = (date = new Date()) => {
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  return getFlashSaleWindows().some(
    (w) => nowMinutes >= toMinutes(w.start) && nowMinutes < toMinutes(w.end)
  );
};

// Flash Sale CÔNG KHAI (Product.isFlashSale=true, admin cấu hình tay) — chỉ tính khung giờ mà admin
// ĐÃ CHỌN cho đúng sản phẩm này (flashSaleWindow1/2, mặc định cả 2 = true nếu null/undefined để không
// phá sản phẩm cũ tick isFlashSale trước khi có tính năng chọn khung giờ). PHẢI khớp
// `PromotionService.isWithinFlashSaleWindow(Instant, Product)` phía backend.
const isProductWithinItsFlashSaleWindow = (product, date = new Date()) => {
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const w1 = product?.flashSaleWindow1 !== false;
  const w2 = product?.flashSaleWindow2 !== false;
  const [win1, win2] = getFlashSaleWindows();
  return (w1 && nowMinutes >= toMinutes(win1.start) && nowMinutes < toMinutes(win1.end))
      || (w2 && nowMinutes >= toMinutes(win2.start) && nowMinutes < toMinutes(win2.end));
};

// Thời điểm KẾT THÚC của khung giờ Flash Sale ĐANG hiệu lực cho sản phẩm này ngay lúc này (dùng cho
// đồng hồ đếm ngược ở PDP) — null nếu sản phẩm không đang trong Flash Sale hiệu lực (isFlashSale=false,
// hoặc có nhưng ngoài khung giờ đã chọn).
export const getActiveFlashSaleWindowEnd = (product, date = new Date()) => {
  if (!product?.isFlashSale) return null;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const w1 = product?.flashSaleWindow1 !== false;
  const w2 = product?.flashSaleWindow2 !== false;
  const [win1, win2] = getFlashSaleWindows();
  const activeWindow = (w1 && nowMinutes >= toMinutes(win1.start) && nowMinutes < toMinutes(win1.end)) ? win1
      : (w2 && nowMinutes >= toMinutes(win2.start) && nowMinutes < toMinutes(win2.end)) ? win2
      : null;
  if (!activeWindow) return null;
  const [h, m] = activeWindow.end.split(":").map(Number);
  const end = new Date(date);
  end.setHours(h, m, 0, 0);
  return end;
};

// Giá KHÁCH THỰC TRẢ mỗi đơn vị. Thứ tự ưu tiên: (1) Flash Sale CÁ NHÂN (chỉ có trên CartItemDTO ở
// trang Giỏ hàng, field personalFlashSaleActive/personalDiscountPrice do BE tự enrich theo user đăng
// nhập — KHÔNG xuất hiện ở ProductCard/PDP nên không ảnh hưởng nơi khác) > (2) giảm giá PRICE_DISCOUNT
// công khai (nếu isFlashSale=true thì CHỈ áp dụng trong khung giờ Flash Sale, ngoài giờ tự về giá
// thường) > (3) giá bán ổn định `price`. PHẢI khớp `PromotionService.getEffectiveUnitPrice()` backend.
export const getEffectivePrice = (product) => {
  if (product?.personalFlashSaleActive && product?.personalDiscountPrice != null) {
    return product.personalDiscountPrice;
  }
  if (product?.promotionType === PROMOTION_TYPES.PRICE_DISCOUNT
      && product?.discountPrice != null && product.discountPrice < product.price) {
    if (product?.isFlashSale && !isProductWithinItsFlashSaleWindow(product)) return product?.price || 0;
    return product.discountPrice;
  }
  return product?.price || 0;
};

// Map Product (entity thô từ products/flash-sale) sang props ProductCard cần — dùng chung giữa
// FlashSaleBanner (trang chủ) và trang xem đầy đủ Flash Sale, tránh lặp lại.
export const mapFlashSaleProductForCard = (p) => ({
  id: p.id,
  product_name: p.productName,
  price: p.price,
  discountPrice: p.discountPrice,
  promotionType: p.promotionType,
  isFlashSale: p.isFlashSale,
  flashSaleWindow1: p.flashSaleWindow1,
  flashSaleWindow2: p.flashSaleWindow2,
  promoBuyQuantity: p.promoBuyQuantity,
  promoFreeQuantity: p.promoFreeQuantity,
  promoBundleQuantity: p.promoBundleQuantity,
  promoBundlePrice: p.promoBundlePrice,
  quantity: p.quantity,
  imageUrl: p.imageUrl,
  rating: p.rating,
  category: p.category?.name,
});

// Nhãn "Flash Sale kết thúc lúc HH:mm" cho Flash Sale CÁ NHÂN ở trang Giỏ hàng — null nếu không có
// Flash Sale cá nhân đang hiệu lực (BE chỉ set personalFlashSaleActive khi đang trong khung giờ).
export const getPersonalFlashSaleBadge = (item) => {
  if (!item?.personalFlashSaleActive || !item?.personalFlashSaleEndsAt) return null;
  const endsAt = new Date(item.personalFlashSaleEndsAt);
  const hh = String(endsAt.getHours()).padStart(2, "0");
  const mm = String(endsAt.getMinutes()).padStart(2, "0");
  return `Flash Sale kết thúc lúc ${hh}:${mm}`;
};

// Tính tiền 1 dòng sản phẩm theo loại khuyến mãi — PHẢI khớp công thức backend
// (server/.../service/PromotionService.java) vì đây chỉ dùng để hiển thị, tổng tiền thật
// luôn được backend tính lại độc lập ở OrderService.create().
export const calculateLineTotal = (product, quantity) => {
  const type = product?.promotionType || PROMOTION_TYPES.NONE;
  const price = getEffectivePrice(product);

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

// % giảm giá hiển thị (badge) — ưu tiên Flash Sale cá nhân, sau đó PRICE_DISCOUNT công khai (gate
// khung giờ nếu isFlashSale=true, khớp getEffectivePrice ở trên). Gom về 1 chỗ thay vì lặp lại ở
// ProductCard/ProductDetail/admin table.
export const getDiscountPercent = (product) => {
  if (product?.personalFlashSaleActive && product?.personalDiscountPrice != null && product?.price) {
    return Math.round((1 - product.personalDiscountPrice / product.price) * 100);
  }
  if (!product?.discountPrice || product.discountPrice >= product.price) return null;
  if (product?.isFlashSale && !isProductWithinItsFlashSaleWindow(product)) return null;
  return Math.round((1 - product.discountPrice / product.price) * 100);
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
