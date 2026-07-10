import React, { useEffect, useRef } from 'react'
import ProductCard from './ProductCard'
import { apiTrackImpressions, apiTrackRecommendationClick } from '@/apis/recommendation'

// Grid sản phẩm gợi ý dùng chung cho mọi vị trí (PDP "tương tự", Home cá nhân hoá, giỏ hàng...).
// Tự log impression (1 lần khi rail thực sự lọt vào viewport) + click-through về backend —
// đây là vòng feedback loop của hệ thống gợi ý AI, không có nó model không tự học được.
// slate: { requestId, algorithmSource, placement, items } — trả về từ apiGetSimilarProducts & các API gợi ý sau này.

// Điểm neo thị giác tinh tế theo vị trí (Gutenberg diagram + serial position effect + "row skipping"
// trên lưới ảnh — xem nghiên cứu trong lịch sử trao đổi): ô đầu tiên luôn là điểm mạnh nhất (sản phẩm
// điểm cao nhất do MMR xếp hạng — không cần đổi thuật toán); ô đầu hàng 2 (nếu có ≥2 hàng) chống bỏ
// hàng dưới; ô cuối cùng tận dụng recency effect. `columns` phải khớp số cột thật của gridClassName.
const getEmphasisTier = (index, total, columns) => {
    if (index === 0) return 'primary'
    const lastIndex = total - 1
    const hasSecondRow = total > columns
    if ((hasSecondRow && index === columns) || index === lastIndex) return 'secondary'
    return undefined
}

const RecommendationRail = ({ title, slate, viewSource = 'SIMILAR', referrerProductId = null, gridClassName = 'grid grid-cols-6 gap-4 mt-4', columns = 6 }) => {
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

    return (
        <div ref={containerRef}>
            {title && (
                <h2 className='text-[20px] uppercase font-semibold py-2 border-b-4 border-main'>
                    {title}
                </h2>
            )}
            <div className={gridClassName}>
                {items.map((e, index) => (
                    <ProductCard
                        key={e.id}
                        productData={e}
                        viewSource={viewSource}
                        referrerProductId={referrerProductId}
                        onBeforeNavigate={() => apiTrackRecommendationClick(requestId, e.id)}
                        emphasisTier={getEmphasisTier(index, items.length, columns)}
                    />
                ))}
            </div>
        </div>
    )
}

export default RecommendationRail
