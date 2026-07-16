import React, { useEffect, useState } from "react";
import { CustomSelect, Pagination,Button, OrderCard } from "@/components";
import { useForm } from "react-hook-form";
import { apiGetOrders } from "@/apis";
import { useDispatch, useSelector } from "react-redux";
import product_default from '@/assets/product_default.png';
import { createSearchParams, useNavigate, useSearchParams } from "react-router-dom";
import { statusOrder } from "@/utils/constants";
import withBaseComponent from "@/hocs/withBaseComponent"
import { showModal } from "@/store/app/appSlice";
import { convertToSlug, resolveImageUrl } from "@/utils/helper";
import { getOrderLinePromotionLabel, hasOrderLineDiscount } from "@/utils/promotion";
import icons from "@/utils/icons";

const { FaEye } = icons;


const History = ({ navigate, location }) => {
    const { current,isLoggedIn } = useSelector(state => state.user)
    const { handleSubmit, register, formState: { errors }, watch, setValue } = useForm()
    const [paginate, setPaginate] = useState(null)
    const [ordersPage, setOrdersPage] = useState()
    const [currentPage, setCurrentPage] = useState(1)
    const [paramPage, SetParamPage] = useState()
    const [params] = useSearchParams()
    const dispatch = useDispatch()
    const status = watch("status")

    const navigateProduct = useNavigate()
    const fectOrders = async (page, status = {}) => {
        let response;
        if (status?.status === "default" || status?.status === undefined) {
            response = await apiGetOrders({ page });
            setPaginate(response.data?.meta);
            setCurrentPage(page);
        } else if (!isNaN(+status?.status)) {
            response = await apiGetOrders({ page, status: status?.status });
            setPaginate(response.data?.meta);
            setCurrentPage(page);
        }
        setOrdersPage(response?.data?.result)
    }
    useEffect(() => {
        if (current) {
            fectOrders(currentPage, paramPage)
        }
    }, [current, currentPage])

    useEffect(() => {
        const pr = Object.fromEntries([...params])
        SetParamPage(pr)
        fectOrders(1, pr)
    }, [params])

    const handleChangeStatusValue = ({ value }) => {
        const currentParams = Object.fromEntries(params.entries());
        navigate({
            pathname: location.pathname,
            search: createSearchParams({
                ...currentParams,
                status: value
            }).toString()
        })
    }
    const handleViewDetail = (oid,pid)=>{
        // MemberLayout đã redirect /login khi !isLoggedIn nên trang này không thể mount ở trạng thái
        // chưa đăng nhập — không cần nhánh dự phòng riêng (trước đây gọi Modal/path chưa import, dead code).
        const order = ordersPage.filter(order => order?.orderId === oid);
        dispatch(showModal({
            isShowModal: true,
            modalChildren: <OrderCard data={order} onClose={() => dispatch(showModal({ isShowModal: false }))} updateOrderStatus={updateOrderStatus}/>
        }));
    }
    // Đơn cũ tạo trước khi có snapshot khuyến mãi có lineTotal = 0 (giá trị DEFAULT của cột mới thêm),
    // không phải null/undefined nên "??" không fallback được -> coi luôn giá trị falsy (0) là "chưa có snapshot".
    const getLineTotal = (item) => item.lineTotal || item.unit_price * item.quantity;
    const updateOrderStatus = (orderId, newStatus) => {
        // Tìm đơn hàng cần cập nhật
        const updatedOrders = ordersPage.map(order => 
            order.orderId === orderId ? { ...order, status: newStatus } : order
        );
        // Cập nhật lại state với dữ liệu mới
        setOrdersPage(updatedOrders);
    }
    return (
        <div className="w-full relative px-4 flex flex-col gap-6">
            <header className="text-3xl font-semibold py-4 border-b border-b-blue-200">
                Lịch sử mua hàng
            </header>
            <div className="flex justify-end items-center px-4">
                <form className="w-[45%] grid grid-cols-4 gap-4">
                    <div className="col-span-3 flex items-center justify-end">
                        <span>Lọc theo trạng thái:</span>
                    </div>
                    <div className="col-span-1 flex items-start">
                        <CustomSelect
                            options={statusOrder}
                            value={status}
                            onChange={(val) => handleChangeStatusValue(val)}
                            wrapClassName="w-full"
                        />
                    </div>
                </form>
            </div>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table-auto w-full border-collapse border border-gray-300 rounded-lg shadow-md">

                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Xem chi tiết</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian đặt hàng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {ordersPage?.map((order, index) => (
                                <tr
                                    key={`${order.orderId}-${order.productId}`}
                                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors duration-200`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center cursor-pointer"
                                            onClick={e => navigate(`/products/${encodeURIComponent(order?.category)}/${order?.productId}/${convertToSlug(order?.productName)}`)}
                                            onMouseEnter={(e) => {
                                                e.stopPropagation();
                                            }}
                                            onMouseLeave={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img
                                                    className="h-10 w-10 rounded-full object-cover"
                                                    src={resolveImageUrl(order?.imageUrl, "product", product_default)}
                                                    alt={order.productName}
                                                />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{order.productName}</div>
                                                {getOrderLinePromotionLabel(order) && (
                                                    <div className="text-xs text-red-500 font-medium">
                                                        {getOrderLinePromotionLabel(order)}
                                                    </div>
                                                )}
                                                {order?.voucherCode && (
                                                    <div className="text-xs text-green-600 font-medium">
                                                        Đã dùng mã: {order.voucherCode}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{order.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                                        {hasOrderLineDiscount(order) && (
                                            <div className="text-xs text-gray-400 line-through font-normal">
                                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(+order.originalPrice)}
                                            </div>
                                        )}
                                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(+order.unit_price)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                                            +getLineTotal(order)
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    order.status === 0 ? "bg-green-100 text-green-700"
                                                    : order.status === 1 ? "bg-green-200 text-green-800"
                                                    : order.status === 2 ? "bg-green-300 text-green-900"
                                                    : order.status === 4 ? "bg-blue-100 text-blue-800"
                                                    : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {order.status === 0 ? "Pending" : order.status === 1 ? "In delivery" : order.status === 2 ? "Succeed" : order.status === 4 ? "Returned" : "Cancelled"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="relative group">
                                            <Button 
                                            handleOnClick={() => handleViewDetail(order?.orderId,order?.productId)}
                                            style="text-blue-500 hover:text-blue-700 focus:outline-n "
                                            >
                                                <FaEye size={20} color="green"/>
                                            </Button>
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                View Detail
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                        {new Date(order.orderTime).toLocaleString("vi-VN")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                </div>
            </div>
            {paginate?.pages > 1 && <div>
                <Pagination totalPage={paginate?.pages} currentPage={paginate?.page}
                    pageSize={paginate?.pageSize} totalProduct={paginate?.total} onPageChange={(page) => setCurrentPage(page)} />
            </div>}
        </div>
    )
}

export default withBaseComponent(History)
