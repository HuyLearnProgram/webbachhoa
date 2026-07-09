import { TurnBackHeader } from '@/components/admin'
import InputFormAdmin from '@/components/admin/InputFormAdmin';
import { Image } from 'antd';
import category_default from "@/assets/category_default.png";
import React, { useState } from 'react'
import { useForm } from "react-hook-form";
import { apiCreateCategory, apiUploadImage } from '@/apis';
import { toast } from 'react-toastify';

const AddCategory = () => {
    const [categoryImage, setCategoryImage] = useState(null);
    const [previewCategoryImage, setPreviewCategoryImage] = useState(null)
    const {
        register,
        formState: { errors },
        reset,
        handleSubmit,
    } = useForm();

    const handleCreateCategory = async (data) => {
        const categoryToCreate = {
            name: data?.name,
        };
        try {
            if (categoryImage) {
                const resUpload = await apiUploadImage(categoryImage, "category");
                categoryToCreate.imageUrl = resUpload?.data?.fileName || null;
            }
            const resCreate = await apiCreateCategory(categoryToCreate);
            if (resCreate.statusCode === 400) {
                throw new Error(resCreate.message || "Có lỗi xảy ra khi tạo danh mục.");
            }
            toast.success("Thêm phân loại thành công!");
            reset();
            setCategoryImage(null);
            setPreviewCategoryImage(null);
        } catch (err) {
            toast.error("Có lỗi xảy ra: " + err.message);
        }
    }

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
        <div className='w-full'>
            <div>
                <TurnBackHeader turnBackPage="/admin/category" header="Quay về trang phân loại" />
            </div>
            <div className="flex justify-center items-center min-h-screen py-8">
                <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl">
                    <form onSubmit={handleSubmit(handleCreateCategory)} className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
                            <InputFormAdmin
                                className="border p-2 w-full"
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
                                        src={previewCategoryImage || category_default}
                                        alt="Category"
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
    )
}

export default AddCategory
