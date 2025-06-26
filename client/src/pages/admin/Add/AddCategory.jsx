import { TurnBackHeader } from '@/components/admin'
import InputFormAdmin from '@/components/admin/InputFormAdmin';
import category_default from "./../../../assets/category_default.png";
import React, { useState } from 'react'
import { useForm } from "react-hook-form";
import { apiCreateCategory ,apiUploadImage ,apiUpdateCategory} from '@/apis';
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

    const handleCreateCategory = async(data)=>{
        const categoryToCreate ={
            name:data?.name,
        }
        try {
            const resCheck = await apiCreateCategory(categoryToCreate)
            console.log(resCheck?.data?.id)
            if (resCheck.statusCode === 400) {
              throw new Error(resCheck.message || "Có lỗi xảy ra khi tạo danh mục.");
          }
            const resUpload = await apiUploadImage(categoryImage,"category")
            categoryToCreate.id = resCheck.data.id;
            categoryToCreate.imageUrl = resUpload?.data?.fileName;

            const response = await apiUpdateCategory(categoryToCreate);

            // await new Promise(resolve => setTimeout(resolve, 6000));
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
          // setCategoryImageName(file.name);
        }
      };

    return (
        <div className='w-full'>
            <div>
                <TurnBackHeader turnBackPage="/admin/category" header="Quay về trang phân loại" />
            </div>
            <div>
            <div className="flex justify-center items-center min-h-screen">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <form onSubmit={handleSubmit(handleCreateCategory)} className="space-y-4">
          <div>
            <InputFormAdmin
              className="border p-2 w-full"
              label="Tên phân loại"
              register={register}
              errors={errors}
              id="name"
              validate={{ required: "Cần điền thông tin vào trường này" }}
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-gray-700">Hình ảnh</label>
            <div className="w-full h-48 flex items-center justify-center border rounded-lg overflow-hidden bg-gray-50">
              <img
                src={previewCategoryImage || category_default}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          {/* <button type="submit" className="bg-green-500 text-white p-2 w-full rounded-md">
            Lưu
          </button> */}
          <div className="flex justify-between mt-4">
            <label className="cursor-pointer" style={{ marginRight: '70px', flex: 1 }}>
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
              style={{ marginLeft: '70px', flex: 1 }}
            >
              Lưu
            </button>
          </div>
          
        </form>

        {/* <div className="mt-4">
          <label className="cursor-pointer">
            <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition">
              Chọn ảnh
            </span>
            <input
              type="file"
            //   accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div> */}

        {/* <form onSubmit={handleUrlSubmit} className="flex flex-col mt-4">
          <input
            type="text"
            placeholder="Nhập URL ảnh"
            value={imageUrl}
            onChange={handleUrlChange}
            className="border rounded-md p-2 mb-2"
          />
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 transition">
            Tải ảnh từ URL
          </button>
        </form> */}
      </div>
    </div>
            </div>
        </div>
    )
}

export default AddCategory