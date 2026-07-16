import { apiDeleteCart, apiSendEmail, apiUpdateProduct, apiSpinLuckyDraw } from '@/apis';
import path from '@/utils/path';
import React, { useEffect, useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '@/store/user/asyncActions';
import { showModal } from '@/store/app/appSlice';
import { LuckyDrawResultModal } from '@/components';

const PaymentSuccess = () => {
    const { current } = useSelector(state => state.user)
    const dispatch = useDispatch();
    const [paymentInfo, setPaymentInfo] = useState();
    const [cart, setCart] = useState()


    useEffect(() => {
        const fetchPaymentData = async () => {
            // Lấy thông tin thanh toán từ localStorage
        const paymentData = localStorage.getItem('paymentData');
            if (paymentData) {
                // Phân tích cú pháp JSON
                const parsedData = JSON.parse(paymentData);
                const items = parsedData.items
                setPaymentInfo(parsedData);
                setCart(items)
                // Xóa dữ liệu khỏi localStorage nếu không cần thiết nữa
                localStorage.removeItem('paymentData');
            }
        }
        fetchPaymentData();
    }, [current]);
    useEffect(()=>{
        const handleProductUpdate = async ()=>{
            if (Array.isArray(cart) && cart?.length > 0) {
                await Promise.all(cart.map(async (item) => {
                    const productData = {
                        quantity:  item?.quantity,
                    };
                    // Cập nhật lại số lượng sản phẩm sau khi thanh toán
                    await apiUpdateProduct(item?.productId, productData);

                    // Xóa sản phẩm đó khỏi cart
                    await apiDeleteCart(item?.productId);
                }));
                // Cập nhật lại cartLength trên header (giỏ hàng vừa bị xóa sạch các item đã mua)
                dispatch(getCurrentUser());
            }
        }
        handleProductUpdate();
    },[cart])
    useEffect(()=>{
        const handleEmail = async ()=>{
            if(paymentInfo?.orderId){
                await apiSendEmail(paymentInfo.orderId);
            }
        }
        handleEmail();
    },[paymentInfo])
    useEffect(() => {
        // Rút thăm may mắn (Phase 7) — trigger ngay sau khi đơn hàng thành công, không chờ PAID
        // (đơn hàng đã thể hiện ý định mua). Lỗi (VD không có chiến dịch nào đang chạy) bỏ qua im lặng,
        // không phải sự cố ảnh hưởng luồng thanh toán chính.
        const handleLuckyDraw = async () => {
            if (!paymentInfo?.orderId) return;
            try {
                const res = await apiSpinLuckyDraw(paymentInfo.orderId);
                if (res?.data) {
                    dispatch(showModal({ isShowModal: true, modalChildren: <LuckyDrawResultModal result={res.data} /> }));
                }
            } catch (error) {
                // Không có chiến dịch đang chạy / đơn chưa đạt tối thiểu... — im lặng bỏ qua
            }
        };
        handleLuckyDraw();
    }, [paymentInfo])
    return (
        
        <div className="flex items-center justify-center mt-8">
            {paymentInfo && <div>
                <div className="bg-white shadow-md rounded-lg p-8 max-w-md mx-auto">
                <h1 className="text-2xl font-bold text-center text-green-600 mb-4">
                    Thanh toán thành công!
                </h1>
                <div className="flex justify-center mb-4">
                    <FaCheckCircle className="h-20 w-20 text-green-600" /> {/* Sử dụng biểu tượng từ React Icons */}
                </div>
                <p className="text-center text-gray-700 mb-6">
                    Cảm ơn bạn đã thanh toán. Đơn hàng của bạn đang được xử lý và sẽ được giao trong thời gian sớm nhất.
                </p>
                <Link 
                    to="/" 
                    className="block text-center text-white bg-green-600 hover:bg-green-700 rounded-md py-2 px-4 transition duration-200"
                >
                    Quay về trang chủ
                </Link>
                <Link 
                    to={`/${path.MEMBER}/${path.HISTORY}`} 
                    className="block text-center text-gray-600 mt-4 hover:text-gray-800"
                >
                    Xem đơn hàng của bạn
                </Link>
            </div>
        </div>}
        {!paymentInfo &&<div className="bg-white shadow-md rounded-lg p-8 max-w-md mx-auto">
                <h1 className="text-2xl font-bold text-center text-green-600 mb-4">
                    Vui lòng quay lại trang chủ
                </h1>
        </div>}
        </div>
    );
};

export default PaymentSuccess;