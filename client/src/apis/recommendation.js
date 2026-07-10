import axiosInstance from '@/utils/axios'
import { getOrCreateSessionId } from '@/utils/sessionId'

// APIs cho hệ thống gợi ý sản phẩm AI: lấy gợi ý + ghi nhận hành vi (view/search/impression/click).
// Các hàm track* là fire-and-forget: nuốt lỗi để tracking không bao giờ làm vỡ trải nghiệm chính.

// Trả về slate gợi ý: { requestId, algorithmSource, placement, items: [SearchProductDTO...] }
// sessionId để backend áp fatigue-decay + CF cá nhân hoá (Phase 2)
export const apiGetSimilarProducts = async (pid) =>
    axiosInstance({
        url: `products/similar/${pid}`,
        method: 'get',
        params: { sessionId: getOrCreateSessionId() },
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

// Gợi ý cho trang Home: guest → popularity/trending, đã đăng nhập → cá nhân hoá theo lịch sử xem
// (backend tự nhận diện user qua JWT, client chỉ gửi sessionId)
export const apiGetHomeRecommendations = async () =>
    axiosInstance({
        url: 'recommendations/home',
        method: 'get',
        params: { sessionId: getOrCreateSessionId() },
    })

// "Có thể bạn cũng thích" ở giỏ hàng: co-purchase theo sản phẩm trong giỏ, fallback popularity
export const apiGetCartSuggestions = async (productIds) =>
    axiosInstance({
        url: 'recommendations/cart-suggestions',
        method: 'get',
        params: { sessionId: getOrCreateSessionId(), productIds: productIds.join(',') },
    })

// Phase 3: metrics experiment (CTR/diversity/coverage/entropy/A-B) cho dashboard admin —
// Java proxy sang Python, khoá ADMIN
export const apiGetRecommendationMetrics = async (days = 30) =>
    axiosInstance({
        url: 'admin/recommendation-metrics',
        method: 'get',
        params: { days },
    })

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
