import React, { memo, useRef, useEffect, useState} from "react";
import avatar from "@/assets/avatarDefault.png"
import productDF from "@/assets/product_default.png"
import { FaClock, FaRegStar, FaStar, FaX } from "react-icons/fa6";
import { GrStatusCritical, GrStatusCriticalSmall } from "react-icons/gr";
import { Modal, Button } from 'antd';
import clsx from "clsx";
import { apiCancelOrder } from "@/apis";

const FeedbackCard = ({ data, onClose, updateOrderStatus }) => {
    const modalRef = useRef()
    const [isCancel, setIsCancel]  = useState(false)
    useEffect(() => {
        modalRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
        console.log(data)
    }, [])

    const handleCancelOrder = (oid)=>{
        Modal.confirm({
            title: 'Xác nhận hủy đơn hàng',
            content: 'Bạn có chắc chắn muốn hủy đơn hàng này không?',
            okText: 'Hủy đơn hàng',
            cancelText: 'Không',
            onOk: async () => {
                const response = await apiCancelOrder(oid,{status:3})
                if(response?.statusCode === 200) {
                    setIsCancel(true)
                    updateOrderStatus(oid, 3);
                    onClose();
                }
            },
            onCancel: () => {
                console.log('Đơn hàng không bị hủy');
            },
        });
        
    }

    const getTotalPrice = () => 
        data?.reduce((total, item) => total + item?.unit_price * item?.quantity, 0);

    // Tính tổng tiền sau khi áp dụng voucher (nếu có)
    const getDiscountedTotal = () => {
        const total = getTotalPrice();
        if (data[0]?.voucherCode) {
        if (data[0]?.voucherType === "PERCENT") {
            return total * (1 - data[0]?.voucherDiscountValue / 100);
        } else {
            return Math.max(0, total - data[0]?.voucherDiscountValue); // tránh âm tiền
        }
        }
        return total;
    };
    
    useEffect(()=>{

    },[data])
    return (
        <div onClick={e => e.stopPropagation()} ref={modalRef} 
        className="w-full max-w-3xl rounded-xl inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl w-full relative">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Close"
                    >
                    <FaX className="w-6 h-6" />
                </button>
                <div className="flex justify-between items-center">
                    <span className="text-green-600 font-medium">
                        {data[0]?.status === 0 ? "Chờ xác nhận": data[0]?.status === 1 ? "Chờ giao hàng": data[0]?.status === 2 ? "Gian hàng Thành công": "Hủy bỏ"}
                    </span>
                    <span className="text-green-600 font-medium">{(data[0]?.status === 2 || data[0]?.status === 3)  ? "HOÀN THÀNH": "CHƯA HOÀN THÀNH"}</span>
                </div>
                <div className="overflow-y-auto max-h-80 mt-2 mb-2">
                {data?.map((order,index) =>(
                    <div key={order?.orderId + "-" + index} className="flex  space-x-4 items-center justify-start mb-6 w-full">
                        <img src={
                            order?.imageUrl ? order?.imageUrl : productDF} alt={order?.productName} 
                            className="w-[40px]  h-[40px] object-cover rounded-lg border-primary shadow-md" />
                        <div className="ml-4 flex-1">
                            <h2 className="text-xl font-medium text-primary">{order?.productName}</h2>
                            <h2 className="text-sm text-gray-500">{order?.category}</h2>
                            <p className="text-sm">x{order?.quantity}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-medium">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(+order.unit_price)}</p>
                        </div>
                    </div>
                ))}
                {/* THÔNG TIN VOUCHER */}
                {data[0]?.voucherCode && (
                <div className="flex justify-between items-center mt-2 font-medium text-green-700">
                    <span>Giảm giá:</span>
                    <span className="font-semibold">
                    {data[0]?.voucherType === "PERCENT"
                        ? `-${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(getTotalPrice()*data[0].voucherDiscountValue / 100)}`
                        : `-${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(data[0]?.voucherDiscountValue)}`}
                    </span>
                </div>
                )}
                </div>
                <p className="text-sm text-blue-600">Trả hàng miễn phí 15 ngày</p>
                <div className="flex justify-between items-center pt-4 border-t">
                    <span>Thành tiền:</span>
                    <span className="text-xl font-bold text-red-500">
                        {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                        }).format(getDiscountedTotal())}
                    </span>
                </div>
                <div className="flex justify-between">
                    <div className="flex items-center justify-start text-sm text-muted-foreground">
                        <FaClock className="w-4 h-4 mr-1" />
                        <span>Thời gian đặt hàng: {new Date(data[0]?.orderTime).toLocaleString("vi-VN")}</span>
                    </div>
                    <div className="space-x-2 ">
                        <Button disabled={data[0]?.status === 0 ? false: true} 
                            className={clsx("px-4 py-2 rounded-md text-white text-semibold my-2 w-full"
                                ,data[0]?.status !== 0 && "bg-gray-400",data[0]?.status === 0 && "bg-red-500")}
                            onClick={()=>handleCancelOrder(data[0]?.orderId)}
                            type="danger"
                        >Hủy đơn hàng</Button>
                    </div>
                </div>
                
            </div>
        </div>
    )
}

export default memo(FeedbackCard)
