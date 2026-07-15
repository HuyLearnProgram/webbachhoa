import path from '@/utils/path';
import React, { useEffect } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { showModal } from '@/store/app/appSlice';
import { LuckyDrawResultModal } from '@/components';

import { Link, useLocation } from 'react-router-dom';

const PaymentSuccessCOD = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        // Rút thăm may mắn (Phase 7) — kết quả đã được quay sẵn từ Checkout.jsx trước lúc reload
        // trang, chỉ đọc lại từ localStorage và hiện modal (đọc 1 lần rồi xoá, tránh hiện lại nếu
        // user refresh trang này).
        const raw = localStorage.getItem('luckyDrawResult');
        if (raw) {
            localStorage.removeItem('luckyDrawResult');
            const result = JSON.parse(raw);
            dispatch(showModal({ isShowModal: true, modalChildren: <LuckyDrawResultModal result={result} /> }));
        }
    }, [dispatch]);

    return (
        
        <div className="flex items-center justify-center mt-8">
            <div>
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
        </div>
        
        </div>
    );
};

export default PaymentSuccessCOD;