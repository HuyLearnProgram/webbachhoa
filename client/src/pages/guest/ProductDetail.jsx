import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGetProduct, apiGetRatingsPage, apiRatings, apiFetchRecommendProductById, apiAddOrUpdateCart, apiAddWishList } from '@/apis';
import { Breadcrumb, Button, QuantitySelector, ProductExtraInfoItem, ProductInfomation, VoteOption, Comment, ProductCard } from '@/components';
import { formatMoney, renderStarFromNumber } from '@/utils/helper'
import product_default from '@/assets/product_default.png'
import { productExtraInfo } from '@/utils/constants';
import Votebar from '@/components/vote/Votebar';
import { useDispatch, useSelector } from 'react-redux';
import { showModal } from '@/store/app/appSlice'
import Swal from 'sweetalert2';
import path from '@/utils/path';
import { useNavigate } from 'react-router-dom';
import Pagination from '@/components/paginate/Pagination';
import clsx from 'clsx';
import { toast } from 'react-toastify';
import icons from '@/utils/icons';
import { getCurrentUser } from '@/store/user/asyncActions';

const { FaHeart } = icons
const ProductDetail = ({ isQuickView, data }) => {

  const params = useParams();
  const [product, setProduct] = useState(null);
  const [paginate, setPaginate] = useState(null)
  const [feedbacksPage, setFeedbacksPage] = useState(null)
  const [feedbacks, setFeedbacks] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [update, setUpdate] = useState(false)
  const [uid, setUid] = useState(null)
  const { isLoggedIn, current } = useSelector(state => state.user)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [quantity, setQuantity] = useState(1);
  const [recommendedProducts, setRecommendedProducts] = useState(null)
  const [pid, setPid] = useState(null)

  useEffect(() => {
    if (data) {
      setPid(data.pid);
    } else if (params) {
      setPid(params.pid);
    }
  }, [params, data]);

  const fetchProductData = async () => {
    const response = await apiGetProduct(pid);
    if (response.statusCode === 200) {
      setProduct(response.data);
    }
  };

  const fetchRecommended = async () => {
    const res = await apiFetchRecommendProductById(pid);
    if (res.statusCode === 200) {
      setRecommendedProducts(res.data);
    }
  };

  const fetchFeedbacksData = async (page = 1) => {
    const response = await apiGetRatingsPage(pid, { page, size: 5 });
    if (response.statusCode === 200) {
      setFeedbacks(response.data?.result);
      setFeedbacksPage(response.data?.result); // Có thể bỏ qua nếu không cần
      setCurrentPage(page);
    }
  };

  const fetchUserData = async () => {
    if (current) {
      setUid(current.id);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (pid) {
        await fetchProductData();
        await fetchRecommended();
        
        // Chỉ gọi fetchFeedbacksData nếu không ở chế độ Quick View
        if (!isQuickView) {
          await fetchFeedbacksData(currentPage);
        }
      }
    };
  
    fetchData();
  }, [pid, currentPage, update, isQuickView])

  useEffect(() => {
    if (!isQuickView) {
      fetchUserData();
    }
  }, [isQuickView]);

  const rerender = useCallback(() => {
    setUpdate(prev => !prev);
  }, []);

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity > product?.quantity) {
      toast.info(`Chỉ còn ${product?.quantity} sản phẩm`);
      setQuantity(product?.quantity); // Reset về số lượng tối đa
    } else {
      setQuantity(newQuantity);
    }
  };

  const handleSubmitVoteOption = async ({ comment, score }) => {
    if (!comment || !score || !pid) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    await apiRatings({ description: comment, ratingStar: score, productId: pid, userId: uid });
    dispatch(showModal({ isShowModal: false, modalChildren: null }));
    rerender();
  };

  const checkLoginAndExecute = async (callback) => {
    if (!isLoggedIn) {
      const result = await Swal.fire({
        text: "Đăng nhập trước để thực hiện hành động này",
        confirmButtonText: "Đăng nhập",
        cancelButtonText: "Hủy",
        showCancelButton: true,
        title: "Oops!"
      });
      if (result.isConfirmed) navigate(`/${path.LOGIN}`);
    } else {
      await callback();
    }
  };

  const handleVoteNow = () => {
    checkLoginAndExecute(() => {
      dispatch(showModal({
        isShowModal: true,
        modalChildren: <VoteOption nameProduct={product?.productName} handleSubmitOption={handleSubmitVoteOption} />
      }));
    });
  };

  const addWishList = async (pid) => {
    await checkLoginAndExecute(async () => {
      const rs = await apiAddWishList(pid);
      if (rs.statusCode === 201) {
        toast.success("Thêm thành công vào danh sách yêu thích");
      } else {
        toast.warn(rs.message);
      }
    });
  };

  const addToCart = async (pid, quantity) => {
    await checkLoginAndExecute(async () => {
      const rs = await apiAddOrUpdateCart(pid, quantity);
      if (rs.statusCode === 201) {
        toast.success(`Đã thêm vào giỏ hàng (${rs.data.quantity})`);
        dispatch(getCurrentUser());
      } else {
        toast.error(rs.message);
      }
    });
  };


  return (
    <div className='w-full' onClick={e => e.stopPropagation()}>
      {!isQuickView && <div className='h-20 flex justify-center items-center bg-gray-100'>
        <div className='w-main'>
          <h3 className='font-semibold'>{product?.productName}</h3>
          <Breadcrumb title={product?.productName} category={params.category} />
        </div>
      </div>}
      <div className={clsx('m-auto mt-4 flex', isQuickView ? 'max-w-[900px] max-h-[80vh] bg-gray-100 rounded-lg gap-5 p-4 overflow-y-auto' : 'w-main')}>
        <div className={clsx('flex-4 flex flex-col gap-4 ', isQuickView ? 'w-1/2' : 'w-2/5')}>
          <div className='w-[450px]'>
            <div className='px-2' >
              <img 
              src={
                product?.imageUrl
                  ? product?.imageUrl.startsWith("https")
                    ? product?.imageUrl
                    : `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${
                      product?.imageUrl
                      }`
                  : product_default
              }
              alt='product' className='object-cover' />
            </div>
          </div>
        </div>
        <div className={clsx('flex flex-col gap-4', isQuickView ? 'w-1/2' : 'w-2/5 ')}>
          <div className='flex justify-between items-center'>
            <h2 className='text-[30px] font-semibold'>{`${formatMoney(product?.price)}đ`}</h2>
            <span className='text-sm text-red-500 ml-2 mt-1 pr-2'>{`Có sẵn: ${product?.quantity}`}</span>
          </div>
          <div className='flex items-center'>
            {parseFloat(product?.rating.toFixed(1))}
            {renderStarFromNumber(product?.rating)?.map((el, index) => (
              <span key={index}>{el}</span>
            ))}
            <span className='text-sm text-red-500 ml-2 mt-1'>{`Đã bán ${product?.sold}`}</span>
          </div>
          <ul className="text-smtext-gray-500">
            {`Đơn vị: ${product?.unit || "Không"}`}
          </ul>
          <div className='flex flex-col gap-8'>
            {product?.quantity > 0 ? (
              <>
                <div className='flex items-center gap-4'>
                  <span>Số lượng</span>
                  <QuantitySelector
                    quantity={quantity}
                    stock={product?.quantity}
                    onIncrease={() => handleQuantityChange(quantity + 1)}
                    onDecrease={() => handleQuantityChange(Math.max(quantity - 1, 1))}
                    onChange={handleQuantityChange}
                  />
                  <span className='ml-4 hover:scale-125 transition-transform duration-300 ease-in-out transform'
                    onClick={() => addWishList(product?.id)}>
                    <FaHeart size={20} color='#10B981' />
                  </span>
                </div>

                <Button fw handleOnClick={() => addToCart(product?.id, quantity)}>Thêm vào giỏ hàng</Button>
              </>
            ) : (
              <p className='text-red-500'>Sản phẩm đang tạm hết hàng, bạn vui lòng quay lại sau nhé</p>
            )}
          </div>
        </div>
        {!isQuickView && <div className='flex-2 w-1/5 ml-4'>
          {productExtraInfo.map(e => (
            <ProductExtraInfoItem key={e.id} title={e.title} sub={e.sub} icon={e.icon} />
          ))}
        </div>}
      </div>
      {!isQuickView && <><div className='w-main m-auto mt-8'>
        <ProductInfomation des={product?.description} review={
          <div>
            <div className='flex p-4'>
              <div className='flex-4 flex flex-col items-center justify-center'>
                <span className='font-semibold text-3xl'>{`${parseFloat(product?.rating.toFixed(1))}/5`}</span>
                <span className='flex items-center gap-1'>{renderStarFromNumber(product?.rating)?.map((el, index) => (
                  <span key={index}>{el}</span>
                ))}</span>
                <span>{`${feedbacks?.length || 0} đánh giá`}</span>
              </div>
              <div className='flex-6 flex flex-col gap-2 py-8'>
                {Array.from(Array(5).keys()).reverse().map(el => (
                  <Votebar
                    key={el}
                    number={el + 1}
                    ratingCount={feedbacks?.filter(i => i.ratingStar === el + 1)?.length}
                    ratingTotal={feedbacks?.length}
                  />
                ))}
              </div>
            </div>
            <div className='p-4 flex items-center justify-center text-sm flex-col gap-2'>
              <span>Bạn đánh giá sao sản phẩm này</span>
              <Button handleOnClick={handleVoteNow}>Đánh giá ngay</Button>
            </div>
            <div className='flex flex-col gap-4'>
              {feedbacksPage?.map((el, index) => (
                <Comment key={index} ratingStar={el.ratingStar} content={el.description}
                  updatedAt={el.updatedAt} name={el.userName} image={`${import.meta.env.VITE_BACKEND_TARGET}/storage/avatar/${el?.userAvatarUrl}`} />
              ))}
            </div>
            {paginate?.pages > 1 && <div>
              <Pagination totalPage={paginate?.pages} currentPage={paginate?.page}
                pageSize={paginate?.pageSize} totalProduct={paginate?.total} onPageChange={(page) => setCurrentPage(page)} />
            </div>}
          </div>
        } rerender={rerender} />
      </div>
        <div className='w-full flex justify-center'>
          <div className="w-main">
            <h2 className="text-[20px] uppercase font-semibold py-2 border-b-4 border-main">
              Sản phẩm tương tự
            </h2>
            <div className="grid grid-cols-6 gap-4 mt-4 ">
              {recommendedProducts?.map((e) => (
                <ProductCard key={e.id} productData={e} />
              ))}
            </div>
          </div>
        </div></>}
    </div>
  )
}

export default ProductDetail