import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ClipLoader } from 'react-spinners';
import { Pagination, RecentlyViewedItem } from '@/components';
import { apiGetRecentlyViewed } from '@/apis/recommendation';

const PAGE_SIZE = 12;

const RecentlyViewed = () => {
    const { current, isLoggedIn } = useSelector(state => state.user);
    const [data, setData] = useState(null);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRecentlyViewed = async (p) => {
        setIsLoading(true);
        try {
            const response = await apiGetRecentlyViewed(p, PAGE_SIZE);
            setData(response?.data);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách sản phẩm đã xem:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn && current) fetchRecentlyViewed(page);
    }, [isLoggedIn, page]);

    return (
        <div className='w-full relative px-4'>
            <header className="text-xl font-semibold py-4 mb-5">Sản phẩm đã xem</header>
            <div className="w-4/5 mx-auto py-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-[300px]">
                        <ClipLoader size={40} color="#10B981" loading={isLoading} />
                    </div>
                ) : data?.result?.length > 0 ? (
                    <div className="space-y-2">
                        {data.result.map(item => (
                            <RecentlyViewedItem key={item.id} item={item} />
                        ))}
                    </div>
                ) : (
                    <div className='flex flex-col justify-center items-center min-h-[70vh]'>
                        <p className="text-gray-500">Bạn chưa xem sản phẩm nào gần đây.</p>
                    </div>
                )}
            </div>
            {data?.meta?.pages > 1 && (
                <div className='w-4/5 m-auto my-4 flex justify-center'>
                    <Pagination
                        totalPage={data?.meta?.pages}
                        currentPage={page}
                        onPageChange={(p = 1) => setPage(p)}
                    />
                </div>
            )}
        </div>
    );
};

export default RecentlyViewed;
