import React, { useState, useEffect } from "react";
import { apiGetProduct, apiUpdateProduct2 } from "@/apis";
import { EditProductForm, TurnBackHeader } from "@/components/admin/index";
import { toast } from "react-toastify";

function EditProduct() {
  const [product, setProduct] = useState(null);
  const [inputCount, setInputCount] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [messageContent, setMessageContent] = useState("");


  const path = window.location.pathname;
  const pid = path.split('/').pop();

  const fetchProduct = async (pid) => {
    try {
      const res = await apiGetProduct(pid);
      if (res.data) {
        setProduct(res.data);
      } else {
        throw new Error("Không tìm thấy sản phẩm.");
      }
    } catch (error) {
      console.error("Lỗi khi lấy sản phẩm:", error);
      toast.error("Có lỗi xảy ra khi tải sản phẩm.");
    }
  };

  useEffect(() => {
    fetchProduct(pid);
  }, [pid]);

  const handleShowAddProduct = () => {
    setShowMessage(true);
    setInputCount(0);
    setMessageContent('');
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
    setMessageContent('');
    setInputCount(0);
  };

  const handleAdd = async () => {
    if (inputCount <= 0) {
      setMessageContent("Giá trị số bạn nhập nhỏ hơn hoặc bằng 1. Hãy nhập lại dữ liệu.");
      return;
    }

    const productToAddQuantity = {
      id: product?.id,
      productName: product?.productName,
      price: product?.price,
      quantity: Number(product?.quantity) + Number(inputCount),
      sold: product?.sold,
      description: product?.description,
      imageUrl: product?.imageUrl,
      category: { id: product?.category?.id },
    };

    try {
      const resAddQuantity = await apiUpdateProduct2(productToAddQuantity);
      if (resAddQuantity.statusCode !== 200) {
        throw new Error(resAddQuantity.message || "Có lỗi xảy ra khi cập nhật sản phẩm.");
      }
      toast.success("Cập nhật sản phẩm thành công!");
      handleCloseMessage();
      await fetchProduct(pid);

    } catch (err) {
      toast.error("Có lỗi xảy ra: " + err.message);
    }
  };

  if (!product) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full">
      <TurnBackHeader turnBackPage="/admin/product" header="Quay về trang sản phẩm" />
      <EditProductForm initialProductData={product} />
      
      <div className="fixed bottom-16 right-16">
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full" onClick={handleShowAddProduct}>
          + Thêm sản phẩm
        </button>
      </div>

      {showMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
          <div className="bg-white p-5 rounded shadow-lg mx-40">
            <h2 className="font-bold">Nhập số lượng sản phẩm cho: {product?.productName}:</h2>
            <input
              type="number"
              value={inputCount}
              onChange={(e) => setInputCount(e.target.value)}
              className="border p-2 rounded mt-2"
              placeholder="Nhập số lượng"
            />
            <p className="mt-2 text-red-500">{messageContent}</p>
            <div className="flex justify-between mt-4">
              <button onClick={handleAdd} className="bg-green-500 text-white px-4 py-2 rounded ml-2">Thêm</button>
              <button onClick={handleCloseMessage} className="bg-red-500 text-white px-4 py-2 rounded">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProduct;
