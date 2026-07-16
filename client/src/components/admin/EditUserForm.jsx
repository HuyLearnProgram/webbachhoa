import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { Modal, Radio, Input } from "antd";
import InputFormAdmin from "./InputFormAdmin";
import { apiUpdateUser } from "@/apis";
import avatarDefault from "@/assets/avatarDefault.png";
import { toast } from "react-toastify";
import { lockReasonOptions, OTHER_LOCK_REASON } from "@/utils/constants";
import { resolveImageUrl } from "@/utils/helper";

function EditUserForm({ initialUserData }) {
  const { current } = useSelector((state) => state.user);
  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm();

  const [pendingFormData, setPendingFormData] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState("");

  const avatarUrl = resolveImageUrl(initialUserData?.avatarUrl, "avatar", avatarDefault);

  const submitUpdate = async (data, lockReason) => {
    const userToUpdate = {
      id: initialUserData.id,
      name: data.name,
      phone: data.phone,
      address: data.address,
      status: Number(data.status),
      avatarUrl: initialUserData?.avatarUrl,
      lockReason,
    };
    try {
      const res = await apiUpdateUser(userToUpdate);
      if (res.statusCode !== 200) {
        throw new Error(res.message || "Có lỗi xảy ra khi sửa người dùng.");
      }
      toast.success("Sửa thông tin người dùng thành công!");
      reset(data);
    } catch (err) {
      toast.error("Có lỗi xảy ra: " + err.message);
    }
  };

  const handleUpdateUser = async (data) => {
    const isLockingNow = initialUserData?.status === 1 && Number(data.status) === 0;
    if (isLockingNow && initialUserData?.id === current?.id) {
      toast.warning("Bạn không thể tự khoá tài khoản của chính mình");
      return;
    }
    if (isLockingNow) {
      // Đang chuyển từ Active sang Lock trong lần lưu này -> bắt buộc hỏi lý do trước
      setSelectedReason(null);
      setCustomReason("");
      setPendingFormData(data);
      return;
    }
    await submitUpdate(data, null);
  };

  const closeLockModal = () => {
    setPendingFormData(null);
    setSelectedReason(null);
    setCustomReason("");
  };

  const handleConfirmLock = async () => {
    const finalReason = selectedReason === OTHER_LOCK_REASON ? customReason.trim() : selectedReason;
    if (!finalReason) {
      toast.warning("Vui lòng chọn hoặc nhập lý do khoá tài khoản");
      return;
    }
    await submitUpdate(pendingFormData, finalReason);
    closeLockModal();
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-2xl">
        <form onSubmit={handleSubmit(handleUpdateUser)} className="space-y-6">
          <div className="flex flex-col items-center gap-1">
            <img
              src={avatarUrl}
              alt={initialUserData?.name}
              className="w-28 h-28 rounded-full object-cover border"
            />
            <span className="text-gray-400 text-sm">ID: {initialUserData?.id}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InputFormAdmin
              className="border p-2 w-full"
              defaultValue={initialUserData?.name}
              label="Tên"
              register={register}
              errors={errors}
              id="name"
              validate={{ required: "Cần điền thông tin vào trường này" }}
            />
            <InputFormAdmin
              className="border p-2 w-full"
              defaultValue={initialUserData?.phone}
              label="Số điện thoại"
              register={register}
              errors={errors}
              id="phone"
            />
            <InputFormAdmin
              disabled={true}
              className="border p-2 w-full"
              defaultValue={initialUserData?.email}
              label="Email"
              register={register}
              errors={errors}
              id="email"
            />
            <InputFormAdmin
              className="border p-2 w-full"
              defaultValue={initialUserData?.address}
              label="Địa chỉ"
              register={register}
              errors={errors}
              id="address"
            />
          </div>

          <div className="flex flex-col gap-2 sm:w-1/2">
            <label htmlFor="status">Trạng thái</label>
            <select
              id="status"
              className="border rounded-lg p-2 w-full"
              defaultValue={initialUserData?.status}
              {...register("status")}
            >
              <option value={1}>Active</option>
              <option value={0}>Lock</option>
            </select>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-green-500 text-white p-2 rounded-md w-full sm:w-1/2"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>

      <Modal
        title={`Lý do khoá tài khoản ${initialUserData?.name || ""}`}
        open={!!pendingFormData}
        onOk={handleConfirmLock}
        onCancel={closeLockModal}
        okText="Xác nhận khoá"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <Radio.Group
          className="flex flex-col gap-2"
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
        >
          {lockReasonOptions.map((reason) => (
            <Radio key={reason} value={reason}>{reason}</Radio>
          ))}
          <Radio value={OTHER_LOCK_REASON}>Khác (nhập lý do)</Radio>
        </Radio.Group>
        {selectedReason === OTHER_LOCK_REASON && (
          <Input.TextArea
            className="mt-2"
            rows={3}
            placeholder="Nhập lý do khoá tài khoản"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}
      </Modal>
    </div>
  );
}

export default EditUserForm;
