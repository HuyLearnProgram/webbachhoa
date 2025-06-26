import path from '@/utils/path';
import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';

import { Link, useLocation } from 'react-router-dom';

const PaymentSuccessCOD = () => {


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