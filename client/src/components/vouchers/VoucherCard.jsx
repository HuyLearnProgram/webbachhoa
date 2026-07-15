import React from 'react';

// Card hiển thị 1 voucher — dùng cho trang "Ví voucher" (member). Tách riêng để không phải lặp lại
// UI khi cần hiển thị voucher ở nhiều nơi; modal chọn voucher trong Checkout.jsx giữ nguyên UI riêng
// (Selenium TC06 phụ thuộc chặt vào cấu trúc/class hiện có ở đó, không đụng vào).
const VoucherCard = ({ voucher, actionLabel, onAction, actionDisabled }) => {
    const usedUp = voucher.maxUsage != null && (voucher.usedCount || 0) >= voucher.maxUsage;

    return (
        <div className="flex border rounded-lg overflow-hidden">
            <div className="bg-cyan-400 text-white flex items-center justify-center px-4 min-w-[100px] text-sm font-bold uppercase">
                {voucher.type === 'PERCENT' ? 'SALE' : 'GIẢM'}
            </div>
            <div className="flex-1 p-3 space-y-1">
                <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-600">{voucher.code}</span>
                    {voucher.isUsed && <span className="text-xs text-gray-400">Đã dùng</span>}
                </div>
                <div className="text-sm">
                    Giảm:{' '}
                    <span className="font-medium">
                        {voucher.type === 'PERCENT' ? `${voucher.discountValue}%` : `${voucher.discountValue?.toLocaleString()}đ`}
                    </span>
                    {voucher.type === 'PERCENT' && voucher.maxDiscountAmount && (
                        <span className="text-gray-500"> (tối đa {voucher.maxDiscountAmount.toLocaleString()}đ)</span>
                    )}
                </div>
                {voucher.minimumOrderAmount > 0 && (
                    <div className="text-sm text-gray-600">Đơn tối thiểu: {voucher.minimumOrderAmount.toLocaleString()}đ</div>
                )}
                {voucher.categoryName && (
                    <div className="text-sm text-orange-600">Chỉ áp dụng: {voucher.categoryName}</div>
                )}
                <div className="text-sm text-gray-600">
                    Còn lại: {voucher.maxUsage != null ? Math.max(0, voucher.maxUsage - (voucher.usedCount || 0)).toLocaleString() : 'Không giới hạn'}
                </div>
                {voucher.endDate && (
                    <div className="text-xs text-gray-500">HSD: {new Date(voucher.endDate).toLocaleDateString('vi-VN')}</div>
                )}
                {usedUp && <div className="text-xs text-red-500 font-medium">Đã dùng hết lượt</div>}
                {onAction && (
                    <button
                        type="button"
                        onClick={onAction}
                        disabled={actionDisabled}
                        className="mt-2 text-sm bg-main text-white px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

export default VoucherCard;
