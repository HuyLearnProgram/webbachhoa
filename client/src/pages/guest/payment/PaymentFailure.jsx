import React from 'react'
import { Link } from 'react-router-dom';
import { FaTimesCircle } from 'react-icons/fa'; // Import biểu tượng từ React Icons

const PaymentFailure = () => {
    return (
        <div className="flex items-center justify-center mt-8">
            <div className="bg-white shadow-md rounded-lg p-8 max-w-md mx-auto">
                <h1 className="text-2xl font-bold text-center text-red-600 mb-4">
                    Thanh toán không thành công
                </h1>
                <div className="flex justify-center mb-4">
                    <FaTimesCircle className="h-20 w-20 text-red-600" /> {/* Sử dụng biểu tượng từ React Icons */}
                </div>
                <p className="text-center text-gray-700 mb-6">
                    Rất tiếc, giao dịch của bạn không thành công. Vui lòng kiểm tra lại thông tin thanh toán của bạn và thử lại.
                </p>
                <Link 
                    to="/" 
                    className="block text-center text-white bg-red-600 hover:bg-red-700 rounded-md py-2 px-4 transition duration-200"
                >
                    Quay về trang chủ
                </Link>
            </div>
        </div>
    );
}

export default PaymentFailure
