import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Image } from "antd";
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
      unit: data?.unit || null,
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
      <div className="flex justify-center items-center min-h-screen py-8">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl">
          <form
            onSubmit={handleSubmit(handleCreateProduct)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
              <InputFormAdmin
                className="border p-2 w-full"
                label="Tên sản phẩm"
                register={register}
                errors={errors}
                id="productName"
                validate={{ required: "Cần điền thông tin vào trường này" }}
              />

              <InputFormAdmin
                className="border p-2 w-full"
                label="SKU"
                placeholder="Để trống nếu chưa cần"
                register={register}
                errors={errors}
                id="sku"
              />

              <div className="flex flex-col h-[78px] gap-2">
                <label>Phân loại</label>
                <CategoryComboBox
                  onSelectCategory={(value) => {
                    setSelectedCategory(value);
                  }}
                />
              </div>

              <InputFormAdmin
                className="border p-2 w-full"
                label="Giá bán"
                register={register}
                errors={errors}
                id="price"
                validate={{ required: "Cần điền thông tin vào trường này" }}
                type="number"
              />

              <InputFormAdmin
                className="border p-2 w-full"
                label="Giá gốc (khuyến mãi)"
                placeholder="Bỏ trống nếu không khuyến mãi"
                register={register}
                errors={errors}
                id="originalPrice"
                type="number"
              />

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

              <InputFormAdmin
                className="border p-2 w-full"
                label="Đơn vị tính"
                placeholder="kg, hộp, gói..."
                register={register}
                errors={errors}
                id="unit"
              />
            </div>

            <div>
              <label htmlFor="description" className="block mb-2 text-gray-700">
                Mô tả
              </label>
              <textarea
                id="description"
                {...register("description", {
                  required: "Cần điền thông tin vào trường này",
                })}
                className="border p-2 w-full h-32 rounded-lg"
              />
            </div>

            <Image.PreviewGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-gray-700">Hình ảnh đại diện</label>
                <div className="w-full h-40 flex items-center justify-center border rounded-lg overflow-hidden bg-gray-50">
                  <Image
                    src={previewProductImage || product_default}
                    alt="Product"
                    className="max-h-full max-w-full object-contain"
                    preview={!!previewProductImage}
                  />
                </div>
                <label className="cursor-pointer block mt-2">
                  <span className="inline-block text-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition w-full">
                    Chọn ảnh
                  </span>
                  <input
                    type="file"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block mb-2 text-gray-700">Ảnh phụ (gallery, có thể chọn nhiều)</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {galleryImages.map((img, index) => (
                    <div key={index} className="relative w-20 h-20 border rounded-lg overflow-hidden">
                      <Image src={img.preview} width={80} height={80} className="object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(index)}
                        className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center z-10"
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
            </div>
            </Image.PreviewGroup>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-10 py-2 rounded-md"
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

export default AddProduct;
