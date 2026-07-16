import React, { useEffect, useState } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useForm } from 'react-hook-form';
import { Button, Modal, Table, Tag } from 'antd';
import { MdDelete, MdModeEdit } from "react-icons/md";
import {
    apiAdminGetLuckyDrawCampaigns,
    apiAdminCreateLuckyDrawCampaign,
    apiAdminUpdateLuckyDrawCampaign,
    apiAdminDeleteLuckyDrawCampaign,
    apiAdminGetLuckyDrawPrizes,
    apiAdminCreateLuckyDrawPrize,
    apiAdminUpdateLuckyDrawPrize,
    apiAdminDeleteLuckyDrawPrize,
    apiGetAutoGrantRules,
} from '@/apis';
import InputFormAdmin from '@/components/admin/InputFormAdmin';

// Chuyển Instant ISO (BE) -> giá trị datetime-local input, mẫu theo VoucherForm.jsx
const toDatetimeLocalValue = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Trang admin "Rút thăm may mắn" — quản lý chiến dịch + giải thưởng lồng trong 1 trang (không tách
// Add/Edit riêng vì cả 2 entity đều ít trường). Xem LuckyDrawService (BE) cho luồng quay thật.
const LuckyDrawCampaign = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [showCampaignForm, setShowCampaignForm] = useState(false);
    const [deleteCampaignTarget, setDeleteCampaignTarget] = useState(null);

    const [selectedCampaign, setSelectedCampaign] = useState(null); // campaign đang quản lý giải thưởng
    const [prizes, setPrizes] = useState([]);
    const [editingPrize, setEditingPrize] = useState(null);
    const [showPrizeForm, setShowPrizeForm] = useState(false);
    const [deletePrizeTarget, setDeletePrizeTarget] = useState(null);
    const [rules, setRules] = useState([]);

    const campaignForm = useForm();
    const prizeForm = useForm();

    const fetchCampaigns = async () => {
        setLoading(true);
        const res = await apiAdminGetLuckyDrawCampaigns();
        if (res?.data) setCampaigns(res.data);
        setLoading(false);
    };

    const fetchRules = async () => {
        const res = await apiGetAutoGrantRules();
        if (res?.data) setRules(res.data);
    };

    useEffect(() => {
        fetchCampaigns();
        fetchRules();
    }, []);

    const fetchPrizes = async (campaignId) => {
        const res = await apiAdminGetLuckyDrawPrizes(campaignId);
        if (res?.data) setPrizes(res.data);
    };

    const openManagePrizes = (campaign) => {
        setSelectedCampaign(campaign);
        fetchPrizes(campaign.id);
    };

    // ===== Campaign form =====

    const openCreateCampaign = () => {
        setEditingCampaign(null);
        campaignForm.reset({ name: '', startDate: '', endDate: '', minOrderAmount: '', isActive: true });
        setShowCampaignForm(true);
    };

    const openEditCampaign = (campaign) => {
        setEditingCampaign(campaign);
        campaignForm.reset({
            name: campaign.name,
            startDate: toDatetimeLocalValue(campaign.startDate),
            endDate: toDatetimeLocalValue(campaign.endDate),
            minOrderAmount: campaign.minOrderAmount ?? '',
            isActive: campaign.isActive ?? true,
        });
        setShowCampaignForm(true);
    };

    const submitCampaignForm = async (data) => {
        const payload = {
            name: data.name?.trim(),
            startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
            endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
            minOrderAmount: data.minOrderAmount === '' ? null : Number(data.minOrderAmount),
            isActive: !!data.isActive,
        };
        try {
            if (editingCampaign) {
                await apiAdminUpdateLuckyDrawCampaign(editingCampaign.id, payload);
                toast.success('Đã cập nhật chiến dịch!', { autoClose: 2000 });
            } else {
                await apiAdminCreateLuckyDrawCampaign(payload);
                toast.success('Đã tạo chiến dịch mới!', { autoClose: 2000 });
            }
            setShowCampaignForm(false);
            fetchCampaigns();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Lưu chiến dịch thất bại!', { autoClose: 2500 });
        }
    };

    const handleDeleteCampaign = async (campaign) => {
        try {
            await apiAdminDeleteLuckyDrawCampaign(campaign.id);
            toast.success('Đã xoá chiến dịch!', { autoClose: 2000 });
            if (selectedCampaign?.id === campaign.id) setSelectedCampaign(null);
            fetchCampaigns();
        } catch (error) {
            toast.error('Xoá chiến dịch thất bại!', { autoClose: 2000 });
        } finally {
            setDeleteCampaignTarget(null);
        }
    };

    // ===== Prize form =====

    const openCreatePrize = () => {
        setEditingPrize(null);
        prizeForm.reset({ label: '', voucherAutoGrantRuleId: '', probabilityWeight: 1, totalQuantity: '' });
        setShowPrizeForm(true);
    };

    const openEditPrize = (prize) => {
        setEditingPrize(prize);
        prizeForm.reset({
            label: prize.label,
            voucherAutoGrantRuleId: prize.voucherAutoGrantRule?.id ?? '',
            probabilityWeight: prize.probabilityWeight,
            totalQuantity: prize.totalQuantity ?? '',
        });
        setShowPrizeForm(true);
    };

    const submitPrizeForm = async (data) => {
        const payload = {
            label: data.label?.trim(),
            voucherAutoGrantRuleId: data.voucherAutoGrantRuleId === '' ? null : Number(data.voucherAutoGrantRuleId),
            probabilityWeight: Number(data.probabilityWeight),
            totalQuantity: data.totalQuantity === '' ? null : Number(data.totalQuantity),
        };
        try {
            if (editingPrize) {
                await apiAdminUpdateLuckyDrawPrize(editingPrize.id, payload);
                toast.success('Đã cập nhật giải thưởng!', { autoClose: 2000 });
            } else {
                await apiAdminCreateLuckyDrawPrize(selectedCampaign.id, payload);
                toast.success('Đã thêm giải thưởng!', { autoClose: 2000 });
            }
            setShowPrizeForm(false);
            fetchPrizes(selectedCampaign.id);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Lưu giải thưởng thất bại!', { autoClose: 2500 });
        }
    };

    const handleDeletePrize = async (prize) => {
        try {
            await apiAdminDeleteLuckyDrawPrize(prize.id);
            toast.success('Đã xoá giải thưởng!', { autoClose: 2000 });
            fetchPrizes(selectedCampaign.id);
        } catch (error) {
            toast.error('Xoá giải thưởng thất bại!', { autoClose: 2000 });
        } finally {
            setDeletePrizeTarget(null);
        }
    };

    const campaignColumns = [
        { title: 'Tên chiến dịch', dataIndex: 'name', key: 'name' },
        { title: 'Bắt đầu', key: 'startDate', render: (_, r) => new Date(r.startDate).toLocaleString('vi-VN') },
        { title: 'Kết thúc', key: 'endDate', render: (_, r) => new Date(r.endDate).toLocaleString('vi-VN') },
        {
            title: 'Đơn tối thiểu',
            dataIndex: 'minOrderAmount',
            key: 'minOrderAmount',
            render: (v) => (v ? `${v.toLocaleString()}đ` : '—'),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Đang hoạt động' : 'Đã tắt'}</Tag>,
        },
        {
            title: 'Giải thưởng',
            key: 'prizes',
            render: (_, r) => <Button type="link" onClick={() => openManagePrizes(r)}>Quản lý giải thưởng</Button>,
        },
        { title: 'Sửa', key: 'edit', render: (_, r) => <Button type="link" onClick={() => openEditCampaign(r)}><MdModeEdit className="w-5 h-5 inline-block" /></Button> },
        { title: 'Xoá', key: 'delete', render: (_, r) => <Button type="link" danger onClick={() => setDeleteCampaignTarget(r)}><MdDelete className="w-5 h-5 inline-block" /></Button> },
    ];

    const prizeColumns = [
        { title: 'Tên giải', dataIndex: 'label', key: 'label' },
        {
            title: 'Voucher',
            key: 'rule',
            render: (_, r) => r.voucherAutoGrantRule ? r.voucherAutoGrantRule.codePrefix : <Tag>Trượt</Tag>,
        },
        { title: 'Trọng số', dataIndex: 'probabilityWeight', key: 'probabilityWeight' },
        {
            title: 'Còn lại / Tổng',
            key: 'quantity',
            render: (_, r) => r.totalQuantity != null ? `${r.remainingQuantity ?? 0} / ${r.totalQuantity}` : 'Không giới hạn',
        },
        { title: 'Sửa', key: 'edit', render: (_, r) => <Button type="link" onClick={() => openEditPrize(r)}><MdModeEdit className="w-5 h-5 inline-block" /></Button> },
        { title: 'Xoá', key: 'delete', render: (_, r) => <Button type="link" danger onClick={() => setDeletePrizeTarget(r)}><MdDelete className="w-5 h-5 inline-block" /></Button> },
    ];

    return (
        <div className="w-full">
            <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Rút thăm may mắn — Chiến dịch</h2>
                <Button type="primary" onClick={openCreateCampaign}>+ Thêm chiến dịch</Button>
            </div>

            <Table dataSource={campaigns} columns={campaignColumns} rowKey="id" loading={loading} pagination={false} />

            {selectedCampaign && (
                <div className="mt-8">
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="text-md font-semibold">Giải thưởng — {selectedCampaign.name}</h3>
                        <Button type="primary" onClick={openCreatePrize}>+ Thêm giải thưởng</Button>
                    </div>
                    <Table dataSource={prizes} columns={prizeColumns} rowKey="id" pagination={false} />
                    <p className="text-xs text-gray-500 mt-2">
                        Lưu ý: bắt buộc phải có ít nhất 1 giải "Trượt" (không chọn Voucher) với trọng số &gt; 0 để kiểm soát chi phí.
                    </p>
                </div>
            )}

            <Modal title={editingCampaign ? 'Sửa chiến dịch' : 'Thêm chiến dịch mới'} open={showCampaignForm} onCancel={() => setShowCampaignForm(false)} footer={null} width={560}>
                <form onSubmit={campaignForm.handleSubmit(submitCampaignForm)} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        <InputFormAdmin className="border p-2 w-full" label="Tên chiến dịch" register={campaignForm.register} errors={campaignForm.formState.errors} id="name" validate={{ required: 'Cần điền tên' }} />
                        <InputFormAdmin className="border p-2 w-full" type="number" label="Đơn tối thiểu (đ) — để trống nếu không yêu cầu" register={campaignForm.register} errors={campaignForm.formState.errors} id="minOrderAmount" validate={{ min: { value: 0, message: 'Không được âm' } }} />
                        <div className="flex flex-col h-[78px] gap-2">
                            <label htmlFor="startDate">Thời gian bắt đầu</label>
                            <input type="datetime-local" id="startDate" className="border p-2 w-full rounded-lg" {...campaignForm.register('startDate', { required: true })} />
                        </div>
                        <div className="flex flex-col h-[78px] gap-2">
                            <label htmlFor="endDate">Thời gian kết thúc</label>
                            <input type="datetime-local" id="endDate" className="border p-2 w-full rounded-lg" {...campaignForm.register('endDate', { required: true })} />
                        </div>
                        <div className="flex items-center gap-2 h-[78px]">
                            <input type="checkbox" id="isActive" {...campaignForm.register('isActive')} />
                            <label htmlFor="isActive">Đang hoạt động</label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button onClick={() => setShowCampaignForm(false)}>Huỷ</Button>
                        <Button type="primary" htmlType="submit">Lưu</Button>
                    </div>
                </form>
            </Modal>

            <Modal title={editingPrize ? 'Sửa giải thưởng' : 'Thêm giải thưởng'} open={showPrizeForm} onCancel={() => setShowPrizeForm(false)} footer={null} width={560}>
                <form onSubmit={prizeForm.handleSubmit(submitPrizeForm)} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        <InputFormAdmin className="border p-2 w-full" label="Tên giải thưởng" register={prizeForm.register} errors={prizeForm.formState.errors} id="label" validate={{ required: 'Cần điền tên' }} />
                        <div className="flex flex-col h-[78px] gap-2">
                            <label>Voucher trao khi trúng (để trống = giải "Trượt")</label>
                            <select className="border p-2 w-full rounded-lg" {...prizeForm.register('voucherAutoGrantRuleId')}>
                                <option value="">-- Trượt (không trao gì) --</option>
                                {rules.filter((r) => r.autoGrantType === 'LUCKY_DRAW').map((r) => (
                                    <option key={r.id} value={r.id}>{r.codePrefix} ({r.autoGrantType})</option>
                                ))}
                            </select>
                        </div>
                        <InputFormAdmin className="border p-2 w-full" type="number" label="Trọng số (số càng lớn càng dễ trúng)" register={prizeForm.register} errors={prizeForm.formState.errors} id="probabilityWeight" validate={{ required: 'Cần điền trọng số', min: { value: 1, message: 'Phải lớn hơn 0' } }} />
                        <InputFormAdmin className="border p-2 w-full" type="number" label="Tổng số lượng — để trống nếu không giới hạn" register={prizeForm.register} errors={prizeForm.formState.errors} id="totalQuantity" validate={{ min: { value: 0, message: 'Không được âm' } }} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button onClick={() => setShowPrizeForm(false)}>Huỷ</Button>
                        <Button type="primary" htmlType="submit">Lưu</Button>
                    </div>
                </form>
            </Modal>

            <Modal title="Xác nhận xoá chiến dịch" open={!!deleteCampaignTarget} onCancel={() => setDeleteCampaignTarget(null)} footer={[
                <Button key="back" onClick={() => setDeleteCampaignTarget(null)}>Đóng</Button>,
                <Button key="submit" type="primary" danger onClick={() => handleDeleteCampaign(deleteCampaignTarget)}>Xác nhận</Button>,
            ]}>
                <p>Chiến dịch: {deleteCampaignTarget?.name}</p>
            </Modal>

            <Modal title="Xác nhận xoá giải thưởng" open={!!deletePrizeTarget} onCancel={() => setDeletePrizeTarget(null)} footer={[
                <Button key="back" onClick={() => setDeletePrizeTarget(null)}>Đóng</Button>,
                <Button key="submit" type="primary" danger onClick={() => handleDeletePrize(deletePrizeTarget)}>Xác nhận</Button>,
            ]}>
                <p>Giải thưởng: {deletePrizeTarget?.label}</p>
            </Modal>
        </div>
    );
};

export default LuckyDrawCampaign;
