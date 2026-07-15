import React, { useState } from "react";
import { formatMoney, renderStarFromNumber, convertToSlug } from "@/utils/helper";
import { SelectOption } from "..";
import icons from "@/utils/icons";
import withBaseComponent from "@/hocs/withBaseComponent";
import product_default from '@/assets/product_default.png';
import { showModal } from "@/store/app/appSlice";
import ProductDetail from "@/pages/guest/ProductDetail";
import { apiAddOrUpdateCart, apiAddWishList } from "@/apis";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import path from "@/utils/path";
import { getCurrentUser } from "@/store/user/asyncActions";
import { getPromotionBadgeLabel, getDiscountPercent, getEffectivePrice } from "@/utils/promotion";
import { setViewSourceHandoff } from "@/utils/viewSourceHandoff";

const { FaCartShopping, FaHeart, FaEye } = icons;

// emphasisTier: điểm neo thị giác tinh tế cho rail gợi ý (nghiên cứu Gutenberg diagram + serial
// position effect + hiện tượng "row skipping" trên lưới ảnh) — 'primary' cho ô đầu tiên (sản phẩm
// điểm cao nhất), 'secondary' cho ô đầu hàng 2 và ô cuối cùng (chống bỏ hàng, tăng ghi nhớ điểm kết).
// Không dùng badge/màu loè loẹt — chỉ scale/viền nhẹ để không "cướp" hết chú ý khỏi các sản phẩm khác.
const ProductCard = ({ productData, navigate, dispatch, viewSource, referrerProductId, onBeforeNavigate, emphasisTier }) => {
  const [showOption, setShowOption] = useState(false);
  const { isLoggedIn } = useSelector(state => state.user)

  const handleLoginCheck = async () => {
    if (!isLoggedIn) {
      const result = await Swal.fire({
        text: "Vui lòng đăng nhập",
        confirmButtonText: "Đăng nhập",
        cancelButtonText: "Hủy",
        showCancelButton: true,
        icon: 'info',
        title: "Oops!"
      });
      if (result.isConfirmed) navigate(`/${path.LOGIN}`);
      return false;
    }
    return true;
  };

  const handleClickOptions = async (e, flag) => {
    e.stopPropagation();
    if (flag === 'QUICK_VIEW') {
      if (viewSource) setViewSourceHandoff(viewSource, referrerProductId);
      dispatch(showModal({
        isShowModal: true,
        modalChildren: <ProductDetail isQuickView data={{ pid: productData?.id, category: productData?.category }} />
      }))
    }

    if (flag === 'ADD_TO_CART') {
      const isLoggedInCheck = await handleLoginCheck();
      if (!isLoggedInCheck) return;

      const res = await apiAddOrUpdateCart(productData?.id, 1);
      if (res.statusCode === 201) {
        toast.success('Đã thêm vào giỏ hàng');
        dispatch(getCurrentUser());
      } else {
        toast.error(res.message);
      }
    }

    if (flag === 'ADD_WISHLIST') {
      const isLoggedInCheck = await handleLoginCheck();
      if (!isLoggedInCheck) return;

      const res = await apiAddWishList(productData?.id);
      if (res.statusCode === 201) {
        toast.success('Đã thêm vào danh sách yêu thích');
      } else {
        toast.warn(res.message);
      }
    }
  };

  // Gold nhạt (amber-300/200) — chốt sau khi so sánh với xanh thương hiệu (lẫn vào nút/giá) và
  // tím violet (yếu hơn ở cùng độ nhạt); đủ tương phản để nổi bật mà không cạnh tranh với sao
  // đánh giá màu cam bên dưới ảnh.
  const emphasisClass =
    emphasisTier === 'primary'
      ? 'border-2 border-amber-300 shadow-md shadow-amber-50 scale-[1.04] z-10 relative'
      : emphasisTier === 'secondary'
      ? 'border border-amber-200/70 shadow-sm'
      : 'border';

  return (
    <div className="w-full h-auto text-base px-[10px]">
      <div
        onClick={e => {
          onBeforeNavigate?.();
          if (viewSource) setViewSourceHandoff(viewSource, referrerProductId);
          navigate(`/products/${encodeURIComponent(productData?.category)}/${productData?.id}/${convertToSlug(productData?.product_name)}`);
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          setShowOption(true);
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          setShowOption(false);
        }}
        className={`w-full ${emphasisClass} p-[15px] flex flex-col items-center transition-transform duration-200`}
      >
        <div className="w-full relative flex items-center justify-center">
          {showOption && (
            <div className="absolute bottom-[-10px] flex justify-center left-0 right-0 gap-2 animate-slide-top">
              <div
                className="py-2 cursor-pointer"
                onClick={(e) => handleClickOptions(e, 'QUICK_VIEW')}
              >
                <span title="Quick view"><SelectOption key={productData.id + '0'} icon={<FaEye />} /></span>
              </div>
              <div
                className='py-2 cursor-pointer'
                onClick={(e) => {
                  if (productData?.quantity > 0) {
                    handleClickOptions(e, 'ADD_TO_CART');
                  }
                  else{
                    e.stopPropagation();
                    toast.info("Sản phẩm đang tạm hết hàng")
                  }
                }}
              >
                <span title="Add to Cart"  className={`${productData?.quantity <=0 ? 'opacity-50' : ''}`}>
                  <SelectOption key={productData.id + '1'} icon={<FaCartShopping />}/>
                </span>
              </div>

              <div
                className="py-2 cursor-pointer"
                onClick={(e) => handleClickOptions(e, 'ADD_WISHLIST')}
              >
                <span title="Add to Wishlist"><SelectOption key={productData.id + '2'} icon={<FaHeart />} /></span>
              </div>
            </div>
          )}

          <div className="aspect-w-1 aspect-h-1">
            <img
              // src={productData?.imageUrl || product_default}
              src={
                productData?.imageUrl
                  ? productData.imageUrl.startsWith("https")
                    ? productData.imageUrl
                    : `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${
                      productData.imageUrl
                      }`
                  : product_default
              }
              alt=""
              className="object-cover w-full h-40"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-[15px] items-start w-full">
          <span className="line-clamp-1">{productData?.product_name}</span>
          <span className="flex">
            {renderStarFromNumber(productData?.rating)}
          </span>
          <span className="text-main whitespace-nowrap">
            {formatMoney(getEffectivePrice(productData))} &#8363;
          </span>
          <span className="flex items-center gap-1 h-4 leading-4 whitespace-nowrap">
            {getDiscountPercent(productData) !== null && (
              <>
                <span className="text-gray-400 line-through text-xs">
                  {formatMoney(productData.price)} &#8363;
                </span>
                <span className="text-xs text-red-500 bg-red-50 px-1 rounded">
                  -{getDiscountPercent(productData)}%
                </span>
              </>
            )}
          </span>
          <span className="text-xs text-red-500 h-4 leading-4 line-clamp-1">
            {getPromotionBadgeLabel(productData)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default withBaseComponent(ProductCard);
