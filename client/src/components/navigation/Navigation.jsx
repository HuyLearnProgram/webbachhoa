import React from 'react'
import { navigation } from '@/utils/constants';
import { NavLink } from "react-router-dom";
const Navigation = () => {
    return (
        <div className="w-main h-[48px] py-2 border-y flex items-center text-sm">
            {navigation.map(e => (
                <NavLink className={({ isActive }) => isActive ? "pr-12 hover:text-main text-main" : "pr-12 hover:text-main"} to={e.path} key={e.id}>
                    {e.value}
                </NavLink>
            ))}
        </div>
    )
}

export default Navigation