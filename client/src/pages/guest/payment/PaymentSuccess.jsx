import { apiDeleteCart, apiSendEmail, apiUpdateProduct } from '@/apis';
import path from '@/utils/path';
import React, { useEffect, useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

const PaymentSuccess = () => {
    const { current } = useSelector(state => state.user)
    const [paymentInfo, setPaymentInfo] = useState();
    const [cart, setCart] = useState()
    const location = useLocation();


    useEffect(() => {
        const fetchPaymentData = async () => {
            // Lấy thông tin thanh toán từ localStorage
        const paymentData = localStorage.getItem('paymentData');
            if (paymentData) {
                // Phân tích cú pháp JSON
                const parsedDataStr = JSON.parse(paymentData);
                const parsedData = JSON.parse(parsedDataStr)
                const items = parsedData.items
                setPaymentInfo(parsedData);
                setCart(items)
                // Xóa dữ liệu khỏi localStorage nếu không cần thiết nữa
                localStorage.removeItem('paymentData');
            }
        }
        fetchPaymentData();
        location.state = {}
        
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
            }
        }
        handleProductUpdate();
    },[cart])
    useEffect(()=>{
        const handleEmail = async ()=>{
            if(paymentInfo){
                const formData = new FormData();
                formData.append("userId", paymentInfo?.userId);
                formData.append("address", paymentInfo?.address);
                formData.append("totalPrice", paymentInfo?.totalPrice);
                formData.append("paymentMethod", paymentInfo?.paymentMethod);

                // Thêm từng sản phẩm trong giỏ hàng vào formData
                const items = cart?.map((item) => ({
                    productId: item?.productId,
                    productName: item?.productName,
                    quantity: item?.quantity,
                    unit_price: item?.unit_price
                }));
                formData.append("items", new Blob([JSON.stringify(items)], { type: "application/json" }));
                await apiSendEmail(formData);
            }
        }
        handleEmail();
    },[paymentInfo])
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