import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import InputFormAdmin from "./InputFormAdmin";
import { apiUploadImage, apiUpdateProduct2 } from "@/apis";
import product_default from "@/assets/product_default.png";
import { toast } from 'react-toastify';
const EditProductForm = ({ initialProductData }) => {
  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm();

  const [productData, setProductData] = useState(initialProductData);
  //const [selectedCategory, setSelectedCategory] = useState(null);
  const [productImage, setProductImage] = useState(null)

  const [previewProductImage, setPreviewProductImage] = useState(
    initialProductData?.imageUrl && initialProductData.imageUrl.startsWith('https')
      ? initialProductData?.imageUrl
      : (initialProductData?.imageUrl ? `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${initialProductData.imageUrl}` : product_default)
  );

  useEffect(() => {
    setProductData(initialProductData);
    setPreviewProductImage(
      initialProductData?.imageUrl && initialProductData.imageUrl.startsWith('https')
        ? initialProductData.imageUrl
        : initialProductData?.imageUrl ? `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${initialProductData.imageUrl}` : product_default
    );
    // Reset form values with the updated initialProductData
    reset(initialProductData);
  }, [initialProductData, reset]);




  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewProductImage(reader.result);
      };
      reader.readAsDataURL(file);
      setProductImage(file);
    }
  }


  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData({
      ...productData,
      [name]: value,
    });
  };

  const handleUpdateProduct = async (data) => {
    const productToUpdate = {
      id: initialProductData?.id,
      productName: data?.productName,
      price: data?.price,
      imageUrl: initialProductData?.imageUrl,
      quantity: data?.quantity,
      // rating:initialProductData?.rating,
      // sold:initialProductData?.sold,
      description: data?.description,
      category: { id: productData?.category?.id } // Include the category ID
    };
    console.log(productToUpdate)
    try {
      // const response = await apiUpdateProduct2(productToUpdate);
      const resUpLoad = await apiUploadImage(productImage, "product")
      productToUpdate.imageUrl = resUpLoad?.data?.fileName || initialProductData?.imageUrl;
      const resUpdate = await apiUpdateProduct2(productToUpdate)
      if (resUpdate.statusCode === 400) {
        throw new Error(resCreate.message || "Có lỗi xảy ra khi tạo sản phẩm.");
      }
      // const response = await apiUpdateProduct2(productToUpdate,productImage,"product")
      toast.success("Sửa sản phẩm thành công!");
      reset(data);
    } catch (err) {
      toast.error("Có lỗi xảy ra: " + err.message);
    }
  }
  return (
    <div className="w-full">
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-xl">
          <form onSubmit={handleSubmit(handleUpdateProduct)} className="space-y-4">
            <div className="mb-6">
              <InputFormAdmin
                disabled={true}
                className="border p-2 w-full"
                defaultValue={productData?.id}
                label="Id sản phẩm"
                register={register}
                errors={errors}
                // {...register("id")}
                id="id"
              // validate={{ required: "Need fill this field" }}
              />
            </div>
            <div className="mb-6">
              <InputFormAdmin
                className="border p-2 w-full"
                defaultValue={productData?.product_name || productData?.productName}
                label="Tên sản phẩm"
                register={register}
                errors={errors}
                id="productName"
                validate={{ required: "Cần điền thông tin vào trường này" }}
              />
            </div>

            <div className="mb-6">
              <InputFormAdmin
                className="border p-2 w-full"
                defaultValue={productData?.price}
                label="Giá"
                register={register}
                errors={errors}
                id="price"
                validate={{ required: "Cần điền thông tin vào trường này" }}
                type="number"
              />
            </div>

            <div className="mb-6">
              <InputFormAdmin
                className="border p-2 w-full"
                defaultValue={productData?.quantity}
                label="Số lượng"
                register={register}
                errors={errors}
                id="quantity"
                validate={{ required: "Cần điền thông tin vào trường này" }}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                step={0}
                min={0}
              />
            </div>

            <div className="mb-6">
              <label htmlFor="description" className="block mb-2 text-gray-700">
                Mô tả
              </label>
              <textarea
                {...register("description", { required: "Cần điền thông tin vào trường này" })}
                className="border p-2 w-full h-40 rounded-lg"
                defaultValue={productData?.description}
              />
            </div>
            <div className="mb-6">
              <label className="block">Đánh giá:</label>
              <input
                disabled={true}
                type="number"
                name="rating"
                value={productData?.rating}
                onChange={handleChange}
                className="border p-2 w-full rounded-lg"
                min="0"
                max="5"
              />
            </div>
            <div className="mb-6">
              <label className="block">Số lượng đã bán:</label>
              <input
                disabled={true}
                type="number"
                name="sold"
                value={productData?.sold}
                onChange={handleChange}
                className="border p-2 w-full rounded-lg"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-gray-700">Hình ảnh</label>
              <div className="w-full h86 flex items-center justify-center border rounded-lg overflow-hidden bg-gray-50">
                <img
                  src={previewProductImage || product_default}
                  alt={productData?.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <div>
                  {/* <div className="bg-black h-1 mt-4"></div> */}
                </div>

              </div>
            </div>
            <div className="flex justify-between mt-4">
              <label className="cursor-pointer" style={{ marginRight: '70px', flex: 1 }}>
                <span className="inline-block text-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition w-full">
                  Chọn ảnh
                </span>
                <input
                  type="file"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                className="bg-green-500 text-white p-2 rounded-md w-full"
                style={{ marginLeft: '70px', flex: 1 }}
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProductForm;
