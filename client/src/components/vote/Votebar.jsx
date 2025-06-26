import React, { useRef, useEffect } from "react"
import { AiFillStar } from "react-icons/ai"
const Votebar = ({ number, ratingCount, ratingTotal }) => {
    const percentRef = useRef()
    useEffect(() => {
        const percent = 100 - ratingCount * 100 / ratingTotal || 0
        percentRef.current.style.cssText = `right: ${percent}%`
    }, [ratingCount, ratingTotal])
    return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex w-[10%] items-center justify-center gap-1 text-sm">
                <span>{number}</span>
                <AiFillStar color="orange" />
            </div>
            <div className="w-[75%]">
                <div className="w-full relative h-[6px] bg-gray-200 rounded-1-full rounded-r-full">
                    <div ref={percentRef} className="absolute inset-0 bg-red-500"></div>
                </div>
            </div>
            <div className="w-[15%] justify-end">{`${ratingCount || 0} đánh giá`}</div>
        </div>
    )
}
export default Votebar;