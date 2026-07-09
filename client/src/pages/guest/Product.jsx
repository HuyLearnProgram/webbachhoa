import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, createSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Breadcrumb, ProductCard, Pagination, SortItem } from '@/components';
import { apiGetProducts, apiGetMaxPrice } from '@/apis';
import Masonry from 'react-masonry-css';
import { v4 as uuidv4 } from 'uuid';
import { sortProductOption, promotionTypeCustomerOptions, PROMOTION_TYPES } from '@/utils/constants';
import { buildProductNameFilter, stripDiacritics, renderStarFromNumber } from '@/utils/helper';
import { ClipLoader } from "react-spinners";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import icons from '@/utils/icons';
import category_default from '@/assets/category_default.png';

const { FaFilter } = icons;

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  480: 1
};

const override = {
  display: "block",
  margin: "0 auto",
};

const resolveCategoryImage = (imageUrl) =>
  imageUrl
    ? (imageUrl.startsWith('https') ? imageUrl : `${import.meta.env.VITE_BACKEND_TARGET}/storage/category/${imageUrl}`)
    : category_default;

const RATING_OPTIONS = [5, 4, 3, 2, 1];

// Trừ 0.5 so với mốc hiển thị: renderStarFromNumber() làm tròn theo kiểu "gần nhất" khi hiển thị sao
// (VD 3.5 sao hiển thị y hệt 4 sao vàng), nên ngưỡng lọc "X sao trở lên" cũng phải khớp quy tắc làm tròn
// đó, nếu không sản phẩm 3.5 sao sẽ hiển thị 4 sao nhưng lại biến mất khi lọc "4 sao trở lên".
const getRatingThreshold = (star) => Math.max(0, star - 0.5);

const Product = () => {

  const [products, setProducts] = useState([]);
  const [params, setParams] = useSearchParams();
  const { categories } = useSelector((state) => state.app);
  const selectedCategoryIds = (params.get('category') || '').split(',').filter(Boolean).map(Number);
  const selectedCategories = categories?.filter((c) => selectedCategoryIds.includes(c.id)) || [];
  const [maxPrice, setMaxPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductLoading, setIsProductLoading] = useState(true);
  const [sortOption, setSortOption] = useState('');
  const [error, setError] = useState(null);
  const [tempPriceRange, setTempPriceRange] = useState([0, 0]);
  const navigate = useNavigate();

  const activeRatingMin = params.get('rating') ? Number(params.get('rating').split('-')[0]) : null;
  const selectedPromotions = (params.get('promotion') || '').split(',').filter(Boolean);

  const getPageTitle = () => {
    const searchTerm = params.get('search');
    if (searchTerm) {
      return `Kết quả tìm kiếm cho "${searchTerm}"`;
    }
    if (selectedCategories.length === 1) {
      return selectedCategories[0].name;
    }
    if (selectedCategories.length > 1) {
      return selectedCategories.map((c) => c.name).join(', ');
    }
    return 'Tất cả sản phẩm';
  };

  const fetchMaxPrice = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const searchTerm = params.get('search');
      const res = await apiGetMaxPrice(
        selectedCategories.length === 1 ? stripDiacritics(selectedCategories[0].name) : undefined,
        searchTerm ? stripDiacritics(searchTerm) : searchTerm
      );
      if (res.statusCode === 200) {
        setMaxPrice(res.data);
      } else {
        throw new Error('Lỗi khi lấy giá tối đa');
      }
    } catch (error) {
      console.error('Error fetching max price:', error);
      setError('Lỗi khi lấy khoảng giá, hãy thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async (queries) => {
    try {
      setIsProductLoading(true);
      setError(null);
      const response = await apiGetProducts(queries);
      if (response.statusCode === 200) {
        setProducts(response.data);
      } else {
        throw new Error('Lỗi lấy thông tin sản phẩm');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Lỗi lấy thông tin sản phẩm. Hãy thử lại');
    } finally {
      setIsProductLoading(false);
    }
  };

  useEffect(() => {
    const sortValue = params.get('sort') || '';
    setSortOption(sortValue);
  }, [params]);

  // Đồng bộ giá trị tạm của slider giá theo URL, tránh giữ giá trị kéo dở khi chuyển trang/đổi filter khác
  useEffect(() => {
    const priceParam = params.get('price');
    setTempPriceRange(priceParam ? priceParam.split('-').map(Number) : [0, maxPrice]);
  }, [params, maxPrice]);

  const handlePagination = (page) => {
    const queries = {};
    for (let [key, value] of params.entries()) {
      queries[key] = value;
    }
    if (page) queries.page = page;

    navigate({
      pathname: '/products',
      search: `${createSearchParams(queries)}`,
    });
  };

  useEffect(() => {
    let queries = {
      page: params.get('page') || 1,
      size: 10,
      filter: []
    };

    let ratings = [], priceRange = [];

    // Khách hàng chỉ thấy sản phẩm đang bán
    queries.filter.push(`active=true`);

    if (selectedCategoryIds.length > 0) {
      const categoryClause = selectedCategoryIds.map((id) => `category.id=${id}`).join(' or ');
      queries.filter.push(`(${categoryClause})`);
    }

    const searchTerm = params.get('search');
    if (searchTerm) {
      queries.filter.push(buildProductNameFilter(searchTerm));
    }

    if (selectedPromotions.length > 0) {
      const promotionClause = selectedPromotions.map((value) => `promotionType='${value}'`).join(' or ');
      queries.filter.push(`(${promotionClause})`);
    }

    for (let [key, value] of params.entries()) {
      if (key === 'rating') {
        const ratingValues = value.split('-');
        ratings.push(...ratingValues);
      } else if (key === 'price') {
        const priceValues = value.split('-');
        priceRange.push(...priceValues);
      }
    }

    if (ratings.length > 0) {
      queries.filter.push(`rating >= ${ratings[0]} and rating <= ${ratings[1]}`);
    }

    if (priceRange.length > 0) {
      queries.filter.push(`price >= ${priceRange[0]} and price <= ${priceRange[1]}`);
    }

    if (ratings.length > 0 || priceRange.length > 0) {
      queries.page = params.get('page') || 1;
    }

    if (sortOption) {
      const [sortField, sortDirection] = sortOption.split('-');
      queries.sort = `${sortField},${sortDirection}`;
    }

    if (queries.filter.length > 0) {
      queries.filter = encodeURIComponent(queries.filter.join(' and '));
    } else {
      delete queries.filter;
    }

    fetchProducts(queries);
  }, [params, sortOption, navigate]);

  useEffect(() => {
    if (!isProductLoading && !error && products?.result?.length > 0) {
      fetchMaxPrice();
    } else {
      setIsLoading(false);
    }
  }, [isProductLoading, error, products.result]);

  const handleCategoryToggle = (id) => {
    const current = new Set(selectedCategoryIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    const newParams = new URLSearchParams(params);
    if (current.size > 0) {
      newParams.set('category', Array.from(current).join(','));
    } else {
      newParams.delete('category');
    }
    setParams(newParams);
  };

  const handleRatingSelect = (star) => {
    const newParams = new URLSearchParams(params);
    if (activeRatingMin === getRatingThreshold(star)) {
      newParams.delete('rating');
    } else {
      newParams.set('rating', `${getRatingThreshold(star)}-5`);
    }
    setParams(newParams);
  };

  const handlePromotionToggle = (value) => {
    const current = new Set(selectedPromotions);
    const isSelecting = !current.has(value);

    if (value === PROMOTION_TYPES.NONE) {
      // "Không khuyến mãi" xung khắc với mọi loại khuyến mãi khác (1 sản phẩm chỉ có đúng 1 promotionType)
      current.clear();
      if (isSelecting) current.add(value);
    } else {
      current.delete(PROMOTION_TYPES.NONE);
      if (isSelecting) current.add(value);
      else current.delete(value);
    }

    const newParams = new URLSearchParams(params);
    if (current.size > 0) {
      newParams.set('promotion', Array.from(current).join(','));
    } else {
      newParams.delete('promotion');
    }
    setParams(newParams);
  };

  const handleApplyPriceFilter = () => {
    const newParams = new URLSearchParams(params);

    if (tempPriceRange[0] === 0 && tempPriceRange[1] === maxPrice) {
      newParams.delete('price');
    } else {
      newParams.set('price', tempPriceRange.join('-'));
    }

    setParams(newParams);
  };

  const handleClearAllFilters = () => {
    const newParams = new URLSearchParams();
    const searchTerm = params.get('search');
    const sortValue = params.get('sort');
    if (searchTerm) newParams.set('search', searchTerm);
    if (sortValue) newParams.set('sort', sortValue);

    setTempPriceRange([0, maxPrice]);
    navigate({ pathname: '/products', search: newParams.toString() });
  };

  const handleClearFilters = () => {
    const newParams = new URLSearchParams();
    const categoryParam = params.get('category');
    if (categoryParam) newParams.set('category', categoryParam);
    navigate({ pathname: '/products', search: newParams.toString() });
  };

  if (error) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className='w-full'>
      <div className='h-20 flex justify-center items-center bg-gray-100'>
        <div className='w-main'>
          <h3 className='font-semibold uppercase'>{getPageTitle()}</h3>
          <Breadcrumb
            categoryLabel={selectedCategories.length === 1 ? selectedCategories[0].name : undefined}
            categoryHref={selectedCategories.length === 1 ? `/products?category=${selectedCategories[0].id}` : undefined}
          />
        </div>
      </div>

      <div className='w-main flex mt-6 m-auto'>
        <div className='w-[25%] flex-auto border rounded p-4 h-fit'>
          <div className='flex items-center gap-2 font-semibold text-sm uppercase mb-4 pb-3 border-b'>
            <FaFilter />
            Bộ lọc tìm kiếm
          </div>

          <div className='mb-5'>
            <div className='font-semibold text-sm mb-2'>Theo danh mục</div>
            <div className='flex flex-col gap-2 max-h-[220px] overflow-y-auto'>
              {categories?.map((c) => (
                <label key={c.id} className='flex items-center gap-2 text-sm cursor-pointer hover:text-main'>
                  <input
                    type='checkbox'
                    checked={selectedCategoryIds.includes(c.id)}
                    onChange={() => handleCategoryToggle(c.id)}
                    className='accent-main'
                  />
                  <img
                    src={resolveCategoryImage(c.imageUrl)}
                    alt={c.name}
                    className='w-6 h-6 object-cover rounded'
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className='mb-5'>
            <div className='font-semibold text-sm mb-2'>Theo giá</div>
            {isLoading ? (
              <div className='flex items-center h-8'>
                <ClipLoader size={20} color={"#123abc"} loading={isLoading} aria-label="Loading Spinner" />
              </div>
            ) : (
              <>
                <div className='flex justify-between text-xs mb-2 text-gray-500'>
                  <span>{tempPriceRange[0]}đ</span>
                  <span>{tempPriceRange[1]}đ</span>
                </div>
                <Slider
                  range
                  min={0}
                  max={maxPrice}
                  step={1000}
                  value={tempPriceRange}
                  onChange={setTempPriceRange}
                />
                <button
                  onClick={handleApplyPriceFilter}
                  className='mt-3 w-full bg-main text-white text-sm px-4 py-1.5 rounded hover:opacity-90'
                >
                  Áp dụng
                </button>
              </>
            )}
          </div>

          <div className='mb-5'>
            <div className='font-semibold text-sm mb-2'>Đánh giá</div>
            <div className='flex flex-col'>
              {RATING_OPTIONS.map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingSelect(star)}
                  className={`flex items-center gap-1 text-sm py-1 px-1 rounded hover:bg-gray-50 ${activeRatingMin === getRatingThreshold(star) ? 'text-main font-medium' : ''}`}
                >
                  <span className='flex'>{renderStarFromNumber(star)}</span>
                  {star < 5 && <span>trở lên</span>}
                </button>
              ))}
            </div>
          </div>

          <div className='mb-5'>
            <div className='font-semibold text-sm mb-2'>Dịch vụ &amp; Khuyến mãi</div>
            <div className='flex flex-col gap-2'>
              {promotionTypeCustomerOptions.map((option) => (
                <label key={option.value} className='flex items-center gap-2 text-sm cursor-pointer hover:text-main'>
                  <input
                    type='checkbox'
                    checked={selectedPromotions.includes(option.value)}
                    onChange={() => handlePromotionToggle(option.value)}
                    className='accent-main'
                  />
                  <span className={selectedPromotions.includes(option.value) ? 'text-main font-medium' : ''}>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className='pt-3 border-t flex justify-center'>
            <button onClick={handleClearAllFilters} className='text-sm text-red-600 hover:underline'>
              Xoá tất cả
            </button>
          </div>
        </div>

        <div className='flex flex-col gap-5 pl-5 w-[75%] flex-auto'>
          <div className='w-full border p-4'>
            <SortItem
              sortOption={sortOption}
              setSortOption={setSortOption}
              sortOptions={sortProductOption}
            />
          </div>

          <div>
            {isProductLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <ClipLoader
                  size={50}
                  color={"#123abc"}
                  loading={isProductLoading}
                  cssOverride={override}
                  aria-label="Loading Products"
                />
              </div>
            ) : products?.result?.length > 0 ? (
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="my-masonry-grid flex mx-0"
                columnClassName="my-masonry-grid_column mb-[-20px]"
              >
                {products.result.map((e) => (
                  <ProductCard key={uuidv4()} productData={e} />
                ))}
              </Masonry>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-gray-500 gap-3">
                <span>Không tìm thấy sản phẩm phù hợp.</span>
                <button
                  onClick={handleClearFilters}
                  className="text-main border border-main rounded px-4 py-1 text-sm hover:bg-main hover:text-white transition"
                >
                  Xoá bộ lọc
                </button>
              </div>
            )}
          </div>

          {products?.meta?.pages > 1 && <div className='flex justify-center'>
            <Pagination
              totalPage={products?.meta?.pages}
              currentPage={products?.meta?.page}
              totalProduct={products?.meta?.total}
              pageSize={products?.meta?.pageSize}
              onPageChange={handlePagination}
            />
          </div>}
        </div>
      </div>
    </div>
  );
};

export default Product;
