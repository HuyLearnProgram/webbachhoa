import React, { useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import payment from '@/assets/payment/payment.svg';
import { apiCreateOrder, apiDeleteCart, apiGetSelectedCart, apiPaymentVNPay, apiSendEmail, getUserById, apiUpdateProduct, apiGetMyVouchers, apiPreviewVoucher, apiSpinLuckyDraw } from "@/apis";
import { Button,InputForm, GiftDetailModal } from "@/components";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaRegCreditCard } from "react-icons/fa6";
import { showModal } from "@/store/app/appSlice";
import { getCurrentUser } from "@/store/user/asyncActions";
import { calculateLineTotal, getFreeGiftUnits, getPromotionBadgeLabel, getDiscountPercent, getEffectivePrice } from "@/utils/promotion";
import { getOrCreateSessionId } from "@/utils/sessionId";


const Checkout = () => {
    const { current } = useSelector(state => state.user)
    const { handleSubmit, register, formState: { errors, isValid }, reset } = useForm()
    const [cart, setCart] = useState()
    const [user, setUser] = useState()
    const [isCart, setIsCart] = useState(false)

    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [tempSelectedVoucher, setTempSelectedVoucher] = useState(null); // mã đang được chọn tạm trong popup
    const [userVouchers, setUserVouchers] = useState([]);
    // selectedVoucher giờ luôn là kết quả trả về từ server (POST vouchers/preview) — không bao giờ
    // tự tính PERCENT/FIXED ở FE nữa, tránh trùng lặp công thức và đảm bảo BE là nguồn sự thật duy nhất.
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [manualVoucherCode, setManualVoucherCode] = useState('');
    const [voucherLoading, setVoucherLoading] = useState(false);
    // Giảm dự kiến tính trước cho TỪNG voucher trong popup (key = voucher.id) — luôn lấy từ server
    // (POST vouchers/preview) để khỏi tự tính lại PERCENT/FIXED/category-scope ở FE.
    const [voucherPreviews, setVoucherPreviews] = useState({});
    const [voucherPreviewsLoading, setVoucherPreviewsLoading] = useState(false);

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
            const res = await apiGetMyVouchers({ size: 100 }); // đủ lớn cho modal chọn ở checkout
            if (res?.data?.result) setUserVouchers(res.data.result);
        } catch (err) {
            console.error('Lỗi khi lấy danh sách voucher:', err);
        }
    };

    // Dùng chung cho mọi lần gọi vouchers/preview (chọn 1 mã lẫn tính trước cho cả danh sách trong popup).
    const buildPreviewItems = () => (cart || []).map((el) => ({
        productId: el.id,
        lineTotal: calculateLineTotal(el, el.quantity).total,
    }));

    // Hợp nhất 2 luồng (chọn từ danh sách + nhập tay) qua 1 hàm duy nhất gọi server validate —
    // BE là nguồn sự thật duy nhất (check hạn dùng/đã dùng/hết lượt), FE không tự tính toán trước.
    const previewAndApplyVoucher = async ({ voucherId, code }) => {
        setVoucherLoading(true);
        try {
            const items = buildPreviewItems();
            const res = await apiPreviewVoucher({ voucherId, code, orderTotal: getCartTotal(), items });
            if (res?.statusCode === 200 && res?.data) {
                setSelectedVoucher(res.data);
                return true;
            }
            // Lỗi nghiệp vụ (400) — message từ BE đã rõ ràng, không phải lỗi hệ thống
            toast.error(res?.message || 'Voucher không hợp lệ', { autoClose: 3000 });
            setSelectedVoucher(null);
            fetchUserVouchers();
            return false;
        } catch (error) {
            // Lỗi mạng/hệ thống thật sự (khác lỗi nghiệp vụ 400 từ BE)
            console.error('Lỗi khi kiểm tra voucher:', error);
            toast.error(`Lỗi hệ thống: ${error?.message || 'Không xác định'}`, { autoClose: 3000 });
            setSelectedVoucher(null);
            return false;
        } finally {
            setVoucherLoading(false);
        }
    };

    const handleApplyManualCode = async () => {
        const code = manualVoucherCode.trim();
        if (!code) return;
        const ok = await previewAndApplyVoucher({ code });
        if (ok) setManualVoucherCode('');
    };

    const handleClearVoucher = () => {
        setSelectedVoucher(null);
    };

    const handlePayment = async (data, event) => {
        try {
            const paymentMethod = event.nativeEvent.submitter.value;
            const formData = new FormData();
            formData.append("userId", current?.id);
            formData.append("address", data.address);
            formData.append("phone", data.phone);
            // Phase 3: sessionId để backend attribute conversion cho cả impression
            // được ghi lúc còn là guest (trước khi login/merge session)
            formData.append("sessionId", getOrCreateSessionId());
            // total đã được server tính sẵn (kèm trần maxDiscountAmount nếu có) từ lần preview gần nhất
            const total = selectedVoucher ? selectedVoucher.totalAfterDiscount : getCartTotal();
            formData.append("totalPrice", Math.max(total, 0));

            formData.append("paymentMethod", paymentMethod);

            if (selectedVoucher?.voucherId) {
                formData.append("voucherId", selectedVoucher.voucherId);
            }

            const items = cart?.map((item) => ({
                productId: item?.id,
                productName: item?.productName,
                quantity: item?.quantity,
                unit_price: getEffectivePrice(item)
            }));
            formData.append("items", new Blob([JSON.stringify(items)], { type: "application/json" }));

            const response = await apiCreateOrder(formData);
            const delay = 2000;

            if (!response || response.statusCode !== 201) {
                // Lỗi nghiệp vụ từ BE (VD voucher vừa hết lượt/hết hạn ngay lúc submit) — message đã
                // rõ ràng, không phải lỗi hệ thống; đồng thời gỡ voucher stale để tránh lặp lại lỗi.
                console.log(response);
                toast.error(response?.message || "Không thể tạo đơn hàng", { autoClose: 3000 });
                if (selectedVoucher) {
                    setSelectedVoucher(null);
                    fetchUserVouchers();
                }
                return;
            }

            if (paymentMethod === 'VNPAY') {
                const vnpayRes = await apiPaymentVNPay({ orderId: response.data, amount: formData.get("totalPrice"), bankCode: "NCB" });
    
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
                formObject.orderId = response.data;
                localStorage.setItem('paymentData', JSON.stringify(formObject));
                window.location.href = vnpayRes.data.data.paymentUrl;
            } else {
                toast.success(response.data?.message || "Đặt hàng thành công!", {
                    autoClose: delay
                });

                // Đơn hàng đã tạo thành công ở trên — các bước dọn dẹp sau đây (trừ kho/xoá giỏ/gửi mail)
                // không được để lỗi rơi xuống catch ngoài cùng và hiện nhầm toast "Lỗi hệ thống" cho
                // khách (đơn thực ra đã đặt xong). Bắt riêng, chỉ cảnh báo khác đi, vẫn tiếp tục điều
                // hướng sang trang thành công như bình thường.
                try {
                    await Promise.all(cart.map(async (item) => {
                        await apiUpdateProduct(item?.id, { quantity: item.quantity });
                        await apiDeleteCart(item?.id);
                    }));

                    dispatch(getCurrentUser());
                    await apiSendEmail(response.data);
                } catch (postOrderError) {
                    console.error("Lỗi cập nhật giỏ hàng/gửi email sau khi đặt hàng thành công:", postOrderError);
                    toast.warn("Đặt hàng thành công! Có lỗi nhỏ khi cập nhật giỏ hàng, vui lòng liên hệ hỗ trợ nếu cần.", {
                        autoClose: 4000
                    });
                }

                // Rút thăm may mắn (Phase 7) — gọi TRƯỚC khi reload trang (COD điều hướng kèm reload
                // toàn trang ngay sau đây nên state React sẽ mất, phải lưu tạm kết quả vào localStorage
                // để PaymentSuccessCOD.jsx đọc lại và hiện modal sau khi trang tải lại).
                try {
                    const luckyRes = await apiSpinLuckyDraw(response.data);
                    if (luckyRes?.data) {
                        localStorage.setItem('luckyDrawResult', JSON.stringify(luckyRes.data));
                    }
                } catch (error) {
                    // Không có chiến dịch đang chạy / đơn chưa đạt tối thiểu... — im lặng bỏ qua
                }

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

    //Tính tổng tiền — đọc thẳng từ kết quả preview server trả về, không tự tính lại ở FE
    const getTotalWithDiscount = () => {
        if (selectedVoucher) return selectedVoucher.totalAfterDiscount;
        return getCartTotal();
    };

    const getCartTotal = () => {
        return cart?.reduce((sum, el) => calculateLineTotal(el, el.quantity).total + sum, 0) || 0;
    };

    const getGiftItems = () => {
        return (cart || [])
            .map(item => ({ item, freeUnits: getFreeGiftUnits(item, item.quantity) }))
            .filter(({ freeUnits }) => freeUnits > 0);
    };

    const handleShowGiftDetail = () => {
        const gifts = getGiftItems();
        if (gifts.length === 0) return;
        dispatch(showModal({
            isShowModal: true,
            modalChildren: (
                <GiftDetailModal
                    gifts={gifts}
                    onClose={() => dispatch(showModal({ isShowModal: false, modalChildren: null }))}
                />
            )
        }));
    };
    
      
    // Gọi khi mở pop up voucher
    const openVoucherModal = () => {
        // selectedVoucher có shape từ preview response (voucherId), khác shape list item (id) —
        // chỉ cần seed đúng id để modal tô đúng voucher đang áp dụng.
        setTempSelectedVoucher(selectedVoucher ? { id: selectedVoucher.voucherId } : null);
        setShowVoucherModal(true);
    };
    // Tính số tiền được giảm — đọc thẳng từ kết quả preview server trả về
    const getDiscountAmount = () => {
        return selectedVoucher ? selectedVoucher.discountAmount : 0;
    };

    // Tính trước "giảm dự kiến" cho TỪNG voucher trong popup khi vừa mở, để người dùng thấy ngay mã
    // nào lợi nhất mà không phải bấm OK thử từng mã. Gọi song song vouchers/preview cho mỗi voucher
    // (BE vẫn là nguồn tính duy nhất — kể cả voucher theo danh mục mà FE không tự tính đúng được).
    useEffect(() => {
        if (!showVoucherModal || userVouchers.length === 0) {
            return;
        }
        let cancelled = false;
        (async () => {
            setVoucherPreviewsLoading(true);
            const items = buildPreviewItems();
            const orderTotal = getCartTotal();
            const results = await Promise.allSettled(
                userVouchers.map((v) => apiPreviewVoucher({ voucherId: v.id, orderTotal, items }))
            );
            if (cancelled) return;
            const map = {};
            results.forEach((r, idx) => {
                const voucherId = userVouchers[idx].id;
                if (r.status === 'fulfilled' && r.value?.statusCode === 200 && r.value?.data) {
                    map[voucherId] = {
                        discountAmount: r.value.data.discountAmount || 0,
                        totalAfterDiscount: r.value.data.totalAfterDiscount,
                        ineligible: false,
                    };
                } else {
                    const reason = r.status === 'fulfilled' ? r.value?.message : null;
                    map[voucherId] = { discountAmount: 0, ineligible: true, reason: reason || 'Không đủ điều kiện sử dụng' };
                }
            });
            setVoucherPreviews(map);
            setVoucherPreviewsLoading(false);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showVoucherModal, userVouchers]);

    // Voucher hợp lệ (giảm được) sắp xếp giảm dần theo số tiền giảm dự kiến lên đầu, voucher không
    // đủ điều kiện xuống cuối — mã giảm nhiều nhất được đánh dấu "Tốt nhất".
    const sortedVouchers = useMemo(() => {
        const arr = [...userVouchers];
        arr.sort((a, b) => {
            const pa = voucherPreviews[a.id];
            const pb = voucherPreviews[b.id];
            const aIneligible = !pa || pa.ineligible;
            const bIneligible = !pb || pb.ineligible;
            if (aIneligible !== bIneligible) return aIneligible ? 1 : -1;
            if (aIneligible && bIneligible) return 0;
            return (pb.discountAmount || 0) - (pa.discountAmount || 0);
        });
        return arr;
    }, [userVouchers, voucherPreviews]);

    const bestVoucherId = useMemo(() => {
        let best = null;
        let bestAmount = 0;
        userVouchers.forEach((v) => {
            const p = voucherPreviews[v.id];
            if (p && !p.ineligible && p.discountAmount > bestAmount) {
                bestAmount = p.discountAmount;
                best = v.id;
            }
        });
        return best;
    }, [userVouchers, voucherPreviews]);

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
                                {cart?.map((el, index) => {
                                    const promotionBadgeLabel = getPromotionBadgeLabel(el);
                                    return (<tr className="border" key={el?.productId + "-" + index}>
                                    <td className="p-2 text-left">
                                        {el?.productName}
                                        {promotionBadgeLabel && (
                                            <div className="text-xs text-red-500">{promotionBadgeLabel}</div>
                                        )}
                                    </td>
                                    <td className="p-2 text-center">{el?.quantity}</td>
                                    <td className="p-2 text-right">
                                        {getDiscountPercent(el) !== null && (
                                            <div className="text-gray-400 line-through text-xs">
                                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(+el.price)}
                                            </div>
                                        )}
                                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(calculateLineTotal(el, el.quantity).total / el.quantity)}
                                    </td>
                                </tr>);
                                })}

                                {getGiftItems().length > 0 && (
                                    <tr className="border bg-orange-50 cursor-pointer" onClick={handleShowGiftDetail}>
                                        <td className="p-2 text-left font-medium text-orange-600" colSpan={3}>
                                            🎁 Giỏ hàng của bạn được tặng quà (Bấm để xem chi tiết)
                                        </td>
                                    </tr>
                                )}

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
                                {selectedVoucher ? (
                                    <div className="flex items-center justify-between border rounded-md px-4 py-2 bg-green-50">
                                        <div>
                                            <span className="font-medium text-blue-600">{selectedVoucher.code}</span>
                                            <span className="text-sm text-gray-600 ml-2">
                                                Giảm {selectedVoucher.type === "PERCENT"
                                                    ? `${selectedVoucher.discountValue}%`
                                                    : `${selectedVoucher.discountValue.toLocaleString()}đ`}
                                            </span>
                                            {selectedVoucher.categoryName && (
                                                <div className="text-xs text-orange-600">Chỉ áp dụng: {selectedVoucher.categoryName}</div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleClearVoucher}
                                            className="text-red-500 text-sm hover:underline"
                                        >
                                            Xoá
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualVoucherCode}
                                            onChange={(e) => setManualVoucherCode(e.target.value)}
                                            placeholder="Nhập mã giảm giá"
                                            className="w-full px-4 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleApplyManualCode}
                                            disabled={!manualVoucherCode.trim() || voucherLoading}
                                            className="bg-blue-500 hover:bg-blue-400 text-white px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                        >
                                            Áp dụng
                                        </button>
                                        <button
                                            type="button"
                                            onClick={openVoucherModal}
                                            className="bg-yellow-400 hover:bg-yellow-300 text-white px-2 w-[160px] rounded-md whitespace-nowrap"
                                        >
                                            Chọn voucher
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* px-4 py-2 rounded-md text-white bg-main text-semibold my-2 w-full justify-end */}
                            {<button className={ "px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-500 shadow-lg transition duration-300 w-full"} type="submit" name="paymentMethod" value="COD">Thanh toán khi nhận hàng</button>}
                            {<button className={"px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition duration-300 w-full"} type="submit" name="paymentMethod" value="VNPAY">Thanh toán bằng VNPAY</button>}
                        </form>
                    </div>
                </div>
            }

            {showVoucherModal && (
            <div
                className="fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-center items-center"
                onClick={() => setShowVoucherModal(false)}
            >
                <div
                    className="bg-white rounded-md w-[600px] max-h-[80vh] overflow-y-auto shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                >
                {/* Header */}
                <div className="border-b p-4">
                    <h2 className="text-xl font-semibold">Chọn mã giảm giá</h2>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    {voucherPreviewsLoading && Object.keys(voucherPreviews).length === 0 && (
                        <div className="text-center text-sm text-gray-500 py-4">Đang tính ưu đãi tốt nhất...</div>
                    )}
                    {sortedVouchers.map((voucher) => {
                    const isSelected = tempSelectedVoucher?.id === voucher.id;
                    const preview = voucherPreviews[voucher.id];
                    const notEligible = !preview || preview.ineligible;
                    const isBest = !notEligible && voucher.id === bestVoucherId;

                    return (
                        <div
                        key={voucher.id}
                        onClick={() => {
                            if (!notEligible) {
                            setTempSelectedVoucher(isSelected ? null : voucher);
                            }
                        }}
                        className={`relative flex border rounded-lg cursor-pointer transition hover:shadow-sm ${
                            isSelected ? "ring-2 ring-green-500" : ""
                        } ${isBest ? "ring-2 ring-orange-400" : ""} ${notEligible ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                        {isBest && (
                            <div className="absolute -top-2 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                                🏆 Tốt nhất
                            </div>
                        )}
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
                            {!notEligible && (
                            <div className="text-sm font-medium text-green-600">
                                Giảm dự kiến: {preview.discountAmount.toLocaleString()}đ
                            </div>
                            )}
                            <div className="text-sm text-gray-600">
                            Đơn tối thiểu: {voucher.minimumOrderAmount?.toLocaleString()}đ
                            </div>
                            <div className="text-sm text-gray-600">
                            Còn lại: {voucher.maxUsage != null ? (voucher.maxUsage - (voucher.usedCount || 0)).toLocaleString() : "Không giới hạn"}
                            </div>
                            {voucher.categoryName && (
                            <div className="text-sm text-orange-600">
                                Chỉ áp dụng: {voucher.categoryName}
                            </div>
                            )}
                            {notEligible && preview && (
                            <div className="text-sm text-red-500 font-medium">
                                {preview.reason}
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
                    disabled={voucherLoading}
                    onClick={async () => {
                        if (!tempSelectedVoucher) {
                            setSelectedVoucher(null);
                            setShowVoucherModal(false);
                            return;
                        }
                        // BE (POST vouchers/preview) là nguồn xác nhận cuối cùng — chỉ đóng modal
                        // khi validate thành công, giữ modal mở nếu bị từ chối để chọn voucher khác.
                        const ok = await previewAndApplyVoucher({ voucherId: tempSelectedVoucher.id });
                        if (ok) setShowVoucherModal(false);
                    }}
                    className={`px-4 py-2 rounded-md text-white ${
                        voucherLoading ? "bg-gray-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
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