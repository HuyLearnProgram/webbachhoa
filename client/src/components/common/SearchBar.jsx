import React, { useState, useEffect, useRef } from "react";
import { apiSearchProducts } from "@/apis";
import { useNavigate, useSearchParams } from "react-router-dom";
import product_default from '@/assets/product_default.png';
import { ProductMiniItem } from "@/components";
import { convertToSlug, buildProductNameFilter } from "@/utils/helper";
import icons from "@/utils/icons";

const { FaSearch } = icons;

const SearchBar = () => {
  const [searchParams] = useSearchParams();
  // Khởi tạo từ URL hiện tại (?search=...) để ô tìm kiếm không bị mất giá trị khi F5 lại trang kết quả
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || "");
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const resultsRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Bỏ qua lần chạy đầu tiên: searchTerm lúc này chỉ là giá trị lấy lại từ URL (F5 trang kết quả),
    // không phải người dùng vừa gõ, nên không nên tự bật dropdown gợi ý.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (searchTerm.trim().length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch();
      }, 400);
    } else {
      setProducts(null);
      setShowResults(false);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const handleSearch = async () => {
    setError(null);
    setProducts(null);
    try {
      const params = {
        page: 1,
        size: 3,
        filter: `${buildProductNameFilter(searchTerm)} and active=true`,
      };
      const response = await apiSearchProducts(params);
      setProducts(response.data.result);
      setShowResults(true);
    } catch (error) {
      setError("Error fetching products");
    }
  };

  const handleSubmitSearch = () => {
    if (searchTerm.trim() === "") return;
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    navigate(`/products?search=${searchTerm}`);
    setShowResults(false);
  };

  const handleShowAll = () => handleSubmitSearch();

  const handleClickOutside = (event) => {
    if (resultsRef.current && !resultsRef.current.contains(event.target)) {
      setShowResults(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSubmitSearch();
    }
  };

  const handleProductClick = (product) => {
    navigate(`/products/${encodeURIComponent(product.category)}/${product.id}/${convertToSlug(product.product_name)}`);
    setShowResults(false);
  };

  return (
    <div className="flex flex-grow justify-center mx-5 relative items-center">
      <div className="relative w-[500px]">
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full border border-gray-300 rounded-lg p-1 pr-9 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="button"
          onClick={handleSubmitSearch}
          aria-label="Tìm kiếm"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-main"
        >
          <FaSearch size={14} />
        </button>
      </div>

      {showResults && (
        <div ref={resultsRef} className="absolute top-full w-[500px] bg-white shadow-md rounded-md mt-2 z-10">
          {error ? (
            <div className="text-red-500 p-2 text-sm">{error}</div>
          ) : products && products.length > 0 ? (
            <>
              {products.map((product) => (
                <div
                  key={product.id}
                  className="p-2 border-b cursor-pointer"
                  onClick={() => handleProductClick(product)}
                >
                  <ProductMiniItem title={product.product_name} image={product.imageUrl || product_default} price={product.price} />
                </div>
              ))}
              <button
                onClick={handleShowAll}
                className="w-full p-2 text-green-500 hover:underline text-sm"
              >
                Hiển thị tất cả
              </button>
            </>
          ) : (
            <div className="p-2 text-sm">Không tìm thấy sản phẩm phù hợp.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
