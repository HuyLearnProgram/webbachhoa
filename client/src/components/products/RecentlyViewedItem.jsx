import React from 'react';
import { Link } from 'react-router-dom';
import product_default from '@/assets/product_default.png';
import { convertToSlug } from '@/utils/helper';

// Layout hàng ngang giống hệt WishlistItem.jsx — dùng cho trang "Sản phẩm đã xem" để đồng nhất
// format hiển thị với trang Wishlist (danh sách từ trên xuống thay vì lưới ProductCard).
const RecentlyViewedItem = ({ item }) => {
    return (
        <div className='flex items-center justify-between border-b pb-4'>
            <Link
                to={`/products/${encodeURIComponent(item.category)}/${item.id}/${convertToSlug(item.product_name)}`}
                className={`flex items-center flex-1 ${item.quantity <= 0 ? 'opacity-50' : ''}`}
            >
                <img
                    src={
                        item.imageUrl
                            ? (item.imageUrl.startsWith('https')
                                ? item.imageUrl
                                : `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${item.imageUrl}`)
                            : product_default
                    }
                    alt={item.product_name}
                    className="w-20 h-20 object-cover rounded-md mr-4"
                />
                <div className="flex flex-col">
                    <h3 className="truncate hover:underline">{item.product_name}</h3>
                    <p className="text-sm text-gray-500">{item.category}</p>
                </div>
            </Link>
            <div className='flex justify-center w-32'>
                <p className="text-sm text-gray-500">{item.price?.toLocaleString('vi-VN')} đ</p>
            </div>
        </div>
    );
};

export default RecentlyViewedItem;
