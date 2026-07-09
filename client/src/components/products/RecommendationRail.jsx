import React, { useEffect, useRef } from 'react'
import ProductCard from './ProductCard'
import { apiTrackImpressions, apiTrackRecommendationClick } from '@/apis/recommendation'

// Key sessionStorage bàn giao nguồn view giữa 2 trang: rail set trước khi ProductCard tự navigate,
// ProductDetail đọc + xoá khi log product-view (tránh phải sửa API của ProductCard)
export const VIEW_SOURCE_HANDOFF_KEY = 'ogani_view_source_handoff'

// Grid sản phẩm gợi ý dùng chung cho mọi vị trí (PDP "tương tự", Home cá nhân hoá, giỏ hàng...).
// Tự log impression (1 lần khi rail thực sự lọt vào viewport) + click-through về backend —
// đây là vòng feedback loop của hệ thống gợi ý AI, không có nó model không tự học được.
// slate: { requestId, algorithmSource, placement, items } — trả về từ apiGetSimilarProducts & các API gợi ý sau này.
const RecommendationRail = ({ title, slate, viewSource = 'SIMILAR', referrerProductId = null, gridClassName = 'grid grid-cols-6 gap-4 mt-4' }) => {
    const containerRef = useRef(null)
    const impressionLoggedRef = useRef(null)

    const { requestId, algorithmSource, placement, items } = slate || {}

    useEffect(() => {
        if (!requestId || !items?.length || !containerRef.current) return
        if (impressionLoggedRef.current === requestId) return

        const observer = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting) && impressionLoggedRef.current !== requestId) {
                impressionLoggedRef.current = requestId
                apiTrackImpressions(
                    requestId,
                    placement,
                    algorithmSource,
                    items.map((p, index) => ({ productId: p.id, rankPosition: index }))
                )
                observer.disconnect()
            }
        }, { threshold: 0.3 })

        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [requestId, placement, algorithmSource, items])

    if (!items?.length) return null

    const handleClickCapture = (productId) => {
        apiTrackRecommendationClick(requestId, productId)
        try {
            sessionStorage.setItem(VIEW_SOURCE_HANDOFF_KEY, JSON.stringify({ source: viewSource, referrerProductId }))
        } catch {
            // sessionStorage bị chặn — bỏ qua, chỉ mất độ chính xác của field source
        }
    }

    return (
        <div ref={containerRef}>
            {title && (
                <h2 className='text-[20px] uppercase font-semibold py-2 border-b-4 border-main'>
                    {title}
                </h2>
            )}
            <div className={gridClassName}>
                {items.map((e) => (
                    <div key={e.id} onClickCapture={() => handleClickCapture(e.id)}>
                        <ProductCard productData={e} />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default RecommendationRail
