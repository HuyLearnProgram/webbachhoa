import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import icons from '@/utils/icons';

const { GrNext } = icons;

const Breadcrumb = ({ title, category }) => {
    const location = useLocation();

    const isProductPage = location.pathname === '/products';

    return (
        <div className='flex items-center text-sm gap-1'>
            <NavLink to="/" className='hover:text-main'>Home</NavLink>
            <GrNext size={10} />
            <NavLink to="/products" className='hover:text-main'>Sản phẩm</NavLink>
            {!isProductPage && <GrNext size={10} />}
            <NavLink to={`/products/${category}`} className='hover:text-main'>{category}</NavLink>
            {title && <>
                <GrNext size={10} />
                <span className='text-gray-500'>{title}</span>
            </>}
        </div>
    );
};

export default Breadcrumb;
