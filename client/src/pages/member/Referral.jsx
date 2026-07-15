import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { apiGetReferralStats } from '@/apis';

// Trang "Giới thiệu bạn bè" (Phase 6 hệ trao voucher tự động) — hiện mã/link chia sẻ của user +
// số liệu (bao nhiêu bạn đã đăng ký, bao nhiêu bạn đã có đơn PAID). Thưởng cho người giới thiệu
// được trao tự động sau khi bạn được giới thiệu PAID đơn đầu tiên (xem VoucherGrantService.onOrderPaid).
const Referral = () => {
    const [stats, setStats] = useState(null);

    const fetchStats = async () => {
        const response = await apiGetReferralStats();
        if (response?.data) setStats(response.data);
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const shareLink = stats?.referralCode
        ? `${window.location.origin}/login?ref=${stats.referralCode}`
        : '';

    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`Đã sao chép ${label}`, { autoClose: 1500 });
    };

    return (
        <div className="w-full relative px-4">
            <header className="text-xl font-semibold py-4 border-b border-b-blue-200">
                Giới thiệu bạn bè
            </header>

            <div className="w-3/5 mx-auto py-8 flex flex-col gap-6">
                <p className="text-gray-600">
                    Chia sẻ mã hoặc link dưới đây cho bạn bè. Khi bạn của bạn đăng ký bằng mã này và hoàn
                    tất đơn hàng đầu tiên, bạn sẽ tự động nhận được voucher cảm ơn.
                </p>

                <div className="flex items-center gap-2">
                    <span className="font-medium">Mã giới thiệu:</span>
                    <span className="text-main font-semibold text-lg">{stats?.referralCode || '...'}</span>
                    {stats?.referralCode && (
                        <button
                            type="button"
                            className="text-sm bg-main text-white px-3 py-1 rounded-md"
                            onClick={() => handleCopy(stats.referralCode, 'mã giới thiệu')}
                        >
                            Sao chép mã
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="font-medium">Link chia sẻ:</span>
                    <span className="text-gray-500 truncate max-w-[250px]">{shareLink}</span>
                    {shareLink && (
                        <button
                            type="button"
                            className="text-sm bg-main text-white px-3 py-1 rounded-md"
                            onClick={() => handleCopy(shareLink, 'link chia sẻ')}
                        >
                            Sao chép link
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="border rounded-lg p-4 text-center">
                        <div className="text-2xl font-semibold text-main">{stats?.referredCount ?? 0}</div>
                        <div className="text-gray-500 text-sm">Bạn đã giới thiệu</div>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                        <div className="text-2xl font-semibold text-main">{stats?.convertedCount ?? 0}</div>
                        <div className="text-gray-500 text-sm">Đã hoàn tất đơn đầu tiên</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Referral;
