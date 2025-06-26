import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import path from "@/utils/path";
import { Navigate, Outlet} from "react-router-dom";
import MemberSidebar from "@/components/sidebar/MemberSidebar";
import { ClipLoader } from 'react-spinners';

const MemberLayout = ()=>{
    const {isLoggedIn, current} = useSelector(state => state.user)
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // Đợi 1 giây rồi chuyển hướng
        const timer =setTimeout(() => {
            setLoading(false);
            }, 1000);
        return () => clearTimeout(timer);
    }, []);

    if(!isLoggedIn || !current) return <Navigate to={`/${path.LOGIN}`} replace={true}/>
    return (
        <div>
            {loading && (
            <ClipLoader
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                color="#36d7b7"
                loading={loading}
                size={50}
            />
        )}
        {!loading && (
            <div className="w-full flex bg-gray-100 min-h-screen relative ">
            <div className="w-[250px] flex-none top-0 bottom-0 fixed">
                <MemberSidebar/>
            </div>
            <div className="w-[250px]"></div>
            <div className="flex-auto bg-gray-100 min-h-screen ">
                <Outlet/>
            </div>        
            </div>)
        }
        </div>
    )
}

export default MemberLayout