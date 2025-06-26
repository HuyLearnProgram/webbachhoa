import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function SearchProduct({onSearch}) {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const productSearch = params.get("search");
  const categorySearch = params.get("category");
  const sort = params.get("sort")

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      onSearch()
      if (searchTerm.trim() === "") {
        navigate(`/admin/product`);
        window.location.reload()
        
      } else {
        navigate(
          `/admin/product?${new URLSearchParams({
            search: searchTerm.trim(),
            ...(categorySearch && { category: categorySearch }), // Include category if it exists
            ...(sort &&{ sort: sort}),
            page: 1 
          }).toString()}`
        );
      }
    }
  };

  useEffect(() => {
    setSearchTerm(productSearch || "");
  }, [productSearch]);

  return (
    <div>
      <div></div>
      <input
        type="text"
        placeholder="Tìm kiếm sản phẩm"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-[500px] border border-gray-300 rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );
}

export default SearchProduct;