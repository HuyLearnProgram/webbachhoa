import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import InputFormAdmin from "./InputFormAdmin";
import { apiUploadImage, apiUpdateProduct2, apiAddProductImage, apiRemoveProductImage } from "@/apis";
import product_default from "@/assets/product_default.png";
import { toast } from 'react-toastify';

const resolveImageUrl = (imageUrl) =>
  imageUrl && imageUrl.startsWith('https')
    ? imageUrl
    : (imageUrl ? `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${imageUrl}` : product_default);

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
  const [galleryImages, setGalleryImages] = useState(initialProductData?.images || []);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const [previewProductImage, setPreviewProductImage] = useState(
    resolveImageUrl(initialProductData?.imageUrl)
  );

  useEffect(() => {
    setProductData(initialProductData);
    setPreviewProductImage(resolveImageUrl(initialProductData?.imageUrl));
    // Reset form values with the updated initialProductData
    reset(initialProductData);
    setGalleryImages(initialProductData?.images || []);
  }, [initialProductData, reset]);

  const handleAddGalleryImage = async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file || !initialProductData?.id) return;
    try {
      setIsUploadingGallery(true);
      const resUpload = await apiUploadImage(file, "product");
      const imageUrl = resUpload?.data?.fileName;
      if (!imageUrl) throw new Error("Tải ảnh lên thất bại");
      const res = await apiAddProductImage(initialProductData.id, imageUrl);
      setGalleryImages(res?.data?.images || []);
    } catch (err) {
      toast.error("Thêm ảnh phụ thất bại: " + err.message);
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleRemoveGalleryImage = async (imageId) => {
    try {
      await apiRemoveProductImage(initialProductData.id, imageId);
      setGalleryImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      toast.error("Xoá ảnh phụ thất bại: " + err.message);
    }
  };

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
    if (data?.originalPrice && Number(data.originalPrice) <= Number(data.price)) {
      toast.error("Giá gốc phải lớn hơn giá bán (chỉ điền khi có khuyến mãi)");
      return;
    }
    const productToUpdate = {
      id: initialProductData?.id,
      productName: data?.productName,
      sku: data?.sku || null,
      price: data?.price,
      originalPrice: data?.originalPrice ? Number(data.originalPrice) : null,
      unit: initialProductData?.unit,
      imageUrl: initialProductData?.imageUrl,
      quantity: data?.quantity,
      description: data?.description,
      category: { id: productData?.category?.id } // Include the category ID
    };
    try {
      // const response = await apiUpdateProduct2(productToUpdate);
      const resUpLoad = await apiUploadImage(productImage, "product")
      productToUpdate.imageUrl = resUpLoad?.data?.fileName || initialProductData?.imageUrl;
      const resUpdate = await apiUpdateProduct2(productToUpdate)
      if (resUpdate.statusCode === 400) {
        throw new Error(resUpdate.message || "Có lỗi xảy ra khi tạo sản phẩm.");
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
                defaultValue={productData?.sku}
                label="SKU (mã sản phẩm, để trống nếu chưa cần)"
                register={register}
                errors={errors}
                id="sku"
              />
            </div>

            <div className="mb-6">
              <InputFormAdmin
                className="border p-2 w-full"
                defaultValue={productData?.price}
                label="Giá bán"
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
                defaultValue={productData?.originalPrice}
                label="Giá gốc trước giảm (bỏ trống nếu không khuyến mãi)"
                register={register}
                errors={errors}
                id="originalPrice"
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
              <label className="block mb-2 text-gray-700">Hình ảnh đại diện</label>
              <div className="w-full h86 flex items-center justify-center border rounded-lg overflow-hidden bg-gray-50">
                <img
                  src={previewProductImage || product_default}
                  alt={productData?.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-gray-700">Ảnh phụ (gallery)</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {galleryImages.map((img) => (
                  <div key={img.id} className="relative w-20 h-20 border rounded-lg overflow-hidden">
                    <img src={resolveImageUrl(img.imageUrl)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(img.id)}
                      className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <label className="cursor-pointer">
                <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition">
                  {isUploadingGallery ? "Đang tải..." : "+ Thêm ảnh phụ"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddGalleryImage}
                  disabled={isUploadingGallery}
                  className="hidden"
                />
              </label>
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
