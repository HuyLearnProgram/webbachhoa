import axiosInstance from "@/utils/axios";

// Rút thăm may mắn sau đơn hàng (Phase 7 hệ trao voucher tự động)
export const apiSpinLuckyDraw = async (orderId) =>
    axiosInstance({
        url: 'lucky-draw/spin',
        method: 'post',
        data: { orderId },
    });

// ===== Admin CRUD =====

export const apiAdminGetLuckyDrawCampaigns = async () =>
    axiosInstance({
        url: 'admin/lucky-draw/campaigns',
        method: 'get',
    });

export const apiAdminGetLuckyDrawCampaignById = async (id) =>
    axiosInstance({
        url: `admin/lucky-draw/campaigns/${id}`,
        method: 'get',
    });

export const apiAdminCreateLuckyDrawCampaign = async (data) =>
    axiosInstance({
        url: 'admin/lucky-draw/campaigns',
        method: 'post',
        data,
    });

export const apiAdminUpdateLuckyDrawCampaign = async (id, data) =>
    axiosInstance({
        url: `admin/lucky-draw/campaigns/${id}`,
        method: 'put',
        data,
    });

export const apiAdminDeleteLuckyDrawCampaign = async (id) =>
    axiosInstance({
        url: `admin/lucky-draw/campaigns/${id}`,
        method: 'delete',
    });

export const apiAdminGetLuckyDrawPrizes = async (campaignId) =>
    axiosInstance({
        url: `admin/lucky-draw/campaigns/${campaignId}/prizes`,
        method: 'get',
    });

export const apiAdminCreateLuckyDrawPrize = async (campaignId, data) =>
    axiosInstance({
        url: `admin/lucky-draw/campaigns/${campaignId}/prizes`,
        method: 'post',
        data,
    });

export const apiAdminUpdateLuckyDrawPrize = async (prizeId, data) =>
    axiosInstance({
        url: `admin/lucky-draw/prizes/${prizeId}`,
        method: 'put',
        data,
    });

export const apiAdminDeleteLuckyDrawPrize = async (prizeId) =>
    axiosInstance({
        url: `admin/lucky-draw/prizes/${prizeId}`,
        method: 'delete',
    });
