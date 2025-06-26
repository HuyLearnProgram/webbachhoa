import React, { useState } from "react";
import { useForm } from 'react-hook-form';
import { toast } from "react-toastify";
import { apiForgotPassword } from "@/apis";
import {Button} from '@/components/index'

const ForgotPassword = ({ onClose }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [email, setEmail] = useState('')
  const handleForgotPassword = async (data) => {
    const response = await apiForgotPassword({ email: data.email });
    //console.log(response)
    if (response.statusCode !== 200) {
      toast.info(response?.message);
    } else {
      toast.success("Vui lòng kiểm tra email");
      onClose();
    }
  };

  return (
    <div className="absolute animate-fade-in top-0 left-0 bottom-0 right-0 bg-overlay flex flex-col items-center justify-center py-8 z-50">
      <div className="flex flex-col gap-4">
        <label htmlFor="email">Nhập email của bạn</label>
        <input
          type="email"
          id="email"
          className="w-[800px] p-4 border-b outline-none rounded placeholder:text-sm"
          placeholder="youremail@email.com"
          onChange={e => setEmail(e.target.value)} 
          {...register("email", {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address'
            }
          })}
        />
        {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
        <div className="flex items-center justify-end w-full">
          <span
            className="w-full text-gray-700 hover:text-blue-700 hover:underline cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </span>
          <Button  fw={true} handleOnClick={handleSubmit(handleForgotPassword)}>Xác nhận</Button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
