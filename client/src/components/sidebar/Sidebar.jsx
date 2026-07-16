import React from 'react'
import { useSelector } from 'react-redux';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import category_default from "@/assets/category_default.png";
import { resolveImageUrl } from '@/utils/helper';
const Sidebar = () => {
    const { categories } = useSelector((state) => {
        //console.log(state)
        return state.app;
    });
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const activeCategoryId = location.pathname === '/products' ? searchParams.get('category') : null;

    return (
        <div className="flex flex-col border h-full overflow-y-auto">
            {categories?.map((e) => (
                <NavLink
                    key={e.id}
                    to={{ pathname: '/products', search: `category=${e.id}` }}
                    className={
                        String(e.id) === activeCategoryId
                            ? "bg-main text-sm px-5 pt-[15px] pb-[14px] hover:text-main"
                            : "text-sm px-5 pt-[15px] pb-[14px] hover:text-main"
                    }>
                    <div className="flex items-center gap-2">
                        <img
                            src={resolveImageUrl(e?.imageUrl, "category", category_default)}
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
