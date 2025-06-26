import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import payment from '@/assets/payment/payment.svg';
import { apiCreateOrder, apiDeleteCart, apiGetSelectedCart, apiPaymentVNPay, apiSendEmail, getUserById, apiUpdateProduct, apiGetMyVouchers } from "@/apis";
import { Button,InputForm } from "@/components";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaRegCreditCard } from "react-icons/fa6";


const Checkout = () => {
    const { current } = useSelector(state => state.user)
    const { handleSubmit, register, formState: { errors, isValid }, reset } = useForm()
    const [cart, setCart] = useState()
    const [user, setUser] = useState()
    const [isCart, setIsCart] = useState(false)

    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [tempSelectedVoucher, setTempSelectedVoucher] = useState(null); // mã đang được chọn tạm trong popup
    const [userVouchers, setUserVouchers] = useState([]);
    const [selectedVoucher, setSelectedVoucher] = useState(null);

    const location = useLocation();
    const { selectedItems } = location.state || {};
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const fetchCart = async () => {
        const response = await apiGetSelectedCart(selectedItems);
        const fetchedCart = response?.data; // Lưu trữ dữ liệu trong biến riêng biệt
        setCart(fetchedCart);
        // Cập nhật trạng thái isCart dựa trên fetchedCart
        setIsCart(fetchedCart && fetchedCart?.length > 0);
    }
    const fetchUserByCurrentId = async () => {
        try {
            const response = await getUserById(current?.id);
            setUser(response.data);
        } catch (error) {
            console.error("Error fetching avatar:", error);
        }
    }

    const fetchUserVouchers = async () => {
        try {
            const res = await apiGetMyVouchers(); // API trả danh sách vouchers (chưa dùng)
            if (res?.data?.result) setUserVouchers(res.data.result);
        } catch (err) {
            console.error('Lỗi khi lấy danh sách voucher:', err);
        }
    };

    const handlePayment = async (data, event) => {
        try {
            const paymentMethod = event.nativeEvent.submitter.value;
            const formData = new FormData();
            formData.append("userId", current?.id);
            formData.append("address", data.address);
            formData.append("phone", data.phone);
            let total = cart?.reduce((sum, el) => +el.price * el.quantity + sum, 0);
            if (selectedVoucher) {
                if (selectedVoucher.type === "PERCENT") {
                    total = total * (1 - selectedVoucher.discountValue / 100);
                } else {
                    total -= selectedVoucher.discountValue;
                }
            }
            formData.append("totalPrice", Math.max(total, 0));

            formData.append("paymentMethod", paymentMethod);
            
            if (selectedVoucher?.id) {
                formData.append("voucherId", selectedVoucher.id);
            }
    
            const items = cart?.map((item) => ({
                productId: item?.id,
                productName: item?.productName,
                quantity: item?.quantity,
                unit_price: item?.price
            }));
            formData.append("items", new Blob([JSON.stringify(items)], { type: "application/json" }));
    
            const response = await apiCreateOrder(formData);
            const delay = 2000;
    
            if (!response || response.statusCode !== 201) {
                console.log(response);
                throw new Error(response?.message || "Không thể tạo đơn hàng");
            }
    
            if (paymentMethod === 'VNPAY') {
                const vnpayRes = await apiPaymentVNPay({ amount: formData.get("totalPrice"), bankCode: "NCB" });
    
                if (!vnpayRes || vnpayRes.statusCode !== 200 || vnpayRes.data?.data?.code !== "ok") {
                    throw new Error("Lỗi khi tạo liên kết thanh toán với VNPAY");
                }
    
                // Lưu vào localStorage và chuyển trang
                const formObject = {};
                const promises = [];
    
                formData.forEach((value, key) => {
                    if (key === "items") {
                        const reader = new FileReader();
                        const promise = new Promise((resolve) => {
                            reader.onload = () => {
                                formObject[key] = JSON.parse(reader.result);
                                resolve();
                            };
                        });
                        reader.readAsText(value);
                        promises.push(promise);
                    } else {
                        formObject[key] = value;
                    }
                });
    
                await Promise.all(promises);
                localStorage.setItem('paymentData', JSON.stringify(JSON.stringify(formObject)));
                location.state = {};
                window.location.href = vnpayRes.data.data.paymentUrl;
            } else {
                toast.success(response.data?.message || "Đặt hàng thành công!", {
                    autoClose: delay
                });
    
                await Promise.all(cart.map(async (item) => {
                    await apiUpdateProduct(item?.id, { quantity: item.quantity });
                    await apiDeleteCart(item?.id);
                }));
    
                await apiSendEmail(formData);
    
                // setTimeout(() => {
                    navigate('/payment-success-cod');
                    window.location.reload();
                // }, delay);
            }
    
        } catch (error) {
            console.error("Lỗi khi xử lý thanh toán:", error);
            toast.error(`Lỗi hệ thống: ${error?.message || "Không xác định"}`, {
                autoClose: 3000,
                hideProgressBar: false
            });
        }
    };

    const handleSelectVoucher = (voucher) => {
        setSelectedVoucher(voucher);
        setShowVoucherModal(false);
    };
    
    //Tính tổng tiền
    const getTotalWithDiscount = () => {
        let total = getCartTotal();
        if (selectedVoucher) {
          if (selectedVoucher.type === "PERCENT") {
            total *= (1 - selectedVoucher.discountValue / 100);
          } else {
            total -= selectedVoucher.discountValue;
          }
        }
        return total > 0 ? total : 0;
    };

    const getCartTotal = () => {
        return cart?.reduce((sum, el) => +el.price * el.quantity + sum, 0) || 0;
    };
    
      
    // Gọi khi mở pop up voucher
    const openVoucherModal = () => {
        setTempSelectedVoucher(selectedVoucher); // sao chép mã đang dùng sang tạm
        setShowVoucherModal(true);
    };
    // Tính số tiền được giảm
    const getDiscountAmount = () => {
        let total = cart?.reduce((sum, el) => +el.price * el.quantity + sum, 0) || 0;
        if (!selectedVoucher) return 0;
    
        if (selectedVoucher.type === "PERCENT") {
            return (total * selectedVoucher.discountValue) / 100;
        } else {
            return selectedVoucher.discountValue;
        }
    };

    // Lấy dữ liệu người dùng
    useEffect(() => {
        if (current) {
            fetchUserByCurrentId();
            fetchUserVouchers();
        }
    }, [current]);
    // Lấy giỏ hàng nếu đã có selectedItems
    useEffect(() => {
        if (current && selectedItems?.length > 0) {
            fetchCart();
        }
    }, [current, selectedItems]);

    const hasReset = useRef(false);

    useEffect(() => {
        if (!hasReset.current && user?.address) {
            reset({
                address: user?.address,
                phone: user?.phone
            });
            hasReset.current = true;
        }
    }, [user, reset]);

    return (
        <div className="p-8 grid grid-cols-10 h-full overflow-y-auto gap-6">
            <div className="w-full flex justify-center items-center col-span-3">
                <img src={payment} alt="payment" className="h-[70%] object-contain" />
            </div>
            {!isCart &&
                <div className="flex flex-col gap-4 w-full justify-center items-center col-span-7">
                    <span className="text-2xl font-medium">
                        Xin hãy chọn sản phẩm để thanh toán
                    </span>
                    <Button
                        handleOnClick={() => navigate('/cart')}

                    >
                        Quay về giỏ hàng
                    </Button>
                </div>
            }
            {isCart &&
                <div className="flex w-full flex-col justify-center items-center col-span-7 gap-6">
                    <h2 className="text-3xl mb-6 font-bold">Kiểm tra đơn hàng của bạn</h2>
                    <div className="grid grid-cols-10 h-full w-full gap-6">
                        <table className="table-auto w-full h-fit col-span-6 border-collapse border border-gray-300 rounded-lg">
                            <thead>
                                {/* border bg-gray-300 */}
                                <tr className=" border-b hover:bg-gray-50 transition duration-200">
                                    <th className="p-2 text-left">Sản phẩm</th>
                                    <th className="p-2 text-center">Số lượng</th>
                                    <th className="p-2 text-right">Giá</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart?.map((el, index) => (<tr className="border" key={el?.productId + "-" + index}>
                                    <td className="p-2 text-left">{el?.productName}</td>
                                    <td className="p-2 text-center">{el?.quantity}</td>
                                    <td className="p-2 text-right">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(+el?.price)}</td>
                                </tr>))}

                                {/* Dòng giảm giá nếu có mã */}
                                {selectedVoucher && (
                                    <tr className="border bg-green-50">
                                    <td className="p-2 text-left font-medium text-green-600" colSpan={2}>
                                        Giảm giá
                                    </td>
                                    
                                    <td className="p-2 text-right text-green-600">
                                        -{new Intl.NumberFormat("vi-VN", {
                                        style: "currency",
                                        currency: "VND"
                                        }).format(getDiscountAmount())}
                                    </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {/* col-span-4 flex  flex-col gap-[35px] p-4 bg-gray-200 */}
                        <form onSubmit={handleSubmit(handlePayment)} className="p-6 bg-white rounded-lg shadow-md col-span-4 space-y-4">
                            <span className="font-medium">Thông tin thanh toán</span>
                            <div className="flex items-center justify-center mb-6">
                                <FaRegCreditCard className="w-16 h-16 text-primary" />
                            </div>
                            <div className="text-2xl font-bold text-center">
                                Tổng tiền: 
                                <span className="text-green-500 ml-2">
                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(getTotalWithDiscount())}
                                </span>
                            </div>
                            <InputForm
                                label='Địa chỉ:'
                                register={register}
                                errors={errors}
                                id='address'
                                validate={{
                                    required: 'Vui lòng nhập địa chỉ của bạn',
                                    // minLength: {
                                    //     value: 5,
                                    //     message: 'Địa chỉ phải có ít nhất 5 ký tự'
                                    // },
                                    // pattern: {
                                    //     value: /^[0-9a-zA-ZÀÁÂÃÈÉÊỀẾỆÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêềếệìíòóôõùúăđĩũơưạ-ỹ\s,.-/]+$/,
                                    //     message: 'Địa chỉ không được chứa ký tự đặc biệt'
                                    // }
                                }}
                            />
                            <InputForm
                                label='Số điện thoại'
                                register={register}
                                errors={errors}
                                id='phone'
                                validate={{
                                    required: 'Vui lòng điền thông tin số điện thoại',
                                    // pattern: {
                                    //     value: /^0\d{9}$/, // Regex để kiểm tra số điện thoại bắt đầu bằng 0 và có 10 số
                                    //     message: 'Số điện thoại không hợp lệ',
                                    // },
                                }}
                            />
                            {/* VOUCHER SECTION */}
                            <div className="flex flex-col gap-2">
                                <label className="font-medium text-sm">Mã giảm giá</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={selectedVoucher?.code || ''}
                                        readOnly
                                        className="w-full px-4 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={openVoucherModal}
                                        className="bg-yellow-400 hover:bg-yellow-300 text-white px-2 w-[215px] rounded-md"
                                    >
                                        Chọn voucher
                                    </button>
                                </div>
                            </div>
                            {/* px-4 py-2 rounded-md text-white bg-main text-semibold my-2 w-full justify-end */}
                            {<button className={ "px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-500 shadow-lg transition duration-300 w-full"} type="submit" name="paymentMethod" value="COD">Thanh toán khi nhận hàng</button>}
                            {<button className={"px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition duration-300 w-full"} type="submit" name="paymentMethod" value="VNPAY">Thanh toán bằng VNPAY</button>}
                        </form>
                    </div>
                </div>
            }

            {showVoucherModal && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-center items-center">
                <div className="bg-white rounded-md w-[600px] max-h-[80vh] overflow-y-auto shadow-lg">
                {/* Header */}
                <div className="border-b p-4">
                    <h2 className="text-xl font-semibold">Chọn mã giảm giá</h2>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    {userVouchers.map((voucher) => {
                    const isSelected = tempSelectedVoucher?.id === voucher.id;
                    const cartTotal = getCartTotal();
                    const notEligible = (cartTotal < (voucher.minimumOrderAmount || 0)) || voucher.usedCount >= voucher.maxUsage;

                    return (
                        <div
                        key={voucher.id}
                        onClick={() => {
                            if (!notEligible) {
                            setTempSelectedVoucher(isSelected ? null : voucher);
                            }
                        }}
                        className={`flex border rounded-lg cursor-pointer transition hover:shadow-sm ${
                            isSelected ? "ring-2 ring-green-500" : ""
                        } ${notEligible ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                        <div className="bg-cyan-400 text-white flex items-center justify-center px-4 min-w-[100px] text-sm font-bold uppercase">
                            {voucher.type === "PERCENT" ? "SALE" : "GIẢM"}
                        </div>
                        <div className="flex-1 p-3 space-y-1">
                            <div className="flex justify-between">
                            <span className="font-medium text-blue-600">{voucher.code}</span>
                            <div className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center">
                                {isSelected && !notEligible && (
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                )}
                            </div>
                            </div>
                            <div className="text-sm">
                            Giảm:{" "}
                            <span className="font-medium">
                                {voucher.type === "PERCENT"
                                ? `${voucher.discountValue}%`
                                : `${voucher.discountValue.toLocaleString()}đ`}
                            </span>
                            </div>
                            <div className="text-sm text-gray-600">
                            Đơn tối thiểu: {voucher.minimumOrderAmount?.toLocaleString()}đ
                            </div>
                            <div className="text-sm text-gray-600">
                            Còn lại: {(voucher.maxUsage - voucher.usedCount)?.toLocaleString()}
                            </div>
                            {notEligible && (
                            <div className="text-sm text-red-500 font-medium">
                                {voucher.usedCount >= voucher.maxUsage ? "Đã dùng hết" : "Không đủ điều kiện sử dụng"}
                            </div>
                            )}
                        </div>
                        </div>
                    );
                    })}
                </div>

                {/* Footer */}
                <div className="flex justify-between p-4 border-t">
                    <button
                    onClick={() => setShowVoucherModal(false)}
                    className="text-gray-600 hover:underline"
                    >
                    Trở lại
                    </button>
                    <button
                    onClick={() => {
                        const total = getCartTotal();
                        if (tempSelectedVoucher && total < (tempSelectedVoucher.minimumOrderAmount || 0)) return;
                        setSelectedVoucher(tempSelectedVoucher);
                        setShowVoucherModal(false);
                    }}
                    className={`px-4 py-2 rounded-md text-white ${
                        tempSelectedVoucher && getCartTotal() < (tempSelectedVoucher.minimumOrderAmount || 0)
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-orange-500 hover:bg-orange-600"
                    }`}
                    >
                    OK
                    </button>
                </div>
                </div>
            </div>
            )}
        </div>
    )
}

export default Checkout;