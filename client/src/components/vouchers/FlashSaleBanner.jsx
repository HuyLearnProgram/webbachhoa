import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGetFlashSaleProducts } from '@/apis';
import { ProductCard, FlashSaleWindowTabs } from '@/components';
import { mapFlashSaleProductForCard } from '@/utils/promotion';
import path from '@/utils/path';

const MAX_SHOWN = 8; // 4 sản phẩm/hàng x tối đa 2 hàng

// Danh sách sản phẩm Flash Sale trên trang chủ — chọn khung giờ qua FlashSaleWindowTabs (dùng chung
// với trang xem đầy đủ /flash-sale). Khung nào ĐÃ KẾT THÚC trong ngày tự ẩn hẳn khỏi tab, cả 2 khung
// kết thúc -> ẩn hẳn phần Flash Sale, hiện fallback.
const FlashSaleBanner = () => {
    // undefined = chưa xác định xong (đang chờ FlashSaleWindowTabs fetch config) — tránh chớp fallback
    // sai trước khi biết chắc có khung nào đang/sắp diễn ra hay không.
    const [selectedWindow, setSelectedWindow] = useState(undefined);
    const [products, setProducts] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (selectedWindow === undefined) return;
        if (selectedWindow === null) {
            setProducts([]);
            setLoaded(true);
            return;
        }
        setLoaded(false);
        (async () => {
            const res = await apiGetFlashSaleProducts(selectedWindow);
            setProducts(res?.data || []);
            setLoaded(true);
        })();
    }, [selectedWindow]);

    return (
        <div className="flex flex-col gap-4 min-h-[400px]">
            <h3 className="text-xl font-semibold text-main flex items-center gap-2">
                ⚡ Flash Sale
            </h3>

            <FlashSaleWindowTabs onSelectWindow={setSelectedWindow} />

            {products.length > 0 ? (
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {products.slice(0, MAX_SHOWN).map((p) => (
                            <ProductCard key={p.id} productData={mapFlashSaleProductForCard(p)} viewSource="HOME_FEED" />
                        ))}
                    </div>
                    <Link
                        to={`/${path.FLASH_SALE}?window=${selectedWindow}`}
                        className="self-center text-main font-medium hover:underline text-sm"
                    >
                        Xem tất cả Flash Sale →
                    </Link>
                </div>
            ) : loaded && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 border border-dashed rounded-lg py-10">
                    <span className="text-3xl">⏳</span>
                    <p>Hiện chưa có chương trình Flash Sale nào, ghé lại sau nhé!</p>
                    <Link to={`/${path.PRODUCTS_BASE}`} className="text-main font-medium hover:underline">
                        Xem tất cả sản phẩm
                    </Link>
                </div>
            )}
        </div>
    );
};

export default FlashSaleBanner;
