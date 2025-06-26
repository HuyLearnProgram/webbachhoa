import React from 'react';
import { Link } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import icons from '@/utils/icons';
import product_default from '@/assets/product_default.png';
import { convertToSlug } from '@/utils/helper';
import PropTypes from 'prop-types';

const { IoTrashBinOutline } = icons
const WishlistItem = ({ item, loadingDeletes, removeItem }) => {
    return (
        <div key={item.id} className='flex items-center justify-between border-b pb-4'>
            <Link
                to={`/products/${encodeURIComponent(item.category)}/${item.id}/${convertToSlug(item.productName)}`}
                className={`flex items-center flex-1 ${item.stock <= 0 ? 'opacity-50' : ''}`}
            >
                <img
                    src={item.imageUrl || product_default}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded-md mr-4"
                />
                <div className="flex flex-col">
                    <h3 className="truncate hover:underline">{item.productName}</h3>
                    <p className="text-sm text-gray-500">{item.category}</p>
                </div>
            </Link>
            <div className='flex justify-center w-32'>
                <p className="text-sm text-gray-500">{item.price.toLocaleString('vi-VN')} đ</p>
            </div>
            <div className="flex justify-center w-20" title='Xóa sản phẩm'>
                <button
                    disabled={loadingDeletes.has(item.id)}
                    onClick={() => removeItem(item.id)}
                    className={`transition-transform duration-200 hover:cursor-pointer hover:scale-110 ${loadingDeletes.has(item.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loadingDeletes.has(item.id) ? (
                        <ClipLoader size={20} color="#FF0000" />
                    ) : (
                        <IoTrashBinOutline color="red" size={20} />
                    )}
                </button>
            </div>
        </div>
    );
};

WishlistItem.propTypes = {
    item: PropTypes.object.isRequired,
    loadingDeletes: PropTypes.instanceOf(Set).isRequired,
    removeItem: PropTypes.func.isRequired,
};

export default WishlistItem;
