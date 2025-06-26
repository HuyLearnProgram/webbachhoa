import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, createSearchParams } from 'react-router-dom';
import { Breadcrumb, ProductCard, FilterItem, Pagination, SortItem } from '@/components';
import { apiGetProducts, apiGetMaxPrice } from '@/apis';
import Masonry from 'react-masonry-css';
import { v4 as uuidv4 } from 'uuid';
import { sortProductOption } from '@/utils/constants';
import { ClipLoader } from "react-spinners";

const breakpointColumnsObj = {
  default: 5,
  1100: 4,
  700: 3,
  500: 2
};

const override = {
  display: "block",
  margin: "0 auto",
};

const Product = () => {

  const [products, setProducts] = useState([]);
  const [activeClick, setActiveClick] = useState(null);
  const [params] = useSearchParams();
  const { category } = useParams()
  const [maxPrice, setMaxPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductLoading, setIsProductLoading] = useState(true);
  const [sortOption, setSortOption] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const getPageTitle = () => {
    const searchTerm = params.get('search');
    if (searchTerm) {
      return `Kết quả tìm kiếm cho "${searchTerm}"`;
    }
    if (category) {
      return category;
    }
    return 'Tất cả sản phẩm';
  };

  const fetchMaxPrice = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiGetMaxPrice(category, params.get('search'));
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

  const handlePagination = (page) => {
    const queries = {};
    for (let [key, value] of params.entries()) {
      queries[key] = value;
    }
    if (page) queries.page = page;

    navigate({
      pathname: category ? `/products/${category}` : `/products`,
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

    if (category) {
      queries.filter.push(`category.name='${category}'`);
    }

    const searchTerm = params.get('search');
    if (searchTerm) {
      queries.filter.push(`productName~'${searchTerm}'`);
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
  }, [params, sortOption, category, navigate]);

  useEffect(() => {
    if (!isProductLoading && !error && products?.result?.length > 0) {
      fetchMaxPrice();
    } else {
      setIsLoading(false);
    }
  }, [isProductLoading, error, products.result]);

  const changeActiveFilter = useCallback((name) => {
    if (activeClick === name) setActiveClick(null);
    else setActiveClick(name);
  }, [activeClick]);

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
          <Breadcrumb category={category} />
        </div>
      </div>

      <div className='w-main border p-4 flex justify-between mt-8 m-auto'>
        <div className='w-3/4 flex-auto flex items-center gap-4'>
          <span className='font-semibold text-sm'>Lọc</span>
          {isLoading ? (
            <div className="flex items-center justify-center w-40">
              <ClipLoader
                size={30}
                color={"#123abc"}
                loading={isLoading}
                cssOverride={override}
                aria-label="Loading Spinner"
              />
            </div>
          ) : (
            <FilterItem
              name='price'
              activeClick={activeClick}
              changeActiveFilter={changeActiveFilter}
              range
              min={0}
              max={maxPrice}
              step={1000}
            />
          )}
          <FilterItem
            name='rating'
            activeClick={activeClick}
            changeActiveFilter={changeActiveFilter}
            range
            min={0}
            max={5}
            step={0.5}
          />
        </div>
        <div className='w-1/4 flex-auto'>
          <SortItem
            sortOption={sortOption}
            setSortOption={setSortOption}
            sortOptions={sortProductOption}
          />
        </div>
      </div>

      <div className='mt-8 w-main m-auto'>
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
          <div className="flex items-center justify-center h-[200px] text-gray-500">
            No products found
          </div>
        )}
      </div>

      {products?.meta?.pages > 1 && <div className='w-main m-auto my-4 flex justify-center'>
        <Pagination
          totalPage={products?.meta?.pages}
          currentPage={products?.meta?.page}
          totalProduct={products?.meta?.total}
          pageSize={products?.meta?.pageSize}
          onPageChange={handlePagination}
        />
      </div>}
    </div>
  );
};

export default Product;