import React, { memo, useRef, useEffect} from "react";
import avatar from "@/assets/avatarDefault.png"
import productDF from "@/assets/product_default.png"
import { FaClock, FaRegStar, FaStar, FaX } from "react-icons/fa6";
import { GrStatusCritical, GrStatusCriticalSmall } from "react-icons/gr";

const FeedbackCard = ({ data, onClose }) => {
    const modalRef = useRef()
    useEffect(() => {
        modalRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [])

    return (
        <div onClick={e => e.stopPropagation()} ref={modalRef} 
        className="rounded-xl inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl w-full relative">
            <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Close"
                    >
                    <FaX className="w-6 h-6" />
                </button>
                <div className="flex items-center justify-start mb-6 w-full">
                    <img src={data?.userAvatarUrl ?
                         `http://localhost:8080/storage/avatar/${data?.userAvatarUrl}`: avatar
                    } alt={data?.userName} className="w-16 h-16 rounded-full border-2 border-primary shadow-md object-cover" />
                    <div className="ml-4">
                    <h2 className="text-2xl font-bold text-primary">{data?.userName}</h2>
                    <p className="text-sm text-muted-foreground">{data?.product_name}</p>
                    </div>
                </div>
                
                <div className="flex items-center justify-start mb-6 w-full">
                    <span className="font-semibold text-lg mr-2">Đánh giá:</span>
                    {[...Array(5)].map((_, index) => (
                    <FaStar
                        key={index}
                        className={`w-6 h-6 ${
                        index < data?.ratingStar ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                    />
                    ))}
                </div>
                <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
                    <img 
                    // src={data?.imageUrl ? data?.imageUrl : productDF} 
                    src={
                        data?.imageUrl
                          ? data.imageUrl.startsWith("https")
                            ? data.imageUrl
                            : `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${
                              data.imageUrl
                              }`
                          : productDF
                      }
                        alt={data?.product_name}
                        className="w-48  h-48 object-cover rounded-lg shadow-md" />

                    <blockquote className="flex-1 max-h-48 min-h-48 min-w-[500px] max-w-[500px] text-gray-700 italic border-l-4 border-primary pl-4 py-2 bg-gray-50 rounded overflow-y-auto">
                        "{data?.description}"
                    </blockquote>
                </div>

                <div className="flex items-center justify-start w-full text-sm text-muted-foreground mb-1">
                     {data?.status === 0 ?
                        (<span className="flex items-center gap-2"> <GrStatusCriticalSmall size={16} color="red"/> {"Trạng thái :"}
                        <div className="flex items-center"><span>Hiện</span></div></span>)
                        :(<span className="flex items-center gap-2"><GrStatusCritical size={16} color="gray"/>{"Trạng thái :"}
                            <div className="flex items-center"><span>Ẩn</span></div> </span>)
                    }
                </div>
                <div className="flex items-center justify-start w-full text-sm text-muted-foreground">
                    <FaClock className="w-4 h-4 mr-1" />
                    <span>Cập nhật: {new Date(data?.updatedAt).toLocaleString("vi-VN")}</span>
                </div>
            </div>
        </div>
    )
}

export default memo(FeedbackCard)
