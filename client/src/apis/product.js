import axiosInstance from "@/utils/axios";
export const apiGetProducts = async (params) =>
    axiosInstance({
        url: "/products",
        method: "get",
        params,
        paramsSerializer: {
            encode: (value) => value,
            serialize: (params) => {
                return Object.entries(params)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('&');
            }
        }
    });

export const apiSearchProducts = async (params) =>
    axiosInstance({
        url: "/products/search",
        method: "get",
        params,
        paramsSerializer: {
            encode: (value) => value,
            serialize: (params) => {
                return Object.entries(params)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('&');
            }
        }
    });

export const apiGetProduct = async (pid) =>
    axiosInstance({
        url: `/products/${pid}`,
        method: "get",
    });

export const apiGetRecommendedProducts = async (pid) =>
    axiosInstanceRecommended({
        url: `/similar-products/${pid}`,
        method: 'get',
    });

// Ẩn/hiện 1 hoặc nhiều sản phẩm (thay cho xoá cứng)
export const apiBulkUpdateProductActive = async (ids, active) =>
    axiosInstance({
        url: `/products/bulk-active`,
        method: 'put',
        data: { ids, active },
    });

// Ảnh phụ (gallery)
export const apiAddProductImage = async (pid, imageUrl) =>
    axiosInstance({
        url: `/products/${pid}/images`,
        method: 'post',
        data: { imageUrl },
    });

export const apiRemoveProductImage = async (pid, imageId) =>
    axiosInstance({
        url: `/products/${pid}/images/${imageId}`,
        method: 'delete',
    });

// Import/export Excel
export const apiExportProducts = async () =>
    axiosInstance({
        url: `/products/export`,
        method: 'get',
        responseType: 'blob',
    });

export const apiGetImportTemplate = async () =>
    axiosInstance({
        url: `/products/import-template`,
        method: 'get',
        responseType: 'blob',
    });

export const apiImportProducts = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance({
        url: `/products/import`,
        method: 'post',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

    
export const apiRatings = async (data) =>
    axiosInstance({
        url: `/product/ratings`,
        method: "put",
        data
    });

export const apiGetRatingsPage = async (pid, params) =>
    axiosInstance({
        url: `/product/ratings/${pid}`,
        method: "get",
        params,
    });

export const apiGetMaxPrice = async (category, productName) =>
    axiosInstance({
        url: `/products/max-price`,
        method: "get",
        params: { category, productName },
    });

export const apiCreateProduct = async(product)=>{
    const res = await axiosInstance({
        url : `/products`,
        method:'post',
        data:product,
    })
    return res;
}

export const apiUpdateProduct2 = async(product)=>{
    const res = await axiosInstance({
        url : `/products`,
        method:'put',
        data:product,
    })
    return res
}

// Lấy danh sách orders
export const apiGetOrders = async (params) =>
    axiosInstance({
        url: `/orders`,
        method: "get",
        params
    });
        
// Cập nhật số lượng sản phẩm
export const apiUpdateProduct = async (pid, params) => 
    axiosInstance({
        url: `/products/quantity/${pid}`,
        method: 'put',
        params,
    });
export const apiGetAllRatingsPage = async (params) => 
    axiosInstance({
        url: `/product/ratings`,
        method: "get",
        params
    });
export const apiGetFeedbacksByUser = async (userId) =>
    axiosInstance({
        url: `/users/${userId}/feedbacks`,
        method: "get",
    });

export const apiHideRating = async (id)=>
    axiosInstance({
        url: `ratings/${id}`,
        method: "put",
    })

export const apiCancelOrder = async (id,params)=>
    axiosInstance({
        url: `updateOrderStatus/${id}`,
        method: "get",
        params,
    })

export const apiFetchRecommendProductById = async(id) => 
    axiosInstance({
        url: `products/similar/${id}`,
        method: "get",
    })
