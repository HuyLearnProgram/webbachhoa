import React, { useState, useEffect } from "react";
import { ProductCard } from "@/components";
import { apiGetProducts } from "@/apis";

const FeatureProduct = () => {
  const [products, setProducts] = useState(null);

  const fetchProduct = async () => {
    const response = await apiGetProducts({ page: 1, size: 12, sort: 'sold,desc', filter: `active=true` });
    if (response.statusCode === 200) {
      setProducts(response.data.result)
    }
  };

  useEffect(() => {
    fetchProduct();
  }, []);


  return (
    <div className="w-main">
      <h2 className="text-[20px] uppercase font-semibold py-[10px] border-b-4 border-main">
        Sản phẩm bán chạy
      </h2>

      <div className="grid grid-cols-6 gap-4 mt-4">
        {products?.map((e) => (
          <ProductCard key={e.id} productData={e} viewSource="HOME_FEED" />
        ))}
      </div>

    </div>
  );
};

export default FeatureProduct;
