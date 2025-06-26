import React from 'react'
import { NavLink } from 'react-router-dom';
import AdminNavigationPath from '@/utils/AdminNavigationPath';

const LeftNavBar = () => {
    return (
        <div className="flex">
            < div >
                <aside className="w-64 h-full p-4 min-h-screen">
                    <nav>
                        <ul className="space-y-4">
                            {AdminNavigationPath.map((e) => (
                                <NavLink
                                    to={e.path}
                                    key={e.id}
                                    className={({ isActive }) =>
                                        `block ${isActive
                                            ? "text-main-hover font-semibold"
                                            : "hover:text-main-hover"
                                        }`
                                    }
                                >
                                    {e.value}
                                </NavLink>
                                // </li>
                            ))}
                        </ul>
                    </nav>
                </aside>
            </div>
        </div >
    )
};

export default LeftNavBar