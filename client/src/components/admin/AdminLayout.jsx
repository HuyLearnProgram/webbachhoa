import React from 'react'
import { Outlet} from 'react-router-dom'
import { TopHeader, Header } from "@/components";
import { LeftNavBar} from "@/components/admin";
const AdminLayout = () => {
    return (
        <div>
            <div className="w-full flex flex-col items-center max-h-screen overflow-y-auto">
                <TopHeader />
                <Header />
                    <div className="w-main h-[48px] py-2 flex items-center text-sm"></div>
                    <div className="flex w-main">
                        <LeftNavBar />
                            <Outlet />
                    </div>
                </div>
        </div>
    );
};

export default AdminLayout