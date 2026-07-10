// Bàn giao nguồn view (source) cho lượt xem sản phẩm sắp diễn ra, qua sessionStorage —
// ProductCard set trước khi tự điều hướng, ProductDetail đọc + xoá khi log product-view.
export const VIEW_SOURCE_HANDOFF_KEY = 'ogani_view_source_handoff'

export const setViewSourceHandoff = (source, referrerProductId = null) => {
    try {
        sessionStorage.setItem(VIEW_SOURCE_HANDOFF_KEY, JSON.stringify({ source, referrerProductId }))
    } catch {
        // sessionStorage bị chặn — bỏ qua, chỉ mất độ chính xác của field source
    }
}
