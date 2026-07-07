import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { TurnBackHeader } from "@/components/admin";
import InputFormAdmin from "@/components/admin/InputFormAdmin";
import product_default from "./../../../assets/product_default.png";
import { CategoryComboBox } from "@/components/admin";
// import { apiCreateProduct } from '@/apis';
import { apiUploadImage, apiCreateProduct, apiAddProductImage } from "@/apis";
import { toast } from "react-toastify";
const AddProduct = () => {
  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [previewProductImage, setPreviewProductImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]); // [{ file, preview }]

  const handleCreateProduct = async (data) => {
    if (!selectedCategory?.id) {
      toast.error("Vui lòng chọn phân loại cho sản phẩm");
      return;
    }
    if (data?.originalPrice && Number(data.originalPrice) <= Number(data.price)) {
      toast.error("Giá gốc phải lớn hơn giá bán (chỉ điền khi có khuyến mãi)");
      return;
    }
    const productToCreate = {
      productName: data?.productName,
      sku: data?.sku || null,
      price: data?.price,
      originalPrice: data?.originalPrice ? Number(data.originalPrice) : null,
      quantity: data?.quantity,
      sold: 0,
      description: data?.description,
      category: { id: selectedCategory?.id },
    };
    try {
      const resUpLoad = await apiUploadImage(productImage, "product");
      productToCreate.imageUrl = resUpLoad?.data?.fileName || null;
      const resCreate = await apiCreateProduct(productToCreate);
      if (resCreate.statusCode === 400) {
        throw new Error(resCreate.message || "Có lỗi xảy ra khi tạo sản phẩm.");
      }
      const newProductId = resCreate?.data?.id;
      if (newProductId && galleryImages.length > 0) {
        for (const { file } of galleryImages) {
          try {
            const resGalleryUpload = await apiUploadImage(file, "product");
            const galleryUrl = resGalleryUpload?.data?.fileName;
            if (galleryUrl) await apiAddProductImage(newProductId, galleryUrl);
          } catch {
            toast.warn("Một số ảnh phụ tải lên thất bại, bạn có thể thêm lại ở trang Sửa sản phẩm.");
          }
        }
      }
      toast.success("Thêm sản phẩm thành công!");
      reset();
      setPreviewProductImage(null);
      setProductImage(null);
      setGalleryImages([]);
    } catch (err) {
      toast.error("Có lỗi xảy ra: " + err.message);
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
  };

  const handleGalleryImagesChange = (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryImages((prev) => [...prev, { file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  };

  const handleRemoveGalleryImage = (index) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
      <div>
        <TurnBackHeader
          turnBackPage="/admin/product"
          header="Quay về trang sản phẩm"
        />
      </div>
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-xl">
          <form
            onSubmit={handleSubmit(handleCreateProduct)}
            className="space-y-6"
          >
            <div className="mb-6">
              <InputFormAdmin
                className="border p-2 w-full"
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
                label="SKU (mã sản phẩm, để trống nếu chưa cần)"
                register={register}
                errors={errors}
                id="sku"
              />
            </div>

            <div className="mb-6">
              <InputFormAdmin
                className="border p-2 w-full"
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
                id="description"
                {...register("description", {
                  required: "Cần điền thông tin vào trường này",
                })}
                className="border p-2 w-full h-40"
              />
            </div>

            <div>
              Phân loại:
              <CategoryComboBox
                onSelectCategory={(value) => {
                  setSelectedCategory(value);
                }}
              />
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-gray-700">Hình ảnh đại diện</label>
              <div className="w-full h-86 flex items-center justify-center border rounded-lg overflow-hidden bg-gray-50">
                <img
                  src={previewProductImage || product_default}
                  alt="Product"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-gray-700">Ảnh phụ (gallery, có thể chọn nhiều)</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {galleryImages.map((img, index) => (
                  <div key={index} className="relative w-20 h-20 border rounded-lg overflow-hidden">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <label className="cursor-pointer">
                <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition">
                  + Thêm ảnh phụ
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleGalleryImagesChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mb-6">
              <div className="flex justify-between mt-4">
                <label
                  className="cursor-pointer"
                  style={{ marginRight: "70px", flex: 1 }}
                >
                  <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition w-full">
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
                  style={{ marginLeft: "70px", flex: 1 }}
                >
                  Lưu
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
