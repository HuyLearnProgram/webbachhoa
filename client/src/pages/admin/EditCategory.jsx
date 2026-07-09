import React from 'react'

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spin, Result, Button } from "antd";
import { apiGetCategory } from '@/apis';
import EditCategoryForm from '@/components/admin/EditCategoryForm';
import TurnBackHeader from '@/components/admin/TurnBackHeader';

function EditCategory() {
    const [category, setCategory] = useState(null)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const navigate = useNavigate();
    const path = window.location.pathname;
    const cid = path.split('/').pop();

    const fetchCategory = async (cid) => {
        setLoading(true);
        setError(false);
        try {
            const res = await apiGetCategory(cid);
            setCategory(res.data)
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCategory(cid);
    }, [cid]);

    if (loading) {
        return <div className="w-full flex justify-center py-20"><Spin size="large" /></div>;
    }

    if (error || !category) {
        return (
            <Result
                status="error"
                title="Không thể tải thông tin phân loại"
                subTitle="Vui lòng thử lại hoặc quay về trang danh sách phân loại."
                extra={<Button type="primary" onClick={() => navigate('/admin/category')}>Quay về trang phân loại</Button>}
            />
        );
    }

    return (
        <div className='w-full'>
            <div>
                <TurnBackHeader turnBackPage="/admin/category" header="Quay về trang phân loại" />
            </div>
            <EditCategoryForm initialCategoryData={category} />
        </div>
    )
}

export default EditCategory
