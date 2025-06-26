import React from "react";
import {formatMoney } from "@/utils/helper";

const ProductMiniItem = ({ image, title, price }) => {
  return (
    <div className="flex flex-auto px-2">
      <div className="flex w-full">
        <img
          src={image}
          alt="product"
          className="w-[70px] object-contain p-4"/>
        <div className="flex flex-col gap-1 mt-[15px] items-start w-full text-xs">
          <span className="line-clamp-1 capitalize text-sm">
            {title?.toLowerCase()}
          </span>
          <span className="text-main">{formatMoney(price) || ""} &#8363;</span>
        </div>
      </div>
    </div>
  );
};

export default ProductMiniItem;