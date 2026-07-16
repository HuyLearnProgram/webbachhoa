import path from "./path";
import icons from "./icons";
import { AiOutlineInfo } from "react-icons/ai";
import { FaHome, FaUserFriends } from "react-icons/fa";
import {FaHeart, FaRegEye } from "react-icons/fa6";
import { MdHistory, MdLocalOffer } from "react-icons/md";
const { FaTruck, GiReturnArrow, SiAdguard, FaPhone } = icons

export const productExtraInfo = [{
  id: 1,
  title: 'Sản phẩm sạch',
  sub: 'Cam kết không chất bảo quản',
  icon: <SiAdguard />
},
{
  id: 2,
  title: 'Vận chuyển siêu tốc',
  sub: 'Đảm bảo nhận hàng trong 1 giờ với bán kính < 10km',
  icon: <FaTruck />
},
{
  id: 3,
  title: 'Hoàn trả miễn phí',
  sub: 'Trả hàng miễn phí khi có vấn đề phát sinh',
  icon: < GiReturnArrow />
},
{
  id: 4,
  title: 'Hỗ trợ 24/7',
  sub: 'Hoạt động liên tục kể cả thứ 7, CN',
  icon: <FaPhone />
}
]

export const voteOption = [
  {
    id: 1,
    text: "Rất tệ"
  },
  {
    id: 2,
    text: "Tệ"
  },
  {
    id: 3,
    text: "Bình thường"
  },
  {
    id: 4,
    text: "Tốt"
  },
  {
    id: 5,
    text: "Rất tốt"
  }
]

// Ngưỡng cảnh báo tồn kho thấp cho trang admin
export const LOW_STOCK_THRESHOLD = 5;

export const sortProductOption = [
  { value: 'productName-asc', label: 'Tên A-Z' },
  { value: 'productName-desc', label: 'Tên Z-A' },
  { value: 'price-asc', label: 'Giá thấp đến cao' },
  { value: 'price-desc', label: 'Giá cao đến thấp' },
  { value: 'rating-asc', label: 'Rating thấp' },
  { value: 'rating-desc', label: 'Rating cao' },
  { value: 'sold-desc', label: 'Bán chạy' },
  { value: 'createdAt-desc', label: 'Mới nhất' },
  { value: 'quantity-asc', label: 'Tồn kho thấp đến cao' },
  { value: 'quantity-desc', label: 'Tồn kho cao đến thấp' }
];

// Loại khuyến mãi trên sản phẩm — dùng chung ở admin (filter/form) và src/utils/promotion.js
export const PROMOTION_TYPES = {
  NONE: "NONE",
  PRICE_DISCOUNT: "PRICE_DISCOUNT",
  BUY_X_GET_Y: "BUY_X_GET_Y",
  BUNDLE_PRICE: "BUNDLE_PRICE",
};

export const promotionTypeOptions = [
  { value: PROMOTION_TYPES.NONE, label: "Không khuyến mãi" },
  { value: PROMOTION_TYPES.PRICE_DISCOUNT, label: "Giảm giá" },
  { value: PROMOTION_TYPES.BUY_X_GET_Y, label: "Mua X tặng Y" },
  { value: PROMOTION_TYPES.BUNDLE_PRICE, label: "Mua N sản phẩm giá cố định" },
];

// Nhãn thân thiện cho khách hàng (checkbox filter guest/Product.jsx) — value giữ nguyên như promotionTypeOptions,
// chỉ đổi label cho dễ hiểu hơn với người không rành thuật ngữ khuyến mãi.
export const promotionTypeCustomerOptions = [
  { value: PROMOTION_TYPES.NONE, label: "Không khuyến mãi" },
  { value: PROMOTION_TYPES.PRICE_DISCOUNT, label: "Giảm giá" },
  { value: PROMOTION_TYPES.BUY_X_GET_Y, label: "Mua nhiều tặng kèm" },
  { value: PROMOTION_TYPES.BUNDLE_PRICE, label: "Combo giá ưu đãi" },
];

export const voucherTypeOptions = [
  { value: "PERCENT", label: "Giảm theo phần trăm (%)" },
  { value: "FIXED", label: "Giảm số tiền cố định (đ)" },
];

// Khớp enum AutoGrantType phía BE (domain/AutoGrantType.java)
export const autoGrantTypeOptions = [
  { value: "WELCOME", label: "Chào mừng thành viên mới" },
  { value: "FIRST_ORDER", label: "Đơn hàng PAID đầu tiên" },
  { value: "MILESTONE", label: "Mốc số đơn PAID" },
  { value: "CART_RECOVERY", label: "Giỏ hàng bị bỏ quên (Flash Sale cá nhân)" },
  { value: "BIRTHDAY", label: "Sinh nhật" },
  { value: "WIN_BACK", label: "Không mua hàng lâu ngày (Win-back)" },
  { value: "REFERRAL_REFERRER", label: "Thưởng người giới thiệu bạn bè" },
  { value: "REFERRAL_REFEREE", label: "Thưởng người được giới thiệu (lúc đăng ký)" },
  { value: "LUCKY_DRAW", label: "Rút thăm may mắn" },
];

export const memberSidebar = [
  {
    id: 4,
    type: 'SINGLE',
    text: 'Trang chủ',
    path: `/`,
    icon: <FaHome size={20} />
  },
  {
    id: 1,
    type: 'SINGLE',
    text: 'Trang cá nhân',
    path: `/${path.MEMBER}/${path.PERSONAL}`,
    icon: <AiOutlineInfo size={20} />
  },

  {
    id: 2,
    type: 'SINGLE',
    text: 'Lịch sử đơn hàng',
    path: `/${path.MEMBER}/${path.HISTORY}`,
    icon: <MdHistory size={20} />
  },
  {
    id: 3,
    type: 'SINGLE',
    text: 'Danh sách yêu thích',
    path: `/${path.MEMBER}/${path.WISHLIST}`,
    icon: <FaHeart size={20} />
  },
  {
    id: 5,
    type: 'SINGLE',
    text: 'Sản phẩm đã xem',
    path: `/${path.MEMBER}/${path.RECENTLY_VIEWED}`,
    icon: <FaRegEye size={20} />
  },
  {
    id: 6,
    type: 'SINGLE',
    text: 'Ví voucher',
    path: `/${path.MEMBER}/${path.VOUCHER}`,
    icon: <MdLocalOffer size={20} />
  },
  {
    id: 7,
    type: 'SINGLE',
    text: 'Giới thiệu bạn bè',
    path: `/${path.MEMBER}/${path.REFERRAL}`,
    icon: <FaUserFriends size={20} />
  }
]

export const statusOrder = [
  {
    label: "Lọc theo trạng thái",
    value: "default"
  },
  {
    label: 'Pending',
    value: 0,
  },
  {
    label:'In delivery',
    value: 1,
  },
  {
    label: "Succeed",
    value: 2,
  },
  {
    label: "Cancelled",
    value: 3,
  },
  {
    label: "Returned",
    value: 4,
  }
]

// Nhãn trạng thái đơn hàng dùng chung — suy ra trực tiếp từ statusOrder (nguồn duy nhất) để mọi
// nơi hiển thị (admin Order/OrderDetail/UserDetail) không lệch chữ nhau ("Succeed" vs "Success",
// "Cancel" vs "Cancelled"...).
export const getOrderStatusLabel = (status) =>
  statusOrder.find((o) => o.value === status)?.label || String(status ?? "—");

// Nguồn sự thật duy nhất cho nhãn trạng thái thanh toán — className để tô màu ở nơi cần (VD
// UserDetail.jsx), paymentStatusLabel (chỉ text) suy ra từ đây để 2 bản không lệch nhau khi sửa.
export const paymentStatusLabelWithClass = {
  UNPAID: { text: "Chưa thanh toán", className: "text-gray-500" },
  PENDING_PAYMENT: { text: "Chờ thanh toán", className: "text-yellow-600" },
  PAID: { text: "Đã thanh toán", className: "text-green-600" },
  PAYMENT_FAILED: { text: "Thanh toán thất bại", className: "text-red-500" },
  REFUND_PENDING: { text: "Chờ hoàn tiền", className: "text-orange-500" },
  REFUNDED: { text: "Đã hoàn tiền", className: "text-blue-500" },
};

export const paymentStatusLabel = Object.fromEntries(
  Object.entries(paymentStatusLabelWithClass).map(([key, { text }]) => [key, text])
);

export const statusHideOrder = [
  {
    label: 'Unhide',
    value: 0
  },
  {
    label: "Hide",
    value: 1
  }
]
export const statusUserOption = [
  {
    label: 'Active',
    value: 1
  },
  {
    label: "Lock",
    value: 0
  }
]
export const OTHER_LOCK_REASON = "__other__";
export const lockReasonOptions = [
  "Vi phạm điều khoản sử dụng dịch vụ",
  "Gian lận / lạm dụng mã giảm giá, khuyến mãi",
  "Có dấu hiệu gian lận thanh toán / đơn hàng bất thường",
  "Đăng đánh giá sai sự thật, spam",
  "Quấy rối, hành vi không phù hợp với nhân viên hoặc khách hàng khác",
  "Theo yêu cầu của chính khách hàng (khoá tạm thời)",
]
export const sortFeedbackOrder = [
  {
    label: "Product",
    value: "product_name"
  },
  {
    label: "Rating Star",
    value: "ratingStar"
  },
  {
    label: "Updated Time",
    value: "updatedAt"
  }
]