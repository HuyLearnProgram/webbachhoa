import path from './path'
const AdminNavigationPath = [
    {
        id: 1,
        value: "Tổng quan",
        path: path.ADMIN_OVERVIEW
    },
    {
        id: 2,
        value: "Phân loại",
        path: path.ADMIN_CATEGORY
    },
    {
        id: 3,
        value: "Sản phẩm",
        path: path.ADMIN_PRODUCT
    },
    {
        id: 4,
        value: "Người sử dụng",
        path: path.ADMIN_USER
    },
    {
        id: 5,
        value: "Phản hồi",
        path: path.ADMIN_FEEDBACK
    },
    {
        id: 6,
        value: "Đơn đặt hàng",
        path: path.ADMIN_ORDER
    },
    {
        id: 7,
        value: "Gợi ý AI",
        path: path.ADMIN_RECOMMENDATION
    },
    {
        id: 8,
        value: "Mã giảm giá",
        path: path.ADMIN_VOUCHER
    },
    {
        id: 9,
        value: "Quy tắc trao voucher",
        path: path.ADMIN_VOUCHER_AUTO_GRANT_RULES
    },
    {
        id: 10,
        value: "Rút thăm may mắn",
        path: path.ADMIN_LUCKY_DRAW
    },
];
export default AdminNavigationPath;