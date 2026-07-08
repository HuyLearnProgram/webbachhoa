import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Image } from "antd";
import InputFormAdmin from "./InputFormAdmin";
import CategoryComboBox from "./CategoryComboBox";
import { apiUploadImage, apiUpdateProduct2, apiAddProductImage, apiRemoveProductImage } from "@/apis";
import product_default from "@/assets/product_default.png";
import { toast } from 'react-toastify';
import { promotionTypeOptions, PROMOTION_TYPES } from "@/utils/constants";

const resolveImageUrl = (imageUrl) =>
  imageUrl && imageUrl.startsWith('https')
    ? imageUrl
    : (imageUrl ? `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${imageUrl}` : product_default);

const EditProductForm = ({ initialProductData, onUpdated }) => {
  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm();

  const [productData, setProductData] = useState(initialProductData);
  const [selectedCategory, setSelectedCategory] = useState(initialProductData?.category || null);
  const [productImage, setProductImage] = useState(null)
  const [galleryImages, setGalleryImages] = useState(initialProductData?.images || []);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [promotionType, setPromotionType] = useState(initialProductData?.promotionType || PROMOTION_TYPES.NONE);

  const [previewProductImage, setPreviewProductImage] = useState(
    resolveImageUrl(initialProductData?.imageUrl)
  );

  useEffect(() => {
    setProductData(initialProductData);
    setPreviewProductImage(resolveImageUrl(initialProductData?.imageUrl));
    // Reset form values with the updated initialProductData
    reset(initialProductData);
    setGalleryImages(initialProductData?.images || []);
    setSelectedCategory(initialProductData?.category || null);
    setPromotionType(initialProductData?.promotionType || PROMOTION_TYPES.NONE);
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


  const handleUpdateProduct = async (data) => {
    if (!selectedCategory?.id) {
      toast.error("Vui lòng chọn phân loại cho sản phẩm");
      return;
    }
    if (promotionType === PROMOTION_TYPES.PRICE_DISCOUNT
      && (!data?.originalPrice || Number(data.originalPrice) <= Number(data.price))) {
      toast.error("Giá gốc phải lớn hơn giá bán (chỉ điền khi có khuyến mãi)");
      return;
    }
    if (promotionType === PROMOTION_TYPES.BUY_X_GET_Y
      && (!data?.promoBuyQuantity || Number(data.promoBuyQuantity) < 1
        || !data?.promoFreeQuantity || Number(data.promoFreeQuantity) < 1)) {
      toast.error("Khuyến mãi 'Mua X tặng Y' cần số lượng mua và số lượng tặng đều >= 1");
      return;
    }
    if (promotionType === PROMOTION_TYPES.BUNDLE_PRICE
      && (!data?.promoBundleQuantity || Number(data.promoBundleQuantity) < 2
        || !data?.promoBundlePrice || Number(data.promoBundlePrice) <= 0
        || Number(data.promoBundlePrice) >= Number(data.price) * Number(data.promoBundleQuantity))) {
      toast.error("Khuyến mãi 'Mua N sản phẩm giá cố định' cần số lượng >= 2 và giá gói phải rẻ hơn mua lẻ");
      return;
    }
    if (promotionType !== PROMOTION_TYPES.NONE
      && data?.promotionDurationDays && Number(data.promotionDurationDays) < 1) {
      toast.error("Số ngày hiệu lực khuyến mãi phải lớn hơn 0");
      return;
    }
    const productToUpdate = {
      id: initialProductData?.id,
      productName: data?.productName,
      sku: data?.sku || null,
      price: data?.price,
      promotionType,
      originalPrice: promotionType === PROMOTION_TYPES.PRICE_DISCOUNT && data?.originalPrice
        ? Number(data.originalPrice) : null,
      promoBuyQuantity: promotionType === PROMOTION_TYPES.BUY_X_GET_Y && data?.promoBuyQuantity
        ? Number(data.promoBuyQuantity) : null,
      promoFreeQuantity: promotionType === PROMOTION_TYPES.BUY_X_GET_Y && data?.promoFreeQuantity
        ? Number(data.promoFreeQuantity) : null,
      promoBundleQuantity: promotionType === PROMOTION_TYPES.BUNDLE_PRICE && data?.promoBundleQuantity
        ? Number(data.promoBundleQuantity) : null,
      promoBundlePrice: promotionType === PROMOTION_TYPES.BUNDLE_PRICE && data?.promoBundlePrice
        ? Number(data.promoBundlePrice) : null,
      promotionDurationDays: promotionType !== PROMOTION_TYPES.NONE && data?.promotionDurationDays
        ? Number(data.promotionDurationDays) : null,
      unit: data?.unit || null,
      imageUrl: initialProductData?.imageUrl,
      quantity: data?.quantity,
      description: data?.description,
      category: { id: selectedCategory.id }
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
      onUpdated?.();
    } catch (err) {
      toast.error("Có lỗi xảy ra: " + err.message);
    }
  }
  return (
    <div className="w-full">
      <div className="flex justify-center items-center min-h-screen py-8">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl">
          <form onSubmit={handleSubmit(handleUpdateProduct)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
              <InputFormAdmin
                disabled={true}
                className="border p-2 w-full"
                defaultValue={productData?.id}
                label="Id sản phẩm"
                register={register}
                errors={errors}
                id="id"
              />
              <InputFormAdmin
                className="border p-2 w-full"
                defaultValue={productData?.product_name || productData?.productName}
                label="Tên sản phẩm"
                register={register}
                errors={errors}
                id="productName"
                validate={{ required: "Cần điền thông tin vào trường này" }}
              />

              <InputFormAdmin
                className="border p-2 w-full"
                defaultValue={productData?.sku}
                label="SKU"
                placeholder="Để trống nếu chưa cần"
                register={register}
                errors={errors}
                id="sku"
              />

              <div className="flex flex-col h-[78px] gap-2">
                <label>Phân loại</label>
                <CategoryComboBox
                  initialCategoryId={selectedCategory?.id}
                  onSelectCategory={(value) => setSelectedCategory(value)}
                />
              </div>

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

              <div className="flex flex-col h-[78px] gap-2">
                <label>Loại khuyến mãi</label>
                <select
                  className="border p-2 w-full rounded-lg"
                  value={promotionType}
                  onChange={(e) => setPromotionType(e.target.value)}
                >
                  {promotionTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {productData?.promotionExpiresAt && (
                  <span className="text-xs text-gray-400">
                    Đang áp dụng, tự hết hạn lúc {new Date(productData.promotionExpiresAt).toLocaleString("vi-VN")}
                  </span>
                )}
              </div>

              {promotionType === PROMOTION_TYPES.PRICE_DISCOUNT && (
                <InputFormAdmin
                  className="border p-2 w-full"
                  defaultValue={productData?.originalPrice}
                  label="Giá gốc"
                  placeholder="Giá trước khi giảm"
                  register={register}
                  errors={errors}
                  id="originalPrice"
                  type="number"
                />
              )}

              {promotionType === PROMOTION_TYPES.BUY_X_GET_Y && (
                <>
                  <InputFormAdmin
                    className="border p-2 w-full"
                    defaultValue={productData?.promoBuyQuantity}
                    label="Mua số lượng (X)"
                    register={register}
                    errors={errors}
                    id="promoBuyQuantity"
                    type="number"
                  />
                  <InputFormAdmin
                    className="border p-2 w-full"
                    defaultValue={productData?.promoFreeQuantity}
                    label="Tặng số lượng (Y)"
                    register={register}
                    errors={errors}
                    id="promoFreeQuantity"
                    type="number"
                  />
                </>
              )}

              {promotionType === PROMOTION_TYPES.BUNDLE_PRICE && (
                <>
                  <InputFormAdmin
                    className="border p-2 w-full"
                    defaultValue={productData?.promoBundleQuantity}
                    label="Số lượng theo gói (N)"
                    register={register}
                    errors={errors}
                    id="promoBundleQuantity"
                    type="number"
                  />
                  <InputFormAdmin
                    className="border p-2 w-full"
                    defaultValue={productData?.promoBundlePrice}
                    label="Giá trọn gói"
                    register={register}
                    errors={errors}
                    id="promoBundlePrice"
                    type="number"
                  />
                </>
              )}

              {promotionType !== PROMOTION_TYPES.NONE && (
                <InputFormAdmin
                  className="border p-2 w-full"
                  label="Số ngày hiệu lực"
                  placeholder="Để trống = không giới hạn"
                  register={register}
                  errors={errors}
                  id="promotionDurationDays"
                  type="number"
                />
              )}

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

              <InputFormAdmin
                className="border p-2 w-full"
                defaultValue={productData?.unit}
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
                {...register("description", { required: "Cần điền thông tin vào trường này" })}
                className="border p-2 w-full h-32 rounded-lg"
                defaultValue={productData?.description}
              />
            </div>

            <Image.PreviewGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-gray-700">Hình ảnh đại diện</label>
                  <div className="w-full h-40 flex items-center justify-center border rounded-lg overflow-hidden bg-gray-50">
                    <Image
                      src={previewProductImage || product_default}
                      alt={productData?.name}
                      className="max-h-full max-w-full object-contain"
                      preview={!!previewProductImage}
                    />
                  </div>
                  <label className="cursor-pointer block mt-2">
                    <span className="inline-block text-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition w-full">
                      Chọn ảnh khác
                    </span>
                    <input type="file" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="block mb-2 text-gray-700">Ảnh phụ (gallery)</label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {galleryImages.map((img) => (
                      <div key={img.id} className="relative w-20 h-20 border rounded-lg overflow-hidden">
                        <Image
                          src={resolveImageUrl(img.imageUrl)}
                          width={80}
                          height={80}
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(img.id)}
                          className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center z-10"
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

export default EditProductForm;
