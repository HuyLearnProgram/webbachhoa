import axiosInstance from '@/utils/axios'
import { getOrCreateSessionId } from '@/utils/sessionId'

// APIs cho hệ thống gợi ý sản phẩm AI: lấy gợi ý + ghi nhận hành vi (view/search/impression/click).
// Các hàm track* là fire-and-forget: nuốt lỗi để tracking không bao giờ làm vỡ trải nghiệm chính.

// Trả về slate gợi ý: { requestId, algorithmSource, placement, items: [SearchProductDTO...] }
export const apiGetSimilarProducts = async (pid) =>
    axiosInstance({
        url: `products/similar/${pid}`,
        method: 'get',
    })

export const apiTrackProductView = (productId, source = 'DIRECT', referrerProductId = null) =>
    axiosInstance({
        url: 'events/product-view',
        method: 'post',
        data: { sessionId: getOrCreateSessionId(), productId, source, referrerProductId },
    }).catch(() => {})

// Tạo search log, trả về id (dùng cập nhật clickedProductId sau); lỗi thì trả null
export const apiTrackSearch = async (keyword, resultCount) => {
    try {
        const res = await axiosInstance({
            url: 'events/search',
            method: 'post',
            data: { sessionId: getOrCreateSessionId(), keyword, resultCount },
        })
        return res?.data ?? null
    } catch {
        return null
    }
}

export const apiTrackSearchClick = (searchLogId, clickedProductId) =>
    axiosInstance({
        url: 'events/search',
        method: 'post',
        data: { sessionId: getOrCreateSessionId(), keyword: '-', searchLogId, clickedProductId },
    }).catch(() => {})

export const apiTrackImpressions = (requestId, placement, algorithmSource, items) =>
    axiosInstance({
        url: 'events/recommendation-impressions',
        method: 'post',
        data: { sessionId: getOrCreateSessionId(), requestId, placement, algorithmSource, items },
    }).catch(() => {})

export const apiTrackRecommendationClick = (requestId, productId) =>
    axiosInstance({
        url: 'events/recommendation-click',
        method: 'post',
        data: { sessionId: getOrCreateSessionId(), requestId, productId },
    }).catch(() => {})

// Gọi 1 lần ngay sau khi login thành công — nối lịch sử hành vi ẩn danh vào user thật
export const apiMergeTrackingSession = () => {
    const sessionId = getOrCreateSessionId()
    if (!sessionId) return Promise.resolve()
    return axiosInstance({
        url: 'events/session-merge',
        method: 'post',
        data: { sessionId },
    }).catch(() => {})
}
