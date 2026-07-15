import React, { useEffect, useMemo, useState } from 'react';
import { apiGetFlashSaleWindows } from '@/apis';
import icons from '@/utils/icons';

const { MdOutlineTimer } = icons;

const toMinutes = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

// 'ongoing' | 'upcoming' | 'ended' — parse lỗi (config sai định dạng) -> coi như 'ended' (ẩn tab đó
// thay vì crash UI, đúng nguyên tắc phòng vệ đã áp dụng ở PromotionService phía backend).
const getWindowStatus = (startStr, endStr, nowMinutes) => {
    const start = toMinutes(startStr);
    const end = toMinutes(endStr);
    if (start == null || end == null || Number.isNaN(start) || Number.isNaN(end)) return 'ended';
    if (nowMinutes < start) return 'upcoming';
    if (nowMinutes < end) return 'ongoing';
    return 'ended';
};

// Tab chọn khung giờ Flash Sale (nút bo góc, không phải underline) — dùng CHUNG giữa FlashSaleBanner
// (trang chủ) và trang xem đầy đủ /flash-sale, tránh lặp lại logic tính trạng thái "Đang diễn ra"/
// "Sắp diễn ra"/ẩn khung đã kết thúc. Tự gọi onSelectWindow(window|null) mỗi khi khung được chọn thay
// đổi (kể cả tự động do hết giờ) — CHỈ gọi SAU KHI đã fetch xong config (tránh báo "không có khung
// nào" giả ngay lúc mount trước khi kịp biết config thật).
const FlashSaleWindowTabs = ({ onSelectWindow, initialWindow }) => {
    const [windowsConfig, setWindowsConfig] = useState(null);
    const [now, setNow] = useState(() => new Date());
    // undefined = chưa xác định xong (đang chờ fetch config)
    const [selectedWindow, setSelectedWindow] = useState(initialWindow ?? undefined);

    useEffect(() => {
        (async () => {
            const res = await apiGetFlashSaleWindows();
            setWindowsConfig(res?.data || null);
        })();
    }, []);

    // Cập nhật mỗi phút — đủ nhạy để tự chuyển tab/ẩn tab khi qua mốc giờ mà không cần reload trang.
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const tabs = useMemo(() => {
        if (!windowsConfig) return [];
        const result = [];
        const status1 = getWindowStatus(windowsConfig.window1Start, windowsConfig.window1End, nowMinutes);
        if (status1 !== 'ended') {
            result.push({ window: 1, status: status1, start: windowsConfig.window1Start, end: windowsConfig.window1End });
        }
        const status2 = getWindowStatus(windowsConfig.window2Start, windowsConfig.window2End, nowMinutes);
        if (status2 !== 'ended') {
            result.push({ window: 2, status: status2, start: windowsConfig.window2Start, end: windowsConfig.window2End });
        }
        return result;
    }, [windowsConfig, nowMinutes]);

    // Tự chọn tab SAU KHI đã có windowsConfig: ưu tiên tab initialWindow/đang chọn nếu còn hợp lệ, rồi
    // tới "đang diễn ra"; tab đang chọn vừa bị ẩn (kết thúc) thì tự chuyển sang tab còn lại.
    useEffect(() => {
        if (!windowsConfig) return;
        if (tabs.length === 0) {
            setSelectedWindow(null);
            return;
        }
        const stillVisible = tabs.some((t) => t.window === selectedWindow);
        if (stillVisible) return;
        const ongoing = tabs.find((t) => t.status === 'ongoing');
        setSelectedWindow((ongoing || tabs[0]).window);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabs, windowsConfig]);

    useEffect(() => {
        if (selectedWindow === undefined) return; // chưa xác định xong, đừng báo cho parent vội
        onSelectWindow?.(selectedWindow);
    }, [selectedWindow, onSelectWindow]);

    if (tabs.length === 0) return null;

    return (
        <div className="flex gap-3">
            {tabs.map((t) => {
                const isOngoing = t.status === 'ongoing';
                const isSelected = selectedWindow === t.window;
                return (
                    <button
                        key={t.window}
                        onClick={() => setSelectedWindow(t.window)}
                        className={`flex-1 min-w-[130px] rounded-xl border-2 px-4 py-2 text-left transition-all ${
                            isSelected
                                ? isOngoing
                                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-red-50 shadow-sm'
                                    : 'border-gray-300 bg-gray-50'
                                : 'border-transparent bg-gray-50 hover:bg-gray-100'
                        }`}
                    >
                        <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                            <MdOutlineTimer className={isOngoing ? 'text-orange-500' : 'text-gray-400'} />
                            {t.start} - {t.end}
                        </div>
                        <div className={`text-xs font-semibold mt-0.5 ${isOngoing ? 'text-red-500' : 'text-gray-400'}`}>
                            {isOngoing ? '● Đang diễn ra' : 'Sắp diễn ra'}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default FlashSaleWindowTabs;
