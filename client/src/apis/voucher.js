import axiosInstance from "@/utils/axios";

// ===== Dùng bởi khách hàng (Checkout, trang "Ví voucher") =====

export const apiGetActiveVouchers = async () =>
    axiosInstance({
        url: 'vouchers/active',
        method: 'get',
    });

export const apiGetMyVouchers = async (params) =>
    axiosInstance({
        url: 'vouchers/my',
        method: 'get',
        params,
    });

// Tổng tiền đã tiết kiệm nhờ voucher (chỉ tính đơn PAID) — hiện ở trang "Ví voucher"
export const apiGetMyVoucherSavings = async () =>
    axiosInstance({
        url: 'vouchers/my-savings',
        method: 'get',
    });

// Preview/validate voucher trước khi đặt hàng — dùng chung cho cả 2 luồng chọn-từ-danh-sách
// (voucherId) và nhập-tay (code), thuần đọc, không mutate state ở BE.
export const apiPreviewVoucher = async ({ voucherId, code, orderTotal, items }) =>
    axiosInstance({
        url: 'vouchers/preview',
        method: 'post',
        data: { voucherId, code, orderTotal, items },
    });

// Số tiền tối đa hiện trên trang đăng ký để khuyến khích nhập mã giới thiệu — tính động từ rule
// WELCOME + REFERRAL_REFEREE đang active phía BE (KHÔNG hardcode ở FE, tránh lệch khi admin sửa rule).
export const apiGetReferralMaxReward = async () =>
    axiosInstance({
        url: 'vouchers/referral-max-reward',
        method: 'get',
    });

export const apiAssignVoucher = async (id) =>
    axiosInstance({
        url: 'vouchers/assign',
        method: 'post',
        params: { id },
    });

export const apiRemoveVoucher = async (id) =>
    axiosInstance({
        url: 'vouchers/remove',
        method: 'delete',
        params: { id },
    });

// ===== Dùng bởi Admin (trang quản lý "Mã giảm giá") =====

export const apiAdminGetVouchers = async (params) =>
    axiosInstance({
        url: 'vouchers',
        method: 'get',
        params,
    });

export const apiAdminGetVoucherById = async (id) =>
    axiosInstance({
        url: `vouchers/${id}`,
        method: 'get',
    });

export const apiAdminCreateVoucher = async (data) =>
    axiosInstance({
        url: 'vouchers',
        method: 'post',
        data,
    });

export const apiAdminUpdateVoucher = async (id, data) =>
    axiosInstance({
        url: `vouchers/${id}`,
        method: 'put',
        data,
    });

export const apiAdminDeleteVoucher = async (id) =>
    axiosInstance({
        url: `vouchers/${id}`,
        method: 'delete',
    });
