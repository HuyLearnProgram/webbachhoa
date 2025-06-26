import React, { useState, useEffect, useRef } from "react";
import { apiSearchProducts } from "@/apis";
import { useNavigate } from "react-router-dom";
import product_default from '@/assets/product_default.png';
import { ProductMiniItem } from "@/components";
import { convertToSlug } from "@/utils/helper";

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const resultsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (searchTerm.trim() !== "") {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch();
      }, 1500);
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
        filter: `productName~'${searchTerm}'`,
      };
      const response = await apiSearchProducts(params);
      setProducts(response.data.result);
      setShowResults(true);
    } catch (error) {
      setError("Error fetching products");
    }
  };

  const handleShowAll = () => {
    navigate(`/products?search=${searchTerm}`);
    setShowResults(false);
  };

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
    if (event.key === "Enter" && searchTerm.trim() !== "") {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      navigate(`/products?search=${searchTerm}`);
      setShowResults(false);
    }
  };

  const handleProductClick = (product) => {
    navigate(`/products/${encodeURIComponent(product.category)}/${product.id}/${convertToSlug(product.product_name)}`);
    setShowResults(false);
  };

  return (
    <div className="flex flex-grow justify-center mx-5 relative items-center">
      <input
        type="text"
        placeholder="Tìm kiếm..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-[500px] border border-gray-300 rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-green-500"
      />

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
            <div className="p-2 text-sm">Không tìm thấy sản phẩm. Tìm kiếm với hệ thống đề xuất?</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
