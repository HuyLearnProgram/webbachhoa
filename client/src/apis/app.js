import axiosInstance from "@/utils/axios";

// export const apiGetCategories = () =>
//     axiosInstance({
//         url: "/categories",
//         method: "get",
//     });

export const apiGetCategories = (params) =>
    axiosInstance({
        url: "/categories",
        method: "get",
        params
    });

export const apiUploadImage = async (image,folder)=>{
    // Tạo một đối tượng FormData
    const formData = new FormData();

    // Chỉ thêm file vào FormData nếu nó không rỗng
    if (image) {
        formData.append('file', image);
        formData.append('folder', folder);
    }
    if (image) {
        const res = await axiosInstance({
            url: `/files`,
            method: "post",
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data', // Thiết lập header cho multipart/form-data
            },
        });
        return res;
    }
}