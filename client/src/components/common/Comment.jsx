import React from "react";
import avatar from '@/assets/avatarDefault.png'
import moment from "moment";
import { renderStarFromNumber } from "@/utils/helper";

const Comment = ({image, name='Anonymos', content, updatedAt, ratingStar})=>{
    return (<div className="flex gap-4">
        <div className="flex-none">
            <img src={!image.endsWith("null") ? image : avatar} alt="avatar" className="w-[25px] h-[25px] object-cover rounded-full"/>
        </div>
        <div className="flex flex-col flex-auto">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold">{name}</h3>
                <span className="text-xs italic">{updatedAt ? moment(updatedAt)?.fromNow() : "Không xác định"}</span>
            </div>
            <div className="flex flex-col gap-2 text-sm pl-4 mt-4 border border-gray-300 py-2 bg-gray-100">
                <span className="flex items-center gap-1">
                    <span className="font-semibold">Đánh giá:</span>
                    <span className="flex items-center gap-1">{renderStarFromNumber(ratingStar)?.map((el,index)=>(
                        <span key={index}>{el}</span>
                    ))}</span>
                </span>
                <span className="flex gap-1">
                    <span className="font-semibold">Bình luận:</span>
                    <span>{content}</span>
                </span>
            </div>
        </div>
    </div>)
}

export default Comment