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
        params: { status: status },
    })

export const apiGetSummary = async () =>
    axiosInstance({
        url: `admin/summary`,
    })

export const apiGetMyVouchers = async () =>
    axiosInstance({
        url: `vouchers/my`,
    })
// Thêm hàm cập nhật thông tin đơn hàng
export const apiUpdateOrderInfo = (orderId, data) =>
    axiosInstance({
      url: `/updateOrderInfo/${orderId}`,
      method: 'put',
      data, // body request là JSON
    });
  