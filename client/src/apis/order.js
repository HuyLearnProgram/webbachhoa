import axiosInstance from "@/utils/axios";
export const apiGetAllOrders = async (params) =>
    axiosInstance({
        url: "/allOrders",
        method: "get",
        params: params,
        paramsSerializer: {
            encode: (value) => value,
            serialize: (params) => {
                return Object.entries(params)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('&');
            }
        }
    })

export const apiGetOrdersByUser = async (userId) =>
    axiosInstance({
        url: `/users/${userId}/orders`,
        method: "get",
    })

export const apiGetProductReturnStats = async (productId) =>
    axiosInstance({
        url: `/products/${productId}/return-stats`,
        method: "get",
    })

export const apiGetOrderDetail = async (oid) =>
    axiosInstance({
        url: `/OrderDetails/${oid}`,
        method: "get",
    })
export const apiGetOrderInfor = async (oid) =>
    axiosInstance({
        url: `/orderInfo/${oid}`,
        method: "get",
    })

export const apiGetMonthlyRevenue = async (month, year) =>
    axiosInstance({
        url: `monthly-orders-revenue`,
        method: `get`,
        params: {
            month: month,
            year: year
        }
    })

export const apiUpdateOrderStatus = async (orderId, status) =>
    axiosInstance({
        url: `updateOrderStatus/${orderId}`,
        method: 'put',
        params: { status: status },
    })

export const apiConfirmRefund = async (orderId) =>
    axiosInstance({
        url: `orders/${orderId}/confirm-refund`,
        method: "get",
    })

export const apiGetSummary = async () =>
    axiosInstance({
        url: `admin/summary`,
    })

export const apiGetOrderStatusStats = async (month, year) =>
    axiosInstance({
        url: `admin/order-status-stats`,
        params: { month, year }
    })

export const apiGetTopProducts = async (month, year, limit = 5) =>
    axiosInstance({
        url: `admin/top-products`,
        params: { month, year, limit }
    })

export const apiGetRatingDistribution = async (month, year) =>
    axiosInstance({
        url: `admin/feedback-rating-distribution`,
        params: { month, year }
    })

// apiGetMyVouchers đã chuyển sang apis/voucher.js (domain voucher tách riêng)
// Thêm hàm cập nhật thông tin đơn hàng
export const apiUpdateOrderInfo = (orderId, data) =>
    axiosInstance({
      url: `/updateOrderInfo/${orderId}`,
      method: 'put',
      data, // body request là JSON
    });
  