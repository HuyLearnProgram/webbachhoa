import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import RecommendationRail from './RecommendationRail'
import { apiGetHomeRecommendations } from '@/apis/recommendation'

// Section "Gợi ý dành cho bạn" trên trang Home (Phase 1 hệ thống gợi ý AI).
// Guest thấy popularity/trending; user đăng nhập được cá nhân hoá theo lịch sử xem —
// refetch khi trạng thái đăng nhập đổi để chuyển giữa 2 chế độ ngay, không cần reload.
const HomeRecommendation = () => {
    const [slate, setSlate] = useState(null)
    const { isLoggedIn } = useSelector((state) => state.user)

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const response = await apiGetHomeRecommendations()
                if (response.statusCode === 200) setSlate(response.data)
            } catch {
                setSlate(null) // gợi ý gãy không được làm vỡ trang Home
            }
        }
        fetchRecommendations()
    }, [isLoggedIn])

    if (!slate?.items?.length) return null

    return (
        <div className='w-main'>
            <RecommendationRail
                title='Gợi ý dành cho bạn'
                slate={slate}
                viewSource='HOME_FEED'
            />
        </div>
    )
}

export default HomeRecommendation
