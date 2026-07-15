import axiosInstance from "@/utils/axios";

// Admin dùng — cấu hình rule trao voucher tự động (welcome/first-order/milestone/cart-recovery/
// birthday/win-back/referral/lucky-draw). Xem VoucherGrantService (BE) cho luồng trao thật.

export const apiGetAutoGrantRules = async () =>
    axiosInstance({
        url: 'admin/voucher-auto-grant-rules',
        method: 'get',
    });

export const apiCreateAutoGrantRule = async (data) =>
    axiosInstance({
        url: 'admin/voucher-auto-grant-rules',
        method: 'post',
        data,
    });

export const apiUpdateAutoGrantRule = async (id, data) =>
    axiosInstance({
        url: `admin/voucher-auto-grant-rules/${id}`,
        method: 'put',
        data,
    });

export const apiDeleteAutoGrantRule = async (id) =>
    axiosInstance({
        url: `admin/voucher-auto-grant-rules/${id}`,
        method: 'delete',
    });
