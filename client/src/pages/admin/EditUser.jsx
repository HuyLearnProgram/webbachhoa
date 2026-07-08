import React from 'react'
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spin, Result, Button } from "antd";
import { getUserById } from '@/apis';
import EditUserForm from '@/components/admin/EditUserForm';
import TurnBackHeader from '@/components/admin/TurnBackHeader';

function EditUser() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const navigate = useNavigate();
    const path = window.location.pathname;
    const uid = path.split('/').pop();

    const fetchUser = async (uid) => {
        setLoading(true);
        setError(false);
        try {
            const res = await getUserById(uid);
            setUser(res.data)
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUser(uid);
    }, [uid]);

    if (loading) {
        return <div className="w-full flex justify-center py-20"><Spin size="large" /></div>;
    }

    if (error || !user) {
        return (
            <Result
                status="error"
                title="Không thể tải thông tin người dùng"
                subTitle="Vui lòng thử lại hoặc quay về trang danh sách người dùng."
                extra={<Button type="primary" onClick={() => navigate('/admin/user')}>Quay về trang người dùng</Button>}
            />
        );
    }

    return (
        <div className='w-full'>
            <div>
                <TurnBackHeader turnBackPage="/admin/user" header="Quay về trang người dùng" />
            </div>
            <EditUserForm initialUserData={user} />
        </div>
    )
}

export default EditUser
