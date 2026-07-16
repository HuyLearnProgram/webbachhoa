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

// Smart Search (Phase B): từ khoá q tiếng Việt CÓ DẤU bắt buộc đi JSON body (bug dấu query
// param toàn hệ thống); filter/page/size/sort chỉ chứa ASCII nên vẫn đi query param như cũ.
// Response: { meta, result, searchMode, requestId } — meta/result cùng shape PaginationDTO.
export const apiSmartSearch = async ({ q, sessionId, ...params }) =>
    axiosInstance({
        url: "/products/smart-search",
        method: "post",
        params,
        data: { q, sessionId },
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

// Gộp 3 số liệu Overview dashboard admin (tồn kho thấp/phân bố danh mục/phân bố khuyến mãi) —
// thay cho fan-out N+1 request trước đây (1 lowStock + N category + N promotionType song song).
export const apiGetProductStats = async (lowStockThreshold) =>
    axiosInstance({
        url: `/admin/product-stats`,
        method: "get",
        params: { lowStockThreshold },
    });

// Sản phẩm thuộc khung giờ Flash Sale (window: 1 hoặc 2) — không lọc theo giờ hiện tại, FE tự quyết
// định hiển thị "Đang diễn ra"/"Sắp diễn ra" dựa vào apiGetFlashSaleWindows()
export const apiGetFlashSaleProducts = async (window) =>
    axiosInstance({
        url: `/products/flash-sale`,
        method: "get",
        params: { window },
    });

// Cấu hình giờ bắt đầu/kết thúc của 2 khung Flash Sale (khớp application.properties phía backend)
export const apiGetFlashSaleWindows = async () =>
    axiosInstance({
        url: `/products/flash-sale-windows`,
        method: "get",
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

export const apiGetFeedbackStats = async () =>
    axiosInstance({
        url: `admin/feedback-stats`,
    })

export const apiCancelOrder = async (id,params)=>
    axiosInstance({
        url: `updateOrderStatus/${id}`,
        method: "put",
        params,
    })
// Gợi ý "sản phẩm tương tự" đã chuyển sang src/apis/recommendation.js (apiGetSimilarProducts)
