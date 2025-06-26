import React, { useEffect, useState } from "react";
import { Button, InputForm } from "@/components";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import avatar from "@/assets/avatarDefault.png";
import { apiUpdateCurrentUser, getUserById } from "@/apis";
import { getCurrentUser } from "@/store/user/asyncActions";
import { toast } from "react-toastify";

const Personal = () => {
    const { handleSubmit, register, formState: { errors, isDirty }, reset, setValue } = useForm();
    const { current } = useSelector(state => state.user);
    const dispatch = useDispatch();
    const [user, setUser] = useState();
    const [avatar, setAvatar] = useState();

    const fetchUserByCurrentId = async () => {
        try {
            const response = await getUserById(current?.id);
            setUser(response.data);
            setAvatar(response?.data.avatarUrl);
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };

    useEffect(() => {
        fetchUserByCurrentId();
    }, [current]);

    useEffect(() => {
        if (user) {
            reset({
                name: user?.name,
                email: user?.email,
                avatarUrl: user?.avatarUrl,
                phone: user?.phone,
                address: user?.address,
            });
            setAvatar(user.avatarUrl);
        }
    }, [user, reset]);

    const handleUpdateInfor = async (data) => {
        const formData = new FormData();
        // console.log(data)
        // console.log(data.avatarUrl);
        if (avatar?.length > 0) formData.append('avatarUrl', data.avatarUrl);
        delete data.avatarUrl;
        for (let [key, value] of Object.entries(data)) {
            formData.append(key, value);
        }

        const response = await apiUpdateCurrentUser(formData);
        const delay = 2000;

        if (response.statusCode === 200) {
            toast.success(response.message, {
                hideProgressBar: false,
                autoClose: delay,
            });
            setTimeout(() => {
                dispatch(getCurrentUser());
            }, delay);
        } else {
            toast.error(response.message, {
                hideProgressBar: false,
                autoClose: delay,
            });
        }
    };

    return (
        <div className="w-full relative px-4">
            <header className="text-xl font-semibold py-4 border-b border-b-blue-200">
                Trang cá nhân
            </header>
            <form onSubmit={handleSubmit(handleUpdateInfor)} className="w-3/5 mx-auto py-8 flex flex-col gap-4">
                <InputForm
                    label='Tên'
                    register={register}
                    errors={errors}
                    id='name'
                    validate={{
                        required: 'Vui lòng điền thông tin',
                        minLength: {
                            value: 5,
                            message: 'Tên phải có ít nhất 5 ký tự',
                        },
                        maxLength: {
                            value: 100,
                            message: 'Tên không được vượt quá 100 ký tự',
                        },
                        pattern: {
                            value: /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯăẠ-ỹ\s,.-/]+$/,
                            message: 'Tên không được chứa số hay ký tự đặc biệt',
                        },
                    }}
                />
                <InputForm
                    label='Email'
                    register={register}
                    errors={errors}
                    id='email'
                    validate={{
                        required: 'Vui lòng điền thông tin',
                        pattern: {
                            value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.(com|net|org|edu|gov|mil|int|info|biz|co\.uk|ac\.uk|io|vn|com\.vn|net\.vn)$/,
                            message: "Địa chỉ email không hợp lệ",
                        },
                    }}
                />
                <InputForm
                    label='Địa chỉ'
                    register={register}
                    errors={errors}
                    id='address'
                    validate={{
                        required: 'Vui lòng điền thông tin',
                        minLength: {
                            value: 5,
                            message: 'Địa chỉ phải có ít nhất 5 ký tự',
                        },
                        pattern: {
                            value: /^[0-9a-zA-ZÀÁÂÃÈÉÊỀẾỆÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêềếệìíòóôõùúăđĩũơưạ-ỹ\s,.-/]+$/,
                            message: 'Địa chỉ không được chứa ký tự đặc biệt',
                        },
                    }}
                />
                <InputForm
                    label='Số điện thoại'
                    register={register}
                    errors={errors}
                    id='phone'
                    validate={{
                        required: 'Vui lòng điền thông tin',
                        pattern: {
                            value: /^0\d{9}$/, // Regex để kiểm tra số điện thoại bắt đầu bằng 0 và có 10 số
                            message: 'Số điện thoại không hợp lệ',
                        },
                    }}
                />

                <div className="flex items-center gap-2">
                    <span>Trạng thái tài khoản: </span>
                    <span>{user?.status === 0 ? "Block" : "Active"}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>Vai trò: </span>
                    <span>{current?.role === 1 ? "Admin" : "User"}</span>
                </div>

                <div className="flex flex-col gap-2">
                    <span className="font-medium">Ảnh đại diện:</span>
                    <label htmlFor="file" className="flex w-1/5">
                        <img src={ avatar || `https://res-console.cloudinary.com/du0adzgjs/media_explorer_thumbnails/9604c80eaaa49fb7d5590b186a3c12f1/detailed`} 
                         alt="avatar" className="w-20 h-20 ml-8 object-cover rounded-full" />
                    </label>
                    <input type="file" accept="image/*" id="file" {...register('avatarUrl')} hidden
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setAvatar(URL.createObjectURL(file));        // cập nhật ảnh xem trước
                              setValue('avatarUrl', file, { shouldDirty: true }); // báo cho react-hook-form biết field đã bị thay đổi
                            }
                          }}
                        />
                </div>

                {isDirty && <div className="w-full flex justify-end"><Button type="submit">Cập nhật thông tin</Button></div>}
            </form>
        </div>
    );
};

export default Personal;
    