import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import  {CartItem, CartFooter, EmptyCart, GiftDetailModal} from '@/components';
import { apiGetCart, apiAddOrUpdateCart, apiDeleteCart } from '@/apis';
import { getCurrentUser } from '@/store/user/asyncActions';
import { showModal } from '@/store/app/appSlice';
import withBaseComponent from '@/hocs/withBaseComponent';
import path from '@/utils/path';
import { calculateLineTotal, getFreeGiftUnits } from '@/utils/promotion';

const DEBOUNCE_DELAY = 1500;
const DELETE_DELAY = 500;
const ITEMS_PER_PAGE = 10;

const Cart = ({ dispatch }) => {
  const { current, isLoggedIn } = useSelector(state => state.user)
  const navigate = useNavigate();

  // States
  const [cartItems, setCartItems] = useState([]);
  const [isCheckoutDisabled, setIsCheckoutDisabled] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState(new Set());
  const [loadingDeletes, setLoadingDeletes] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [allSelectedItems, setAllSelectedItems] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const debounceTimeouts = useRef({});
  const pendingChanges = useRef({});

  // API Functions
  const deleteProductInCart = async (pid) => {
    const res = await apiDeleteCart(pid);
    if (res.statusCode === 200) {
      toast.success("Đã xóa sản phẩm");
      dispatch(getCurrentUser())
    } else {
      toast.error("Có lỗi trong quá trình xóa");
    }
  };

  const fetchCartItems = async (pageToFetch = 1, pageSize = ITEMS_PER_PAGE) => {
    setIsLoading(true);
    try {
      const response = await apiGetCart(pageToFetch, pageSize);
      const products = response.data.result;

      setCartItems((prevItems) => {
        const updatedItems = pageToFetch === 1 ? products : [...prevItems, ...products];
        return updatedItems;
      });

      setHasMore(products.length === pageSize);
      setPage(pageToFetch);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu giỏ hàng:', error);
      toast.error("Có lỗi khi tải dữ liệu giỏ hàng");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler Functions
  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchCartItems(page + 1);
    }
  };

  const toggleSelectItem = (pid) => {
    setSelectedItems((prevSelectedItems) => {
      const newSet = new Set(prevSelectedItems);
      if (newSet.has(pid)) {
        newSet.delete(pid);
      } else {
        newSet.add(pid);
      }
      return newSet;
    });

    setAllSelectedItems((prevSelected) => {
      const existingItem = prevSelected.find(item => item.id === pid);
      if (existingItem) {
        return prevSelected.filter(item => item.id !== pid);
      } else {
        const newItem = cartItems.find(item => item.id === pid);
        return [...prevSelected, newItem];
      }
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems(new Set());
      setAllSelectedItems([]);
    } else {
      const newSelectedItems = new Set(
        cartItems
          .filter(item => (item.stock > 0 && item.stock >= item.quantity))
          .map(item => item.id)
      );
      setSelectedItems(newSelectedItems);
      setAllSelectedItems(cartItems.filter(item => item.stock > 0 && item.stock >= item.quantity));
    }
    setIsAllSelected(!isAllSelected);
  };

  const handleQuantityChange = (pid, newQuantity) => {
    const currentItem = cartItems.find(item => item.id === pid);
    if (!currentItem) return;

    const validatedQuantity =
      newQuantity === '' || isNaN(newQuantity) || newQuantity < 1 
        ? 1 
        : Math.min(newQuantity, currentItem.stock);
    
    const quantityDifference = validatedQuantity - currentItem.quantity;
    if (quantityDifference === 0) return;

    // Add to pending updates
    setPendingUpdates(prev => new Set(prev).add(pid));

    // Update cart items
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === pid ? { ...item, quantity: validatedQuantity } : item
      )
    );

    // Track pending changes
    const currentPendingChange = pendingChanges.current[pid] || 0;
    pendingChanges.current[pid] = currentPendingChange + quantityDifference;

    // Clear existing timeout
    if (debounceTimeouts.current[pid]) {
      clearTimeout(debounceTimeouts.current[pid]);
    }

    // Set new timeout for API call
    debounceTimeouts.current[pid] = setTimeout(async () => {
      try {
        const finalChange = pendingChanges.current[pid];
        if (finalChange !== undefined) {
          const rs = await apiAddOrUpdateCart(pid, finalChange);
          if (rs.statusCode === 201) {
            toast.success(`Đã cập nhật số lượng mới: ${rs.data.quantity}`);
          } else {
            toast.error("Có lỗi xảy ra");
          }
          delete pendingChanges.current[pid];

          setPendingUpdates(prev => {
            const newSet = new Set(prev);
            newSet.delete(pid);
            return newSet;
          });
        }
      } catch (error) {
        console.error('Lỗi khi cập nhật giỏ hàng:', error);
        toast.error("Có lỗi khi cập nhật số lượng");
      }
    }, DEBOUNCE_DELAY);
  };

  const increaseQuantity = (pid) => {
    const item = cartItems.find((item) => item.id === pid);
    if (item && item.quantity < item.stock) {
      handleQuantityChange(pid, item.quantity + 1);
    }
  };

  const decreaseQuantity = (pid) => {
    const item = cartItems.find((item) => item.id === pid);
    if (item && item.quantity > 1) {
      handleQuantityChange(pid, item.quantity - 1);
    }
  };

  const removeItem = (pid) => {
    // Kiểm tra nếu có bất kỳ cập nhật nào đang pending
    if (pendingUpdates.size > 0) return;
    
    setLoadingDeletes(prev => new Set(prev).add(pid));
    setTimeout(() => {
      deleteProductInCart(pid);
      setCartItems((prevItems) => prevItems.filter((item) => item.id !== pid));
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(pid);
        return newSet;
      });
      setLoadingDeletes(prev => {
        const newSet = new Set(prev);
        newSet.delete(pid);
        return newSet;
      });
    }, DELETE_DELAY);
  };
  

  const calculateSelectedTotal = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id))
      .reduce((total, item) => total + calculateLineTotal(item, item.quantity).total, 0)
      .toLocaleString('vi-VN');
  };

  const getGiftItems = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id))
      .map(item => ({ item, freeUnits: getFreeGiftUnits(item, item.quantity) }))
      .filter(({ freeUnits }) => freeUnits > 0);
  };

  const handleShowGiftDetail = () => {
    const gifts = getGiftItems();
    if (gifts.length === 0) return;
    dispatch(showModal({
      isShowModal: true,
      modalChildren: (
        <GiftDetailModal
          gifts={gifts}
          onClose={() => dispatch(showModal({ isShowModal: false, modalChildren: null }))}
        />
      )
    }));
  };

  const handleCheckout = () => {
    if (!isCheckoutDisabled && selectedItems.size > 0) {
      navigate(`/${path.CHECKOUT}`, { 
        state: { 
          selectedItems: Array.from(selectedItems)
        } 
      });
    }
  };

  // Effects
  useEffect(() => {
    if (isLoggedIn && current) {
      fetchCartItems(1, ITEMS_PER_PAGE);
    }

    return () => {
      // Cleanup pending timeouts
      Object.values(debounceTimeouts.current).forEach(timeout => clearTimeout(timeout));
      // Process any pending changes
      Object.entries(pendingChanges.current).forEach(([pid, change]) => {
        if (change !== undefined) {
          apiAddOrUpdateCart(pid, change);
        }
      });
    };
  }, [isLoggedIn, current]);

  useEffect(() => {
    const isAnyQuantityInvalid = cartItems.some(
      (item) => {
        // Kiểm tra sản phẩm được chọn
        if (!selectedItems.has(item.id)) return false;
        
        return (
          item.quantity < 1 || 
          isNaN(item.quantity) ||
          item.quantity > item.stock ||
          item.stock <= 0
        );
      }
    );
  
    // Chỉ vô hiệu hóa nút khi:
    // 1. Có cập nhật đang pending
    // 2. Có xóa đang pending
    // 3. Không có sản phẩm nào được chọn
    // 4. Có sản phẩm được chọn nhưng số lượng không hợp lệ
    setIsCheckoutDisabled(
      pendingUpdates.size > 0 || 
      loadingDeletes.size > 0 ||
      selectedItems.size === 0 ||
      isAnyQuantityInvalid
    );
  }, [cartItems, pendingUpdates, loadingDeletes, selectedItems]);

  useEffect(() => {
    const validItems = cartItems.filter(item => (
      item.stock > 0 && item.stock >= item.quantity
    ));
    setIsAllSelected(
      selectedItems.size === validItems.length && 
      cartItems.length > 0 && 
      selectedItems.size !== 0
    );
  }, [selectedItems, cartItems]);

  return (
    <div className="w-main mt-10 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Giỏ hàng</h2>
      
      {cartItems?.length > 0 ? (
        <div className="space-y-4">
          {cartItems.map((item) => (
            <CartItem
            key={item.id}
            item={item}
            isSelected={selectedItems.has(item.id)}
            onToggleSelect={toggleSelectItem}
            onQuantityChange={handleQuantityChange}
            onIncrease={increaseQuantity}
            onDecrease={decreaseQuantity}
            onRemove={removeItem}
            isCheckoutDisabled={isCheckoutDisabled}
            loadingDeletes={loadingDeletes}
            pendingUpdates={pendingUpdates}
          />
          ))}

          {getGiftItems().length > 0 && (
            <div
              className="border border-dashed border-orange-300 bg-orange-50 rounded-lg p-3 cursor-pointer"
              onClick={handleShowGiftDetail}
            >
              <span className="font-semibold text-orange-600">🎁 Giỏ hàng của bạn được tặng quà</span>
              <span className="text-sm text-gray-500 ml-2">(Bấm để xem chi tiết)</span>
            </div>
          )}

          <CartFooter
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={loadMore}
            selectedTotal={calculateSelectedTotal()}
            isAllSelected={isAllSelected}
            onToggleSelectAll={toggleSelectAll}
            isCheckoutDisabled={isCheckoutDisabled}
            onCheckout={handleCheckout}
            pendingUpdates={pendingUpdates}
            loadingDeletes={loadingDeletes}
            currentCartLength={current?.cartLength}
            cartItemsLength={cartItems.length}
          />
        </div>
      ) : (
        <EmptyCart />
      )}
    </div>
  );
};

export default withBaseComponent(Cart);