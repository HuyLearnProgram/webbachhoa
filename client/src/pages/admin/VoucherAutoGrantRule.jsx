import React, { useEffect, useMemo, useState } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import { Button, Modal, Table, Tag, Input, Select, Popover } from 'antd';
import { MdDelete, MdModeEdit } from "react-icons/md";
import { FaFilter } from "react-icons/fa";
import { autoGrantTypeOptions, voucherTypeOptions } from '@/utils/constants';
import { stripDiacritics } from '@/utils/helper';
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
    const { categories } = useSelector((state) => state.app);
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(null); // null = tạo mới, object = đang sửa
    const [showForm, setShowForm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);

    // Lọc/tìm kiếm — đồng bộ qua URL param giống Product/Order/User/Voucher (buildParams, Input.Search
    // chỉ lọc khi bấm Enter/icon tìm chứ không lọc theo từng ký tự gõ). Khác các trang đó ở chỗ lọc
    // THUẦN CLIENT-SIDE (không gọi lại API theo filter): bảng rule là cấu hình tĩnh admin thiết lập,
    // quy mô nhỏ (vài chục dòng), BE cũng chưa hỗ trợ @Filter/phân trang cho endpoint này — không đáng
    // để thêm bộ máy Specification/phân trang chỉ cho 1 bảng cấu hình nhỏ.
    const search = params.get('search');
    const typeFilter = params.get('type');
    const statusFilter = params.get('status'); // 'true' | 'false'
    const categoryFilter = params.get('category'); // categoryId hoặc 'NONE' (toàn bộ đơn hàng)
    const [searchTerm, setSearchTerm] = useState(search || '');

    useEffect(() => {
        setSearchTerm(search || '');
    }, [search]);

    const buildParams = (overrides) => {
        const next = {};
        if (search) next.search = search;
        if (typeFilter) next.type = typeFilter;
        if (statusFilter) next.status = statusFilter;
        if (categoryFilter) next.category = categoryFilter;
        Object.assign(next, overrides);
        Object.keys(next).forEach((key) => {
            if (next[key] === undefined || next[key] === '') delete next[key];
        });
        navigate({ search: createSearchParams(next).toString() });
    };

    const handleResetFilters = () => {
        buildParams({ type: undefined, status: undefined, category: undefined });
    };

    const activeFilterCount = [typeFilter, statusFilter, categoryFilter].filter(Boolean).length;

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
            minProductPrice: '',
            categoryId: '',
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
            minProductPrice: rule.minProductPrice ?? '',
            categoryId: rule.applicableCategory?.id ?? '',
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
            // Chỉ CART_RECOVERY dùng field này để chia bậc theo giá sản phẩm bị bỏ quên (BE ràng buộc
            // isMinProductPriceValidForType — loại khác phải null); để trống = áp dụng mọi mức giá.
            minProductPrice: data.autoGrantType === 'CART_RECOVERY' && data.minProductPrice !== ''
                ? Number(data.minProductPrice) : null,
            categoryId: data.categoryId === '' ? null : Number(data.categoryId),
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

    const filteredRules = useMemo(() => {
        // stripDiacritics ở đây thuần để tìm không dấu vẫn khớp (lọc chạy trên mảng JS đã fetch sẵn,
        // KHÔNG qua query backend nên không dính bug dấu tiếng Việt trong filter/@RequestParam đã ghi
        // trong CLAUDE.md — bug đó chỉ ảnh hưởng khi gửi chuỗi có dấu lên server).
        const term = stripDiacritics((search || '').trim().toLowerCase());
        return rules.filter((r) => {
            if (typeFilter && r.autoGrantType !== typeFilter) return false;
            if (statusFilter && String(!!r.isActive) !== statusFilter) return false;
            if (categoryFilter) {
                const ruleCategoryId = r.applicableCategory?.id ? String(r.applicableCategory.id) : 'NONE';
                if (ruleCategoryId !== categoryFilter) return false;
            }
            if (term) {
                const matchesLabel = stripDiacritics(typeLabel(r.autoGrantType).toLowerCase()).includes(term);
                const matchesPrefix = stripDiacritics((r.codePrefix || '').toLowerCase()).includes(term);
                if (!matchesLabel && !matchesPrefix) return false;
            }
            return true;
        });
    }, [rules, search, typeFilter, statusFilter, categoryFilter]);

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
        {
            title: 'Giá SP tối thiểu',
            dataIndex: 'minProductPrice',
            key: 'minProductPrice',
            render: (v, r) => (r.autoGrantType !== 'CART_RECOVERY' ? '—' : (v ? `≥ ${v.toLocaleString()}đ` : 'Mọi mức giá')),
        },
        {
            title: 'Danh mục áp dụng',
            key: 'applicableCategory',
            render: (_, r) => r.applicableCategory?.name || 'Toàn bộ đơn hàng',
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
            <div className="mb-4 flex justify-between items-center flex-wrap gap-3">
                <h2 className="text-lg font-semibold">Quy tắc trao voucher tự động</h2>
                <Button type="primary" onClick={openCreate}>+ Thêm rule</Button>
            </div>

            <div className="mb-4 flex flex-wrap gap-3 items-center">
                <Input.Search
                    allowClear
                    placeholder="Tìm theo loại trigger hoặc tiền tố mã"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onSearch={(value) => buildParams({ search: value.trim() || undefined })}
                    style={{ width: 280 }}
                />
                <Popover
                    trigger="click"
                    open={filterOpen}
                    onOpenChange={setFilterOpen}
                    placement="bottomLeft"
                    content={
                        <div className="flex flex-col gap-3" style={{ width: 260 }}>
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Loại trigger</div>
                                <Select
                                    placeholder="Lọc theo loại trigger"
                                    options={autoGrantTypeOptions}
                                    value={typeFilter || undefined}
                                    onChange={(value) => buildParams({ type: value })}
                                    allowClear
                                    style={{ width: "100%" }}
                                />
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Trạng thái</div>
                                <Select
                                    placeholder="Lọc theo trạng thái"
                                    options={[
                                        { value: 'true', label: 'Đang hoạt động' },
                                        { value: 'false', label: 'Đã tắt' },
                                    ]}
                                    value={statusFilter || undefined}
                                    onChange={(value) => buildParams({ status: value })}
                                    allowClear
                                    style={{ width: "100%" }}
                                />
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Danh mục áp dụng</div>
                                <Select
                                    placeholder="Lọc theo danh mục"
                                    options={[
                                        { value: 'NONE', label: 'Toàn bộ đơn hàng' },
                                        ...(categories?.map((c) => ({ value: String(c.id), label: c.name })) || []),
                                    ]}
                                    value={categoryFilter || undefined}
                                    onChange={(value) => buildParams({ category: value })}
                                    allowClear
                                    style={{ width: "100%" }}
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t">
                                <Button size="small" onClick={handleResetFilters}>
                                    Chọn lại
                                </Button>
                                <Button size="small" type="primary" onClick={() => setFilterOpen(false)}>
                                    Áp dụng{filteredRules ? ` (Có ${filteredRules.length} rule)` : ""}
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <Button icon={<FaFilter />}>
                        Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                    </Button>
                </Popover>
            </div>

            <Table dataSource={filteredRules} columns={columns} rowKey="id" loading={loading} pagination={false} />

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

                        {autoGrantType === 'CART_RECOVERY' && (
                            <InputFormAdmin
                                className="border p-2 w-full"
                                type="number"
                                label="Giá sản phẩm tối thiểu (đ) — để trống = áp dụng mọi mức giá"
                                register={register}
                                errors={errors}
                                id="minProductPrice"
                                validate={{ min: { value: 0, message: 'Không được âm' } }}
                            />
                        )}

                        <div className="flex flex-col h-[78px] gap-2">
                            <label>Áp dụng cho danh mục — để trống nếu áp dụng toàn bộ đơn hàng</label>
                            <select className="border p-2 w-full rounded-lg" {...register('categoryId')}>
                                <option value="">Toàn bộ đơn hàng</option>
                                {categories?.map((cate) => (
                                    <option key={cate.id} value={cate.id}>{cate.name}</option>
                                ))}
                            </select>
                        </div>

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

                    {autoGrantType === 'CART_RECOVERY' && (
                        <p className="text-xs text-gray-500 bg-gray-50 border rounded p-2">
                            Lưu ý: loại này không tạo mã voucher — giảm giá áp thẳng vào giá hiển thị trong
                            giỏ hàng của đúng người bỏ quên sản phẩm, tự hết hạn 22h00 cùng ngày được cấp.
                            2 trường "Số ngày hiệu lực" và "Tiền tố mã" chỉ cần điền cho hợp lệ, không có
                            tác dụng thực tế với loại này.
                        </p>
                    )}

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
