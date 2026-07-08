import React from 'react';
import { Link } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import { QuantitySelector } from '@/components';
import { convertToSlug } from '@/utils/helper';
import product_default from '@/assets/product_default.png';
import icons from '@/utils/icons';
import { getPromotionBadgeLabel, getFreeGiftUnits } from '@/utils/promotion';

const { IoTrashBinOutline } = icons;

const CartItem = ({
  item,
  isSelected,
  onToggleSelect,
  onQuantityChange,
  onIncrease,
  onDecrease,
  onRemove,
  isCheckoutDisabled,
  loadingDeletes,
  pendingUpdates  // Thêm prop này để kiểm tra có đang update không
}) => {
  const isItemDeleting = loadingDeletes.has(item.id);
  // Chỉ khoá nút Xoá khi CHÍNH sản phẩm này đang có update số lượng dở dang (tránh xoá đè lên
  // 1 update đang debounce cho cùng dòng) — không khoá theo pendingUpdates của TOÀN bộ giỏ hàng,
  // trước đây gán nhầm nên bấm +/- 1 sản phẩm sẽ khoá luôn +/- của mọi sản phẩm khác trong 1.5s.
  const isRemoveDisabled = isItemDeleting || pendingUpdates.has(item.id);
  
  return (
    <div className='grid grid-cols-10 items-center border-b pb-4'>
      <div className={`ml-4 ${item?.stock <= 0 ? 'opacity-50' : ''}`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {
            if (item.stock > 0 && item.stock >= item.quantity + getFreeGiftUnits(item, item.quantity)) {
              onToggleSelect(item.id);
            }
          }}
          disabled={isItemDeleting}
        />
      </div>
      <Link
        to={`/products/${encodeURIComponent(item?.category)}/${item?.id}/${convertToSlug(item?.productName)}`}
        className={`col-span-6 flex items-center ${item?.stock <= 0 ? 'opacity-50' : ''}`}
      >
        <img
          src={
            item?.imageUrl
              ? item?.imageUrl.startsWith("https")
                ? item?.imageUrl
                : `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${item?.imageUrl}`
              : product_default
          }
          alt={item.productName}
          className="w-20 h-20 object-cover rounded-md mr-4"
        />
        <div className="flex flex-col">
          <h3 className="text-lg truncate hover:underline">{item.productName}</h3>
          {item.originalPrice && item.originalPrice > item.price ? (
            <p className="text-sm">
              <span className="text-main">{item.price.toLocaleString('vi-VN')} đ</span>{' '}
              <span className="text-gray-400 line-through text-xs">{item.originalPrice.toLocaleString('vi-VN')} đ</span>
            </p>
          ) : (
            <p className="text-sm text-gray-500">{item.price.toLocaleString('vi-VN')} đ</p>
          )}
          {getPromotionBadgeLabel(item) && (
            <p className="text-xs text-red-500">{getPromotionBadgeLabel(item)}</p>
          )}
          <p className="text-xs text-gray-500">Có sẵn: {item.stock}</p>
          {item.stock <= 0 && (
            <p className="text-red-500 text-xs">Sản phẩm tạm hết hàng</p>
          )}
          {(() => {
            const freeUnits = getFreeGiftUnits(item, item.quantity);
            const totalNeeded = item.quantity + freeUnits;
            if (item.stock <= 0 || item.stock >= totalNeeded) return null;
            return (
              <p className="text-red-500 text-xs">
                {freeUnits > 0
                  ? `Chỉ còn ${item.stock}, không đủ cho ${item.quantity} sản phẩm + ${freeUnits} tặng kèm`
                  : 'Số lượng tồn kho không đủ'}
              </p>
            );
          })()}
        </div>
      </Link>
      <div className={`${item?.stock <= 0 ? 'opacity-50' : ''} col-span-2 flex justify-center`}>
        <QuantitySelector
          quantity={item.quantity}
          stock={item.stock}
          onIncrease={item.stock > 0 && !isItemDeleting ? () => onIncrease(item.id) : null}
          onDecrease={item.stock > 0 && !isItemDeleting ? () => onDecrease(item.id) : null}
          onChange={item.stock > 0 && !isItemDeleting ? (newQuantity) => onQuantityChange(item.id, newQuantity) : null}
        />
      </div>
      <div className="col-span-1 flex justify-center">
        <button
          disabled={isRemoveDisabled}
          onClick={() => !isRemoveDisabled && onRemove(item.id)}
          className="w-8 h-8 flex items-center justify-center relative"
        >
          {isRemoveDisabled ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <ClipLoader size={20} color="#FF0000" loading={true} />
            </div>
          ) : (
            <IoTrashBinOutline 
              className={`transition-transform duration-200 hover:scale-110 ${item.stock <= 0 ? 'opacity-100' : ''}`} 
              color="red" 
              size={20} 
            />
          )}
        </button>
      </div>
    </div>
  );
};

export default CartItem;