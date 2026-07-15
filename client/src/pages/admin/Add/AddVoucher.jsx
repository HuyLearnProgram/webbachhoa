import React from 'react';
import { TurnBackHeader } from '@/components/admin';
import { VoucherForm } from '@/components/admin';
import { apiAdminCreateVoucher } from '@/apis';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AddVoucher = () => {
    const navigate = useNavigate();

    const handleCreateVoucher = async (dto) => {
        try {
            const response = await apiAdminCreateVoucher(dto);
            if (response.statusCode !== 201) {
                throw new Error(response.message || 'Có lỗi xảy ra khi tạo voucher.');
            }
            toast.success('Thêm voucher thành công!');
            navigate('/admin/voucher');
        } catch (err) {
            toast.error('Có lỗi xảy ra: ' + err.message);
        }
    };

    return (
        <div className='w-full'>
            <div>
                <TurnBackHeader turnBackPage="/admin/voucher" header="Quay về trang voucher" />
            </div>
            <div className="flex justify-center items-center min-h-screen py-8">
                <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl">
                    <VoucherForm onSubmit={handleCreateVoucher} submitLabel="Lưu" />
                </div>
            </div>
        </div>
    );
};

export default AddVoucher;
