import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import InputFormAdmin from './InputFormAdmin';
import { voucherTypeOptions } from '@/utils/constants';

// Chuyển Instant ISO (BE) -> giá trị datetime-local input (yyyy-MM-ddTHH:mm, giờ local)
const toDatetimeLocalValue = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Dùng chung cho cả tạo mới (AddVoucher) và sửa (EditVoucher) — form 9 field, nhiều hơn hẳn
// Category (2 field) nên tách trang riêng thay vì modal, theo đúng mẫu Product/EditProductForm.
const VoucherForm = ({ initialData, onSubmit, submitLabel = 'Lưu' }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();

    const { categories } = useSelector((state) => state.app);
    const [type, setType] = useState(initialData?.type || 'PERCENT');
    const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
    const [isFlashSale, setIsFlashSale] = useState(initialData?.isFlashSale ?? false);
    const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? initialData?.applicableCategory?.id ?? '');

    useEffect(() => {
        reset({
            code: initialData?.code || '',
            discountValue: initialData?.discountValue ?? '',
            minimumOrderAmount: initialData?.minimumOrderAmount ?? '',
            maxUsage: initialData?.maxUsage ?? '',
            maxDiscountAmount: initialData?.maxDiscountAmount ?? '',
            startDate: toDatetimeLocalValue(initialData?.startDate),
            endDate: toDatetimeLocalValue(initialData?.endDate),
        });
        setType(initialData?.type || 'PERCENT');
        setIsActive(initialData?.isActive ?? true);
        setIsFlashSale(initialData?.isFlashSale ?? false);
        setCategoryId(initialData?.categoryId ?? initialData?.applicableCategory?.id ?? '');
    }, [initialData, reset]);

    const submitForm = (data) => {
        onSubmit({
            code: data.code?.trim(),
            type,
            discountValue: Number(data.discountValue),
            minimumOrderAmount: data.minimumOrderAmount === '' ? null : Number(data.minimumOrderAmount),
            maxUsage: data.maxUsage === '' ? null : Number(data.maxUsage),
            maxDiscountAmount: type === 'PERCENT' && data.maxDiscountAmount !== ''
                ? Number(data.maxDiscountAmount) : null,
            startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
            endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
            isActive,
            isFlashSale,
            categoryId: categoryId === '' ? null : Number(categoryId),
        });
    };

    return (
        <form onSubmit={handleSubmit(submitForm)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
                <InputFormAdmin
                    className="border p-2 w-full"
                    label="Mã voucher"
                    register={register}
                    errors={errors}
                    id="code"
                    validate={{ required: 'Cần điền mã voucher' }}
                />

                <div className="flex flex-col h-[78px] gap-2">
                    <label>Loại giảm giá</label>
                    <select
                        className="border p-2 w-full rounded-lg"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        {voucherTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <InputFormAdmin
                    className="border p-2 w-full"
                    type="number"
                    label={type === 'PERCENT' ? 'Giá trị giảm (%)' : 'Giá trị giảm (đ)'}
                    register={register}
                    errors={errors}
                    id="discountValue"
                    validate={{ required: 'Cần điền giá trị giảm', min: { value: 0.01, message: 'Phải lớn hơn 0' } }}
                />

                {type === 'PERCENT' && (
                    <InputFormAdmin
                        className="border p-2 w-full"
                        type="number"
                        label="Trần giảm giá tối đa (đ) — để trống nếu không giới hạn"
                        register={register}
                        errors={errors}
                        id="maxDiscountAmount"
                        validate={{ min: { value: 0, message: 'Không được âm' } }}
                    />
                )}

                <InputFormAdmin
                    className="border p-2 w-full"
                    type="number"
                    label="Đơn tối thiểu (đ) — để trống nếu không yêu cầu"
                    register={register}
                    errors={errors}
                    id="minimumOrderAmount"
                    validate={{ min: { value: 0, message: 'Không được âm' } }}
                />

                <InputFormAdmin
                    className="border p-2 w-full"
                    type="number"
                    label="Số lượt sử dụng tối đa — để trống nếu không giới hạn"
                    register={register}
                    errors={errors}
                    id="maxUsage"
                    validate={{ min: { value: 0, message: 'Không được âm' } }}
                />

                <div className="flex flex-col h-[78px] gap-2">
                    <label>Áp dụng cho danh mục — để trống nếu áp dụng toàn bộ đơn hàng</label>
                    <select
                        className="border p-2 w-full rounded-lg"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                    >
                        <option value="">Toàn bộ đơn hàng</option>
                        {categories?.map((cate) => (
                            <option key={cate.id} value={cate.id}>{cate.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col h-[78px] gap-2">
                    <label htmlFor="startDate">Thời gian bắt đầu</label>
                    <input
                        type="datetime-local"
                        id="startDate"
                        className="border p-2 w-full rounded-lg"
                        {...register('startDate', { required: 'Cần chọn thời gian bắt đầu' })}
                    />
                    {errors.startDate && <small className="text-x5 text-red-500">{errors.startDate.message}</small>}
                </div>

                <div className="flex flex-col h-[78px] gap-2">
                    <label htmlFor="endDate">Thời gian kết thúc</label>
                    <input
                        type="datetime-local"
                        id="endDate"
                        className="border p-2 w-full rounded-lg"
                        {...register('endDate', { required: 'Cần chọn thời gian kết thúc' })}
                    />
                    {errors.endDate && <small className="text-x5 text-red-500">{errors.endDate.message}</small>}
                </div>

                <div className="flex items-center gap-2 h-[78px]">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <label htmlFor="isActive">Đang hoạt động</label>
                </div>

                <div className="flex items-center gap-2 h-[78px]">
                    <input
                        type="checkbox"
                        id="isFlashSale"
                        checked={isFlashSale}
                        onChange={(e) => setIsFlashSale(e.target.checked)}
                    />
                    <label htmlFor="isFlashSale">Hiển thị trên banner Flash Sale trang chủ</label>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-10 py-2 rounded-md"
                >
                    {submitLabel}
                </button>
            </div>
        </form>
    );
};

export default VoucherForm;
