import path from "./path";
import icons from "./icons";
import { AiOutlineInfo } from "react-icons/ai";
import { FaHome } from "react-icons/fa";
import {FaHeart } from "react-icons/fa6";
import { MdHistory } from "react-icons/md";
export const navigation = [
  {
    id: 1,
    value: "Trang chủ",
    path: `/${path.HOME}`,
  },
  {
    id: 2,
    value: "Sản phẩm",
    path: `/${path.PRODUCTS_BASE}`,
  },
];
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
  { value: 'createdAt-desc', label: 'Mới nhất' }
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

export const paymentStatusLabel = {
  UNPAID: "Chưa thanh toán",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PAYMENT_FAILED: "Thanh toán thất bại",
  REFUND_PENDING: "Chờ hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
};

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