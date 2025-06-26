import axiosInstance from "@/utils/axios";
export const apiGetCategory = async (cid) =>
    axiosInstance({
        url: `/categories/${cid}`,
        method: "get",
    });

export const apiDeleteCategory = async (cid) =>
    axiosInstance({
        url: `/categories/${cid}`,
        method:"delete",
    });


export const apiCreateCategory = async(category)=>{
    const res = await axiosInstance({
        url : `/categories`,
        method:'post',
        data:category,
    })
    return res
}

export const apiUpdateCategory = async(category)=>{
    const res = await axiosInstance({
        url : `/categories`,
        method:'put',
        data:category,
    })
    return res
}
