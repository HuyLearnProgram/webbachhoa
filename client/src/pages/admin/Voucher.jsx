import React, { useEffect, useState } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiAdminGetVouchers, apiAdminDeleteVoucher, apiAdminUpdateVoucher } from "@/apis";
import { useSearchParams, useNavigate, createSearchParams } from 'react-router-dom';
import { Button, Modal, Table, Input, Tag } from 'antd';
import { AddScreenButton } from '@/components/admin';
import { MdDelete, MdModeEdit } from "react-icons/md";

const VOUCHER_PER_PAGE = 8;

const Voucher = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [currentPage, setCurrentPage] = useState(Number(params.get('page')) || 1);
    const [vouchers, setVouchers] = useState(null);
    const [searchTerm, setSearchTerm] = useState(params.get('search') || '');
    const [deleteTarget, setDeleteTarget] = useState(null); // { id, code }
    const [confirmDeactivate, setConfirmDeactivate] = useState(null); // voucher cần hỏi lại deactivate

    const search = params.get('search');

    useEffect(() => {
        setSearchTerm(search || '');
    }, [search]);

    const fetchVouchers = async (page) => {
        const filterString = search ? `code~'${search}'` : undefined;
        const response = await apiAdminGetVouchers({ page, size: VOUCHER_PER_PAGE, filter: filterString });
        setVouchers(response);
    };

    useEffect(() => {
        fetchVouchers(currentPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, search]);

    const buildParams = (overrides) => {
        const next = {};
        if (search) next.search = search;
        Object.assign(next, overrides);
        Object.keys(next).forEach((key) => {
            if (next[key] === undefined || next[key] === '') delete next[key];
        });
        navigate({ search: createSearchParams(next).toString() });
    };

    const handlePagination = (page) => {
        setCurrentPage(page);
        buildParams({ page });
    };

    const handleDelete = async (voucher) => {
        try {
            const response = await apiAdminDeleteVoucher(voucher.id);
            if (response.statusCode === 200) {
                toast.success('Xóa voucher thành công!', { autoClose: 2000 });
                fetchVouchers(currentPage);
            } else if (response.statusCode === 400) {
                // Voucher đã từng được dùng — BE từ chối hard-delete, hỏi lại có muốn vô hiệu hoá không
                setConfirmDeactivate(voucher);
            } else {
                throw new Error(response.message || 'Xóa voucher thất bại!');
            }
        } catch (error) {
            toast.error('Xóa voucher thất bại!', { autoClose: 2000 });
        }
    };

    const handleDeactivate = async (voucher) => {
        try {
            const response = await apiAdminUpdateVoucher(voucher.id, {
                code: voucher.code,
                type: voucher.type,
                discountValue: voucher.discountValue,
                minimumOrderAmount: voucher.minimumOrderAmount,
                maxUsage: voucher.maxUsage,
                maxDiscountAmount: voucher.maxDiscountAmount,
                startDate: voucher.startDate,
                endDate: voucher.endDate,
                isActive: false,
                isFlashSale: voucher.isFlashSale,
                categoryId: voucher.applicableCategory?.id ?? null,
            });
            if (response.statusCode === 200) {
                toast.success('Đã vô hiệu hoá voucher!', { autoClose: 2000 });
                fetchVouchers(currentPage);
            } else {
                throw new Error(response.message || 'Vô hiệu hoá thất bại!');
            }
        } catch (error) {
            toast.error('Vô hiệu hoá thất bại!', { autoClose: 2000 });
        } finally {
            setConfirmDeactivate(null);
        }
    };

    const columns = [
        { title: 'Mã', dataIndex: 'code', key: 'code' },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            render: (type) => (type === 'PERCENT' ? 'Phần trăm' : 'Cố định'),
        },
        {
            title: 'Giá trị',
            key: 'discountValue',
            render: (_, record) => (
                record.type === 'PERCENT' ? `${record.discountValue}%` : `${record.discountValue?.toLocaleString()}đ`
            ),
        },
        {
            title: 'Đơn tối thiểu',
            dataIndex: 'minimumOrderAmount',
            key: 'minimumOrderAmount',
            render: (v) => (v ? `${v.toLocaleString()}đ` : '—'),
        },
        {
            title: 'Áp dụng cho',
            key: 'applicableCategory',
            render: (_, record) => record.applicableCategory
                ? <Tag color="blue">{record.applicableCategory.name}</Tag>
                : 'Toàn bộ đơn hàng',
        },
        {
            title: 'Đã dùng / Tối đa',
            key: 'usage',
            render: (_, record) => `${record.usedCount || 0} / ${record.maxUsage != null ? record.maxUsage : '∞'}`,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'default'}>{isActive ? 'Đang hoạt động' : 'Đã tắt'}</Tag>
            ),
        },
        {
            title: 'Sửa',
            key: 'edit',
            render: (_, record) => (
                <Button type="link" onClick={() => navigate(`${location.pathname}/edit/${record.id}`)}>
                    <MdModeEdit className="w-5 h-5 inline-block" />
                </Button>
            ),
        },
        {
            title: 'Xóa',
            key: 'delete',
            render: (_, record) => (
                <Button type="link" danger onClick={() => setDeleteTarget(record)}>
                    <MdDelete className="w-5 h-5 inline-block" />
                </Button>
            ),
        },
    ];

    return (
        <div className="w-full">
            <div className="mb-4 flex gap-4 items-center flex-wrap">
                <Input.Search
                    allowClear
                    placeholder="Tìm kiếm theo mã voucher"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onSearch={(value) => {
                        setCurrentPage(1);
                        buildParams({ search: value.trim() || undefined, page: 1 });
                    }}
                    style={{ width: 300 }}
                />
            </div>

            <Table
                dataSource={vouchers?.data?.result}
                columns={columns}
                rowKey="id"
                pagination={{
                    current: currentPage,
                    pageSize: VOUCHER_PER_PAGE,
                    onChange: handlePagination,
                    total: vouchers?.data?.meta?.total,
                }}
            />

            <Modal
                title="Xác nhận xóa"
                open={!!deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                footer={[
                    <Button key="back" onClick={() => setDeleteTarget(null)}>Đóng</Button>,
                    <Button
                        key="submit"
                        type="primary"
                        danger
                        onClick={() => {
                            handleDelete(deleteTarget);
                            setDeleteTarget(null);
                        }}
                    >
                        Xác nhận
                    </Button>,
                ]}
            >
                <p>Voucher: {deleteTarget?.code}</p>
            </Modal>

            <Modal
                title="Không thể xoá"
                open={!!confirmDeactivate}
                onCancel={() => setConfirmDeactivate(null)}
                footer={[
                    <Button key="back" onClick={() => setConfirmDeactivate(null)}>Đóng</Button>,
                    <Button key="submit" type="primary" onClick={() => handleDeactivate(confirmDeactivate)}>
                        Vô hiệu hoá thay vì xoá
                    </Button>,
                ]}
            >
                <p>Voucher "{confirmDeactivate?.code}" đã từng được sử dụng nên không thể xoá hẳn. Bạn có muốn vô hiệu hoá (tắt "Đang hoạt động") thay vào đó không?</p>
            </Modal>

            <div>
                <AddScreenButton buttonName='+ Thêm voucher' buttonClassName='bg-green-500 hover:bg-green-700' toLink='add' />
            </div>
        </div>
    );
};

export default Voucher;
