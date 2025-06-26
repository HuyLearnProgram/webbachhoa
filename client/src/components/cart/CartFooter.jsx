import React from 'react';
import { ClipLoader } from 'react-spinners';

const CartFooter = ({
  hasMore,
  isLoading,
  onLoadMore,
  selectedTotal,
  isAllSelected,
  onToggleSelectAll,
  isCheckoutDisabled,
  onCheckout,
  pendingUpdates,
  loadingDeletes,
  currentCartLength,
  cartItemsLength
}) => {
  return (
    <div className="mt-4 space-y-4">
      {/* Load More Section */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="text-blue-600 hover:text-blue-800"
          >
            {isLoading ? 'Đang tải...' : 'Xem thêm'}
          </button>
        </div>
      )}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            className="cursor-pointer"
          />
          <span>Chọn tất cả</span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex flex-col items-end">
            <span className="text-sm text-gray-600">Tổng thanh toán:</span>
            <span className="text-xl font-semibold text-primary">
              {selectedTotal} đ
            </span>
          </div>

          <button
            onClick={onCheckout}
            disabled={isCheckoutDisabled}
            className={`px-6 py-2 rounded-lg  text-white ${
              isCheckoutDisabled 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-main'
            }`}
          >
            {pendingUpdates.size > 0 || loadingDeletes.size > 0 ? (
              <div className="flex items-center space-x-2">
                <ClipLoader size={16} color="#FFFFFF" />
                <span>Đang xử lý...</span>
              </div>
            ) : (
              'Thanh toán'
            )}
          </button>
        </div>
      </div>

      {currentCartLength !== cartItemsLength && (
        <div className="text-sm text-gray-500 text-center">
          * Một số sản phẩm có thể không hiển thị do đã hết hàng hoặc đã bị xóa
        </div>
      )}
    </div>
  );
};

export default CartFooter;