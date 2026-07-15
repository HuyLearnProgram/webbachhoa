import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { Pagination, VoucherCard } from '@/components';
import { apiGetMyVouchers, apiGetActiveVouchers, apiAssignVoucher, apiGetMyVoucherSavings } from '@/apis';

const PAGE_SIZE = 6;

const MyVoucher = () => {
    const { current, isLoggedIn } = useSelector(state => state.user);
    const [tab, setTab] = useState('MINE'); // MINE | AVAILABLE
    const [myVouchers, setMyVouchers] = useState(null);
    const [page, setPage] = useState(1);
    const [availableVouchers, setAvailableVouchers] = useState([]);
    const [assigningId, setAssigningId] = useState(null);
    const [totalSavings, setTotalSavings] = useState(0);

    const fetchMyVouchers = async (p = 1) => {
        try {
            const res = await apiGetMyVouchers({ page: p, size: PAGE_SIZE });
            setMyVouchers(res?.data);
        } catch (err) {
            console.error('Lỗi khi lấy voucher của tôi:', err);
        }
    };

    const fetchMySavings = async () => {
        try {
            const res = await apiGetMyVoucherSavings();
            setTotalSavings(res?.data || 0);
        } catch (err) {
            console.error('Lỗi khi lấy tổng tiết kiệm voucher:', err);
        }
    };

    const fetchAvailableVouchers = async () => {
        try {
            const res = await apiGetActiveVouchers();
            setAvailableVouchers(res?.data || []);
        } catch (err) {
            console.error('Lỗi khi lấy voucher công khai:', err);
        }
    };

    useEffect(() => {
        if (isLoggedIn && current) {
            fetchMyVouchers(page);
            fetchMySavings();
        }
    }, [isLoggedIn, page]);

    useEffect(() => {
        if (isLoggedIn && current && tab === 'AVAILABLE') {
            fetchAvailableVouchers();
        }
    }, [isLoggedIn, current, tab]);

    const handleAssign = async (voucherId) => {
        setAssigningId(voucherId);
        try {
            const res = await apiAssignVoucher(voucherId);
            if (res?.statusCode === 201) {
                toast.success('Đã lưu voucher vào ví của bạn!');
                fetchAvailableVouchers();
                fetchMyVouchers(page);
            } else {
                toast.error(res?.message || 'Không thể lưu voucher này');
            }
        } catch (err) {
            toast.error('Có lỗi xảy ra khi lưu voucher');
        } finally {
            setAssigningId(null);
        }
    };

    // Voucher đã có trong ví thì không cần hiện lại ở tab "Có thể lưu"
    const myVoucherIds = new Set((myVouchers?.result || []).map(v => v.id));
    const assignableVouchers = availableVouchers.filter(v => !myVoucherIds.has(v.id));

    return (
        <div className="w-full relative px-4">
            <header className="text-xl font-semibold py-4 mb-5">Ví voucher</header>

            {totalSavings > 0 && (
                <div className="w-4/5 mx-auto mb-4 bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-3 text-sm font-medium">
                    💰 Bạn đã tiết kiệm {totalSavings.toLocaleString('vi-VN')}đ nhờ dùng voucher
                </div>
            )}

            <div className="w-4/5 mx-auto flex gap-2 mb-6">
                <button
                    onClick={() => setTab('MINE')}
                    className={`px-4 py-2 rounded-md ${tab === 'MINE' ? 'bg-main text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                    Voucher của tôi
                </button>
                <button
                    onClick={() => setTab('AVAILABLE')}
                    className={`px-4 py-2 rounded-md ${tab === 'AVAILABLE' ? 'bg-main text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                    Voucher có thể lưu
                </button>
            </div>

            {tab === 'MINE' ? (
                <div className="w-4/5 mx-auto py-4">
                    {myVouchers?.result?.length > 0 ? (
                        <div className="space-y-3">
                            {myVouchers.result.map(v => (
                                <VoucherCard key={v.id} voucher={v} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center items-center min-h-[40vh]">
                            <p className="text-gray-500">Bạn chưa có voucher nào. Chuyển qua tab "Voucher có thể lưu" để nhận thêm.</p>
                        </div>
                    )}
                    {myVouchers?.meta?.pages > 1 && (
                        <div className="flex justify-center my-4">
                            <Pagination
                                totalPage={myVouchers.meta.pages}
                                currentPage={page}
                                onPageChange={(p = 1) => setPage(p)}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-4/5 mx-auto py-4">
                    {assignableVouchers.length > 0 ? (
                        <div className="space-y-3">
                            {assignableVouchers.map(v => (
                                <VoucherCard
                                    key={v.id}
                                    voucher={v}
                                    actionLabel="Lưu vào ví"
                                    actionDisabled={assigningId === v.id}
                                    onAction={() => handleAssign(v.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center items-center min-h-[40vh]">
                            <p className="text-gray-500">Không có voucher công khai nào để lưu thêm lúc này.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyVoucher;
