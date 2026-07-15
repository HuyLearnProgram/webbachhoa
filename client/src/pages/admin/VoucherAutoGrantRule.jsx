import React, { useEffect, useState } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useForm } from 'react-hook-form';
import { Button, Modal, Table, Tag } from 'antd';
import { MdDelete, MdModeEdit } from "react-icons/md";
import { autoGrantTypeOptions, voucherTypeOptions } from '@/utils/constants';
import {
    apiGetAutoGrantRules,
    apiCreateAutoGrantRule,
    apiUpdateAutoGrantRule,
    apiDeleteAutoGrantRule,
} from '@/apis';
import InputFormAdmin from '@/components/admin/InputFormAdmin';

const typeLabel = (value) => autoGrantTypeOptions.find((o) => o.value === value)?.label || value;

// Trang cấu hình rule trao voucher tự động — 1 trang list + modal form (không tách Add/Edit riêng
// như Voucher vì form ít trường hơn hẳn, không có code/ngày cụ thể). Xem VoucherGrantService (BE).
const VoucherAutoGrantRule = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(null); // null = tạo mới, object = đang sửa
    const [showForm, setShowForm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm();

    const autoGrantType = watch('autoGrantType');
    const discountType = watch('discountType');

    const fetchRules = async () => {
        setLoading(true);
        const response = await apiGetAutoGrantRules();
        if (response.data) setRules(response.data);
        setLoading(false);
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const openCreate = () => {
        setEditing(null);
        reset({
            autoGrantType: 'WELCOME',
            milestoneOrderCount: '',
            discountType: 'PERCENT',
            discountValue: '',
            minimumOrderAmount: '',
            maxDiscountAmount: '',
            validityDays: 30,
            codePrefix: '',
            isActive: true,
        });
        setShowForm(true);
    };

    const openEdit = (rule) => {
        setEditing(rule);
        reset({
            autoGrantType: rule.autoGrantType,
            milestoneOrderCount: rule.milestoneOrderCount ?? '',
            discountType: rule.discountType,
            discountValue: rule.discountValue ?? '',
            minimumOrderAmount: rule.minimumOrderAmount ?? '',
            maxDiscountAmount: rule.maxDiscountAmount ?? '',
            validityDays: rule.validityDays ?? '',
            codePrefix: rule.codePrefix ?? '',
            isActive: rule.isActive ?? true,
        });
        setShowForm(true);
    };

    const submitForm = async (data) => {
        const payload = {
            autoGrantType: data.autoGrantType,
            milestoneOrderCount: data.autoGrantType === 'MILESTONE' && data.milestoneOrderCount !== ''
                ? Number(data.milestoneOrderCount) : null,
            discountType: data.discountType,
            discountValue: Number(data.discountValue),
            minimumOrderAmount: data.minimumOrderAmount === '' ? null : Number(data.minimumOrderAmount),
            maxDiscountAmount: data.discountType === 'PERCENT' && data.maxDiscountAmount !== ''
                ? Number(data.maxDiscountAmount) : null,
            validityDays: Number(data.validityDays),
            codePrefix: data.codePrefix?.trim().toUpperCase(),
            minProductPrice: null,
            isActive: !!data.isActive,
        };
        try {
            if (editing) {
                await apiUpdateAutoGrantRule(editing.id, payload);
                toast.success('Đã cập nhật rule!', { autoClose: 2000 });
            } else {
                await apiCreateAutoGrantRule(payload);
                toast.success('Đã tạo rule mới!', { autoClose: 2000 });
            }
            setShowForm(false);
            fetchRules();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Lưu rule thất bại!', { autoClose: 2500 });
        }
    };

    const handleDelete = async (rule) => {
        try {
            await apiDeleteAutoGrantRule(rule.id);
            toast.success('Đã xoá rule!', { autoClose: 2000 });
            fetchRules();
        } catch (error) {
            toast.error('Xoá rule thất bại!', { autoClose: 2000 });
        } finally {
            setDeleteTarget(null);
        }
    };

    const columns = [
        { title: 'Loại trigger', dataIndex: 'autoGrantType', key: 'autoGrantType', render: typeLabel },
        {
            title: 'Mốc đơn',
            dataIndex: 'milestoneOrderCount',
            key: 'milestoneOrderCount',
            render: (v) => v ?? '—',
        },
        {
            title: 'Giá trị giảm',
            key: 'discountValue',
            render: (_, r) => (r.discountType === 'PERCENT'
                ? `${r.discountValue}%${r.maxDiscountAmount ? ` (tối đa ${r.maxDiscountAmount.toLocaleString()}đ)` : ''}`
                : `${r.discountValue?.toLocaleString()}đ`),
        },
        {
            title: 'Đơn tối thiểu',
            dataIndex: 'minimumOrderAmount',
            key: 'minimumOrderAmount',
            render: (v) => (v ? `${v.toLocaleString()}đ` : '—'),
        },
        { title: 'Hiệu lực (ngày)', dataIndex: 'validityDays', key: 'validityDays' },
        { title: 'Tiền tố mã', dataIndex: 'codePrefix', key: 'codePrefix' },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) => <Tag color={isActive ? 'green' : 'default'}>{isActive ? 'Đang hoạt động' : 'Đã tắt'}</Tag>,
        },
        {
            title: 'Sửa',
            key: 'edit',
            render: (_, r) => (
                <Button type="link" onClick={() => openEdit(r)}>
                    <MdModeEdit className="w-5 h-5 inline-block" />
                </Button>
            ),
        },
        {
            title: 'Xoá',
            key: 'delete',
            render: (_, r) => (
                <Button type="link" danger onClick={() => setDeleteTarget(r)}>
                    <MdDelete className="w-5 h-5 inline-block" />
                </Button>
            ),
        },
    ];

    return (
        <div className="w-full">
            <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Quy tắc trao voucher tự động</h2>
                <Button type="primary" onClick={openCreate}>+ Thêm rule</Button>
            </div>

            <Table dataSource={rules} columns={columns} rowKey="id" loading={loading} pagination={false} />

            <Modal
                title={editing ? 'Sửa rule' : 'Thêm rule mới'}
                open={showForm}
                onCancel={() => setShowForm(false)}
                footer={null}
                width={640}
            >
                <form onSubmit={handleSubmit(submitForm)} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        <div className="flex flex-col h-[78px] gap-2">
                            <label>Loại trigger</label>
                            <select className="border p-2 w-full rounded-lg" {...register('autoGrantType', { required: true })}>
                                {autoGrantTypeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {autoGrantType === 'MILESTONE' && (
                            <InputFormAdmin
                                className="border p-2 w-full"
                                type="number"
                                label="Mốc số đơn PAID"
                                register={register}
                                errors={errors}
                                id="milestoneOrderCount"
                                validate={{ required: 'Bắt buộc cho loại MILESTONE', min: { value: 1, message: 'Phải lớn hơn 0' } }}
                            />
                        )}

                        <div className="flex flex-col h-[78px] gap-2">
                            <label>Loại giảm giá</label>
                            <select className="border p-2 w-full rounded-lg" {...register('discountType', { required: true })}>
                                {voucherTypeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <InputFormAdmin
                            className="border p-2 w-full"
                            type="number"
                            label={discountType === 'PERCENT' ? 'Giá trị giảm (%)' : 'Giá trị giảm (đ)'}
                            register={register}
                            errors={errors}
                            id="discountValue"
                            validate={{ required: 'Cần điền giá trị giảm', min: { value: 0.01, message: 'Phải lớn hơn 0' } }}
                        />

                        {discountType === 'PERCENT' && (
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
                            label="Số ngày hiệu lực (tính từ lúc trao)"
                            register={register}
                            errors={errors}
                            id="validityDays"
                            validate={{ required: 'Bắt buộc', min: { value: 1, message: 'Phải lớn hơn 0' } }}
                        />

                        <InputFormAdmin
                            className="border p-2 w-full"
                            label="Tiền tố mã (VD: WELCOME)"
                            register={register}
                            errors={errors}
                            id="codePrefix"
                            validate={{ required: 'Cần điền tiền tố mã' }}
                        />

                        <div className="flex items-center gap-2 h-[78px]">
                            <input type="checkbox" id="isActive" {...register('isActive')} />
                            <label htmlFor="isActive">Đang hoạt động</label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button onClick={() => setShowForm(false)}>Huỷ</Button>
                        <Button type="primary" htmlType="submit">Lưu</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                title="Xác nhận xoá"
                open={!!deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                footer={[
                    <Button key="back" onClick={() => setDeleteTarget(null)}>Đóng</Button>,
                    <Button key="submit" type="primary" danger onClick={() => handleDelete(deleteTarget)}>Xác nhận</Button>,
                ]}
            >
                <p>Rule: {deleteTarget ? typeLabel(deleteTarget.autoGrantType) : ''}</p>
            </Modal>
        </div>
    );
};

export default VoucherAutoGrantRule;
