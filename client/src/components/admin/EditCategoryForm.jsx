import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Image } from "antd";
import InputFormAdmin from "./InputFormAdmin";
import { apiUploadImage, apiUpdateCategory } from "@/apis";
import category_default from "@/assets/category_default.png";
import { toast } from 'react-toastify';

const resolveImageUrl = (imageUrl) =>
  imageUrl && imageUrl.startsWith('https')
    ? imageUrl
    : (imageUrl ? `${import.meta.env.VITE_BACKEND_TARGET}/storage/category/${imageUrl}` : category_default);

function EditCategoryForm({ initialCategoryData }) {
  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm();

  const [categoryImage, setCategoryImage] = useState(null);
  const [previewCategoryImage, setPreviewCategoryImage] = useState(
    resolveImageUrl(initialCategoryData?.imageUrl)
  );

  useEffect(() => {
    setPreviewCategoryImage(resolveImageUrl(initialCategoryData?.imageUrl));
    reset(initialCategoryData);
    setCategoryImage(null);
  }, [initialCategoryData, reset]);

  const handleUpdateCategory = async (data) => {
    const categoryToUpdate = {
      id: initialCategoryData.id,
      name: data.name,
      imageUrl: initialCategoryData?.imageUrl,
    };
    try {
      if (categoryImage) {
        const resUpload = await apiUploadImage(categoryImage, "category");
        categoryToUpdate.imageUrl = resUpload?.data?.fileName || initialCategoryData?.imageUrl;
      }
      const resUpdate = await apiUpdateCategory(categoryToUpdate);
      if (resUpdate.statusCode === 400) {
        throw new Error(resUpdate.message || "Có lỗi xảy ra khi sửa danh mục.");
      }
      toast.success("Sửa phân loại thành công!");
      reset(data);
      setCategoryImage(null);
    } catch (err) {
      toast.error("Có lỗi xảy ra: " + err.message);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewCategoryImage(reader.result);
      };
      reader.readAsDataURL(file);
      setCategoryImage(file);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-center items-center min-h-screen py-8">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl">
          <form onSubmit={handleSubmit(handleUpdateCategory)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
              <InputFormAdmin
                disabled={true}
                className="border p-2 w-full"
                defaultValue={initialCategoryData?.id}
                label="Id phân loại"
                register={register}
                errors={errors}
                id="id"
              />

              <InputFormAdmin
                className="border p-2 w-full"
                defaultValue={initialCategoryData?.name}
                label="Tên phân loại"
                register={register}
                errors={errors}
                id="name"
                validate={{ required: "Cần điền thông tin vào trường này" }}
              />
            </div>

            <Image.PreviewGroup>
              <div>
                <label className="block mb-2 text-gray-700">Hình ảnh</label>
                <div className="w-full h-40 flex items-center justify-center border rounded-lg overflow-hidden bg-gray-50">
                  <Image
                    src={previewCategoryImage}
                    alt={initialCategoryData?.name}
                    className="max-h-full max-w-full object-contain"
                    preview={!!previewCategoryImage}
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
}

export default EditCategoryForm;
