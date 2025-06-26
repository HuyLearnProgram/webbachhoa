import React, { useEffect, useState } from 'react';
import { Button } from '@/components';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiResetPassword, apiValidateToken } from '@/apis';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import path from '@/utils/path';

const ResetPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    const [validToken, setValidToken] = useState(null);
    const [isCheckingToken, setIsCheckingToken] = useState(true);

    const checkToken = async (token) => {
        try {
            const check = await apiValidateToken(token);
            setValidToken(check.data?.valid);
        } catch (error) {
            setValidToken(false);
        } finally {
            setIsCheckingToken(false);
        }
    };

    useEffect(() => {
        if (token) {
            checkToken(token);
        } else {
            setIsCheckingToken(false);
        }
    }, [location.search, token]);

    useEffect(() => {
        if (!isCheckingToken && validToken === false) {
            toast.error("Token không hợp lệ hoặc đã hết hạn. Quay về trang chủ sau 3 giây...");
            setTimeout(() => {
                navigate(`/${path.HOME}`);
            }, 3000);
        }
    }, [isCheckingToken, validToken, navigate]);

    const { register, handleSubmit, formState: { errors }, watch } = useForm();
    const newPassword = watch("password");

    const handleResetPassword = async (data) => {
        const response = await apiResetPassword(data.password, token);
        if (response.statusCode !== 200) {
            toast.info("Có lỗi xảy ra, hãy thử lại sau");
            navigate(`/${path.LOGIN}`);
        } else {
            toast.success("Đổi mật khẩu thành công");
            navigate(`/${path.LOGIN}`);
        }
    };

    if (isCheckingToken) {
        return <div className="absolute animate-fade-in top-0 left-0 bottom-0 right-0 bg-overlay flex flex-col items-center justify-center py-8 z-50"><p>Đang kiểm tra token...</p></div>;
    }

    return (
        <div className="absolute animate-fade-in top-0 left-0 bottom-0 right-0 bg-overlay flex flex-col items-center justify-center py-8 z-50">
            {validToken ? (
                <div className="p-6 bg-white rounded-md shadow-lg w-full max-w-lg">
                    <h2 className="text-2xl font-semibold text-center mb-4">Đặt lại mật khẩu</h2>
                    <form onSubmit={handleSubmit(handleResetPassword)} className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="password" className="block text-gray-700 font-semibold">Mật khẩu mới</label>
                            <input
                                type="password"
                                id="password"
                                className="w-full p-3 border rounded mt-1 focus:ring-2 focus:ring-blue-500"
                                {...register("password", {
                                    required: 'Vui lòng nhập mật khẩu',
                                    minLength: {
                                        value: 6,
                                        message: 'Mật khẩu phải có ít nhất 6 ký tự',
                                    },
                                    maxLength: {
                                        value: 50,
                                        message: 'Mật khẩu không được quá 50 ký tự',
                                    },
                                })}
                            />
                            {errors.password && <span className="text-red-500 text-sm">{errors.password.message}</span>}
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-gray-700 font-semibold">Xác nhận mật khẩu</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                className="w-full p-3 border rounded mt-1 focus:ring-2 focus:ring-blue-500"
                                {...register("confirmPassword", {
                                    required: 'Vui lòng xác nhận mật khẩu',
                                    validate: value => value === newPassword || 'Mật khẩu không khớp',
                                })}
                            />
                            {errors.confirmPassword && <span className="text-red-500 text-sm">{errors.confirmPassword.message}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-4 mt-4">
                            <span
                                className="text-gray-700 hover:text-blue-700 hover:underline cursor-pointer"
                                onClick={() => navigate(`/${path.HOME}`)}
                            >
                                Hủy bỏ
                            </span>
                            <Button type="submit">Xác nhận</Button>
                        </div>
                    </form>
                </div>
            ) : (
                <p>Token không hợp lệ hoặc đã hết hạn.</p>
            )}
        </div>
    );
};

export default ResetPassword;
