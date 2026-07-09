// Bảng màu tham chiếu (đã validate CVD-safe qua dataviz skill), dùng chung cho mọi chart admin.
export const CATEGORICAL_COLORS = [
  '#2a78d6', '#1baf7a', '#eda100', '#008300',
  '#4a3aa7', '#e34948', '#e87ba4', '#eb6834',
];

// Màu trạng thái cố định (good/warning/serious/critical) — không dùng lại cho category thường.
const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b', progress: '#2a78d6' };

export const ORDER_STATUS_COLORS = {
  0: STATUS.warning,  // Pending
  1: STATUS.progress, // In delivery
  2: STATUS.good,     // Succeed
  3: STATUS.critical, // Cancelled
  4: STATUS.serious,  // Returned
};

export const PAYMENT_STATUS_COLORS = {
  UNPAID: STATUS.warning,
  PENDING_PAYMENT: STATUS.progress,
  PAID: STATUS.good,
  PAYMENT_FAILED: STATUS.critical,
  REFUND_PENDING: STATUS.serious,
  REFUNDED: '#4a3aa7',
};

// Ramp xanh dương 1 hue, dùng cho dữ liệu có thứ tự (VD phân bố đánh giá 1-5 sao).
export const SEQUENTIAL_BLUE = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#0d366b'];

export const GRIDLINE_COLOR = '#e1e0d9';
export const MUTED_INK = '#898781';
