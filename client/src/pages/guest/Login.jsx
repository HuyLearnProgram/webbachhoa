import React, { useCallback, useState } from "react";
import { InputField, Button, ForgotPassword } from "@/components";
import Swal from 'sweetalert2';
import { apiLogin, apiRegister, apiLoginGoogle } from "@/apis";
import { useNavigate, Link } from "react-router-dom";
import path from "@/utils/path";
import { login } from '@/store/user/userSlice';
import { useDispatch } from "react-redux";
import { useForm } from 'react-hook-form';
import { ClipLoader } from "react-spinners";
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [payload, setPayload] = useState({
    email: "",
    password: "",
    name: ""
  });

  const [isRegister, setisRegister] = useState(false);
  const [isForgotPass, setIsForgotPass] = useState(false);
  const { register: formRegister, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(async () => {
    setLoading(true);
    const { name, ...data } = payload;
    if (isRegister) {
      const res = await apiRegister(payload);
      setLoading(false);
      if (res.statusCode === 201) {
        Swal.fire('Congratulation', "Đăng ký thành công", 'success').then(() => {
          setisRegister(false);
        });
      } else {
        Swal.fire('Oops!', res.message, 'error');
      }
    } else {
      const result = await apiLogin(data);
      setLoading(false);
      if (result.statusCode === 200) {
        dispatch(login({ isLoggedIn: true, token: result.data.access_token, userData: result.data.user }));
        setTimeout(() => {
          navigate(`/${path.HOME}`);
        }, 1000);
      } else {
        Swal.fire('Oops!', result.message, 'error');
      }
    }
  }, [payload, isRegister, dispatch, navigate]);

  // const responseGoogle = async (response) => {
  //   const { credential } = response;
  //   if (credential) {
  //     const result = await apiLoginGoogle(credential);
  //     if (result.statusCode === 200) {
  //       dispatch(login({ isLoggedIn: true, token: result.data.access_token, userData: result.data.user }));
  //       navigate(`/${path.HOME}`);
  //     } else {
  //       Swal.fire('Oops!', result.message, 'error');
  //     }
  //   }
  // };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-r from-green-300 to-blue-300 relative">
      {isForgotPass && <ForgotPassword onClose={() => setIsForgotPass(false)} />}
      <div className="relative bg-white shadow-lg rounded-lg p-10 w-[90%] md:w-[500px] space-y-6">
        <h1 className="text-3xl font-semibold text-main text-center">
          {isRegister ? "Đăng ký" : "Đăng nhập"}
        </h1>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-lg z-10">
            <ClipLoader size={35} color={"#123abc"} loading={loading} />
          </div>
        )}

        <>
          {isRegister && (
            <InputField
              value={payload.name}
              setValue={setPayload}
              nameKey="name"
              register={formRegister}
              errors={errors}
              validationRules={{
                required: 'Tên không được bỏ trống',
                pattern: {
                  value: /^[a-zA-ZÀ-ỹ\s]+$/,
                  message: 'Tên chỉ được chứa các ký tự chữ cái và khoảng trắng'
                }
              }}
              // Disable input during loading
              disabled={loading} 
            />
          )}
          <InputField
            value={payload.email}
            setValue={setPayload}
            nameKey="email"
            register={formRegister}
            errors={errors}
            validationRules={{
              required: 'Email không được để trống',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Vui lòng nhập email hợp lệ'
              }
            }}
            disabled={loading}
          />
          <InputField
            type="password"
            value={payload.password}
            setValue={setPayload}
            nameKey="password"
            register={formRegister}
            errors={errors}
            validationRules={{
              required: 'Vui lòng nhập mật khẩu',
              minLength: {
                value: 6,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
              },
              maxLength: {
                value: 50,
                message: 'Mật khẩu tối đa 50 ký tự'
              }
            }}
            disabled={loading}
          />
          <Button
            fw={true}
            handleOnClick={handleSubmit(onSubmit)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md mt-4"
            disabled={loading}
          >
            {isRegister ? "Đăng ký" : "Đăng nhập"}
          </Button>

          {/* {!isRegister && (
            <GoogleLogin
              onSuccess={responseGoogle}
              onFailure={(response) => console.log(response)}
              className="mt-4 w-full"
            />
          )} */}

          <div className="flex items-center justify-between my-4 text-sm text-gray-700">
            {!isRegister && (
              <>
                <span onClick={() => setIsForgotPass(true)} className="hover:text-blue-600 cursor-pointer">
                  Quên mật khẩu?
                </span>
                <span onClick={() => setisRegister(true)} className="hover:text-blue-600 cursor-pointer">
                  Tạo tài khoản
                </span>
              </>
            )}
            {isRegister && (
              <span onClick={() => setisRegister(false)} className="w-full text-center hover:text-blue-600 cursor-pointer">
                Đăng nhập
              </span>
            )}
          </div>
          <div className="flex justify-center text-sm">
            <Link to={`/${path.HOME}`} className="text-gray-700 hover:text-blue-600 cursor-pointer">
              Về trang chủ
            </Link>
          </div>
        </>
      </div>
    </div>
  );
};

export default Login;
