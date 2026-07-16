import React from "react";
import product_default from "@/assets/product_default.png";
import { resolveImageUrl } from "@/utils/helper";

const resolveProductImage = (imageUrl) => resolveImageUrl(imageUrl, "product", product_default);

// gifts: [{ item: CartItemDTO, freeUnits: number }]
const GiftDetailModal = ({ gifts, onClose }) => {
  return (
    <div className="bg-white rounded-lg p-6 w-[400px] max-w-full" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-semibold mb-4">Chi tiết quà tặng</h3>
      <div className="flex flex-col gap-3">
        {gifts?.map(({ item, freeUnits }) => (
          <div key={item.id} className="flex items-center gap-3">
            <img
              src={resolveProductImage(item.imageUrl)}
              alt={item.productName}
              className="w-14 h-14 object-cover rounded"
            />
            <div>
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-red-500">Tặng {freeUnits} sản phẩm</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onClose}
        className="mt-6 w-full bg-main text-white py-2 rounded-md hover:opacity-90"
      >
        Đồng ý
      </button>
    </div>
  );
};

export default GiftDetailModal;
