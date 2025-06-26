import React, { useEffect, useState, useRef } from 'react';
import { Pagination } from '@/components';
import { apiDeleteWishlist, apiGetWishlist } from '@/apis';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import {WishlistItem} from '@/components';

const PAGE_SIZE = 5;
const DELETE_DELAY = 750;

const Wishlist = () => {
    const { current, isLoggedIn } = useSelector(state => state.user);
    const [wishlist, setWishlist] = useState(null);
    const [pages, setPages] = useState(1);
    const [loadingDeletes, setLoadingDeletes] = useState(new Set());
    const debounceTimeouts = useRef({});

    const handlePagination = (page = 1) => {
        setPages(page);
        fetchWishlistItems(page);
    };

    const deleteProductInWishlist = async (pid) => {
        const res = await apiDeleteWishlist(pid);
        if (res.statusCode === 200) {
            toast.success("Đã xóa sản phẩm khỏi yêu thích");
        } else {
            toast.error("Có lỗi trong quá trình xóa");
        }
    };

    const fetchWishlistItems = async (page = 1) => {
        try {
            const response = await apiGetWishlist(page, PAGE_SIZE);
            setWishlist(response?.data);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu wishlist:', error);
        }
    };

    useEffect(() => {
        if (isLoggedIn && current) {
            fetchWishlistItems(pages);
        }
        return () => {
            Object.values(debounceTimeouts.current).forEach(timeout => clearTimeout(timeout));
        };
    }, [isLoggedIn, pages]);

    const removeItem = (pid) => {
        setLoadingDeletes(prev => new Set(prev).add(pid));
        debounceTimeouts.current[pid] = setTimeout(() => {
            setWishlist(prevWishlist => {
                if (!prevWishlist || !prevWishlist.result) return prevWishlist;
                const updatedResult = prevWishlist.result.filter(item => item.id !== pid);
                return { ...prevWishlist, result: updatedResult };
            });

            deleteProductInWishlist(pid).then(() => {
                setLoadingDeletes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(pid);
                    return newSet;
                });
            }).catch(error => {
                console.error("Lỗi khi xóa sản phẩm:", error);
                toast.error("Có lỗi xảy ra khi xóa sản phẩm");
            });
        }, DELETE_DELAY);
    };

    return (
        <div className='w-full relative px-4'>
            <header className="text-xl font-semibold py-4 mb-5">Wishlist</header>
            <div className="w-4/5 mx-auto py-8 flex flex-col gap-4">
                {wishlist?.result?.length > 0 ? (
                    <div className="space-y-2">
                        {wishlist?.result.map(item => (
                            <WishlistItem
                                key={item.id}
                                item={item}
                                loadingDeletes={loadingDeletes}
                                removeItem={removeItem}
                            />
                        ))}
                    </div>
                ) : (
                    <div className='flex flex-col justify-center items-center min-h-[70vh]'>
                        <p className="text-gray-500">Wishlist của bạn đang trống.</p>
                    </div>
                )}
            </div>
            {wishlist?.meta?.pages > 1 && (
                <div className='w-4/5 m-auto my-4 flex justify-center'>
                    <Pagination
                        totalPage={wishlist?.meta?.pages}
                        currentPage={pages}
                        onPageChange={handlePagination}
                    />
                </div>
            )}
        </div>
    );
};

export default Wishlist;
