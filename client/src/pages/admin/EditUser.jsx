import React from 'react'
import { useEffect, useState } from "react";
import { getUserById } from '@/apis';
import EditUserForm from '@/components/admin/EditUserForm';
import TurnBackHeader from '@/components/admin/TurnBackHeader';

function EditUser() {
    const [user, setUser] = useState(null)
    const path = window.location.pathname;
    const uid = path.split('/').pop();

    const fetchUser = async (uid) => {
        const res = await getUserById(uid);
        setUser(res.data)
    }

    useEffect(() => {
        fetchUser(uid);
    }, [uid]);

    if (!user) {
        return <div>Loading...</div>;
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
