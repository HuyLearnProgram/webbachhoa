import axiosInstance from "@/utils/axios";

export const apiRegister = async (data) =>
    axiosInstance({
        url: "/auth/register",
        method: "post",
        data,
        withCredentials: true
    });

export const apiLogin = async (data) =>
    axiosInstance({
        url: "/auth/login",
        method: "post",
        data,
        withCredentials: true
    });

export const apiLoginGoogle = async (idToken) => {
    return axiosInstance({
        url: "/auth/signin/google", 
        method: "post",
        data: { idToken },
        withCredentials: true
    });
};


export const apiGetCurrentUser = async () =>
    axiosInstance({
        url: "/auth/account",
        method: 'get',
    });

export const apiForgotPassword = async (data) =>
    axiosInstance({
        url: "/auth/forgot",
        method: 'post',
        data
    });

export const apiResetPassword = async (newPassword, token) =>
    axiosInstance({
        url: "/auth/reset-password",
        method: 'put',
        params: {
            token: token
        }, data: {
            newPassword: newPassword
        }
    });

export const apiValidateToken = async (token) =>
    axiosInstance({
        url: "/auth/validate-token",
        method: 'get',
        params: {
            token: token
        }
    });

export const apiLogout = async () =>
    axiosInstance({
        url: "/auth/logout",
        method: 'post',
        withCredentials: true,
    });


export const apiGetAllUser = async (params) =>
    axiosInstance({
        url: "/users",
        method: "get",
        params,
    });

export const apiUpdateCurrentUser = async (formData) =>
    axiosInstance({
        url: "/auth/account",
        method: 'put',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });

export const getUserById = async (id) => {
    return axiosInstance({
        url: `/users/${id}`,
        method: 'get',
    });
}
export const apiAddOrUpdateCart = async (pid, quantity) => {
    return axiosInstance({
        url: '/cart',
        method: 'post',
        data: {
            id: {
                productId: pid
            },
            quantity: quantity
        }
    })
}

export const apiDeleteCart = async (pid) => {
    return axiosInstance({
        url: `/cart/${pid}`,
        method: 'delete'
    })
}

export const apiGetCart = async (page, size) => {
    return axiosInstance({
        url: '/cart',
        method: 'get',
        params: { page, size }
    })
}

export const apiDeleteWishlist = async (pid) => {
    return axiosInstance({
        url: `/wishlist`,
        method: 'delete',
        params: {
            pid
        }
    })
}

export const apiGetWishlist = async (page, size) => {
    return axiosInstance({
        url: '/wishlist',
        method: 'get',
        params: { page, size }
    })
}

export const apiAddWishList = async (pid) => {
    return axiosInstance({
        url: '/wishlist',
        method: 'post',
        data: {
            id: {
                productId: pid
            }
        }
    })
}

export const apiSetStatusUser = async (user) => {
    return axiosInstance({
        url: "/users",
        method: 'put',
        data: user
    });
};
// Tạo order
export const apiCreateOrder = async (formData) => {
    return axiosInstance({
        url: `/checkout`,
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}
// Lấy các sản phẩm được chọn trong cart
export const apiGetSelectedCart = async (pids) => {
    return axiosInstance({
        url: `cart/product-selected?productIds=${pids?.join(',')}`,
        method: 'get',
    });
};
export const apiSendEmail = async (formData) => {
    return axiosInstance({
        url: `checkout/email`,
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}
export const apiPaymentVNPay = async (params) =>
    axiosInstance({
        url: `payment/vn-pay`,
        method: 'get',
        params,
    })