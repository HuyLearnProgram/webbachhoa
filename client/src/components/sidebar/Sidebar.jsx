import React from 'react'
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { convertToSlug} from '@/utils/helper';
import category_default from "@/assets/category_default.png";
const Sidebar = () => {
    const { categories } = useSelector((state) => {
        //console.log(state)
        return state.app;
    });
    
    return (
        <div className="flex flex-col border h-[400px] overflow-y-auto">
            {categories?.map((e) => (
                <NavLink
                    key={convertToSlug(e.name)}
                    to={`products/${e.name}`}
                    className={({ isActive }) =>
                        isActive
                            ? "bg-main text-sm px-5 pt-[15px] pb-[14px] hover:text-main"
                            : "text-sm px-5 pt-[15px] pb-[14px] hover:text-main"
                    }>
                    <div className="flex items-center gap-2">
                        <img
                            // src={e.imageUrl || category_default}
                            src={
                                e?.imageUrl
                                  ? e?.imageUrl.startsWith("https")
                                    ? e.imageUrl
                                    : `${import.meta.env.VITE_BACKEND_TARGET}/storage/category/${
                                      e?.imageUrl
                                      }`
                                  : category_default
                              }
                            alt={e.name}
                            className="w-5 h-5 object-cover"
                        />
                        {e.name}
                    </div>
                </NavLink>
            ))}
        </div>

    )
}

export default Sidebar