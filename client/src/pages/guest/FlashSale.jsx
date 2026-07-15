import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ProductCard, FlashSaleWindowTabs } from '@/components';
import { apiGetFlashSaleProducts } from '@/apis';
import { mapFlashSaleProductForCard } from '@/utils/promotion';
import path from '@/utils/path';

// Trang xem đầy đủ Flash Sale — vào từ nút "Xem tất cả Flash Sale" ở FlashSaleBanner (giữ nguyên khung
// giờ đang xem qua query param ?window=). Tab chọn khung giờ dùng chung FlashSaleWindowTabs với trang
// chủ (đẹp hơn 2 nút "Khung 1"/"Khung 2" cũ, hiện đúng giờ + trạng thái "Đang diễn ra"/"Sắp diễn ra").
// Không phân trang (số sản phẩm Flash Sale tại 1 thời điểm bị giới hạn tự nhiên bởi số lượng admin
// gắn cờ, không cần thiết kế phân trang phức tạp như trang tìm kiếm).
const FlashSale = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialWindow = Number(searchParams.get('window')) === 2 ? 2 : 1;
    const [selectedWindow, setSelectedWindow] = useState(undefined);
    const [products, setProducts] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const handleSelectWindow = (w) => {
        setSelectedWindow(w);
        if (w) setSearchParams({ window: String(w) });
    };

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
        <div className="w-main mx-auto px-4 py-8 min-h-screen">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-main flex items-center gap-2">⚡ Flash Sale</h1>
                <FlashSaleWindowTabs onSelectWindow={handleSelectWindow} initialWindow={initialWindow} />
            </div>

            {products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {products.map((p) => (
                        <ProductCard key={p.id} productData={mapFlashSaleProductForCard(p)} viewSource="HOME_FEED" />
                    ))}
                </div>
            ) : loaded && (
                <div className="flex flex-col items-center justify-center gap-2 text-gray-400 border border-dashed rounded-lg py-16">
                    <span className="text-3xl">⏳</span>
                    <p>Không có sản phẩm nào trong khung giờ này.</p>
                    <Link to={`/${path.PRODUCTS_BASE}`} className="text-main font-medium hover:underline">
                        Xem tất cả sản phẩm
                    </Link>
                </div>
            )}
        </div>
    );
};

export default FlashSale;
