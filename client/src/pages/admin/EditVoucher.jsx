import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { toast } from 'react-toastify';
import { apiAdminGetVoucherById, apiAdminUpdateVoucher } from '@/apis';
import { TurnBackHeader, VoucherForm } from '@/components/admin';

function EditVoucher() {
    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const navigate = useNavigate();
    const path = window.location.pathname;
    const vid = path.split('/').pop();

    const fetchVoucher = async (id) => {
        setLoading(true);
        setError(false);
        try {
            const res = await apiAdminGetVoucherById(id);
            if (!res?.data) throw new Error('not found');
            setVoucher(res.data);
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVoucher(vid);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vid]);

    const handleUpdateVoucher = async (dto) => {
        try {
            const response = await apiAdminUpdateVoucher(vid, dto);
            if (response.statusCode !== 200) {
                throw new Error(response.message || 'Có lỗi xảy ra khi cập nhật voucher.');
            }
            toast.success('Cập nhật voucher thành công!');
            navigate('/admin/voucher');
        } catch (err) {
            toast.error('Có lỗi xảy ra: ' + err.message);
        }
    };

    if (loading) {
        return <div className="w-full flex justify-center py-20"><Spin size="large" /></div>;
    }

    if (error || !voucher) {
        return (
            <Result
                status="error"
                title="Không thể tải thông tin voucher"
                subTitle="Vui lòng thử lại hoặc quay về trang danh sách voucher."
                extra={<Button type="primary" onClick={() => navigate('/admin/voucher')}>Quay về trang voucher</Button>}
            />
        );
    }

    return (
        <div className='w-full'>
            <div>
                <TurnBackHeader turnBackPage="/admin/voucher" header="Quay về trang voucher" />
            </div>
            <div className="flex justify-center items-center min-h-screen py-8">
                <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl">
                    <VoucherForm initialData={voucher} onSubmit={handleUpdateVoucher} submitLabel="Cập nhật" />
                </div>
            </div>
        </div>
    );
}

export default EditVoucher;
