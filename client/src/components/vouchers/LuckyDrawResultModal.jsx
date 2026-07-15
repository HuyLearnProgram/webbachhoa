import React from 'react';
import { useDispatch } from 'react-redux';
import { showModal } from '@/store/app/appSlice';

// Modal hiện kết quả quay thưởng may mắn sau đơn hàng (Phase 7 hệ trao voucher tự động) — dùng
// chung cơ chế Modal toàn app (Redux app slice isShowModal/modalChildren), không tự dựng modal riêng.
const LuckyDrawResultModal = ({ result }) => {
    const dispatch = useDispatch();
    const close = () => dispatch(showModal({ isShowModal: false, modalChildren: null }));

    return (
        <div
            className="bg-white rounded-lg p-8 w-[90%] md:w-[400px] text-center animate-scale-in-center"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="text-5xl mb-4">{result?.won ? '🎉' : '🍀'}</div>
            <h2 className="text-xl font-semibold mb-2">
                {result?.won ? 'Chúc mừng bạn đã trúng thưởng!' : 'Chúc bạn may mắn lần sau'}
            </h2>
            <p className="text-gray-600 mb-2">{result?.prizeLabel}</p>
            {result?.voucherCode && (
                <div className="border-2 border-dashed border-main rounded-lg p-3 my-3">
                    <span className="font-semibold text-main">{result.voucherCode}</span>
                    <p className="text-xs text-gray-500 mt-1">Voucher đã được thêm vào ví của bạn</p>
                </div>
            )}
            <button
                type="button"
                onClick={close}
                className="mt-4 bg-main text-white px-6 py-2 rounded-md"
            >
                Đóng
            </button>
        </div>
    );
};

export default LuckyDrawResultModal;
