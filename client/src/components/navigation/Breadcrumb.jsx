import React from 'react';
import { NavLink } from 'react-router-dom';
import icons from '@/utils/icons';

const { GrNext } = icons;

const Breadcrumb = ({ title, categoryLabel, categoryHref }) => {
    return (
        <div className='flex items-center text-sm gap-1'>
            <NavLink to="/" className='hover:text-main'>Home</NavLink>
            <GrNext size={10} />
            <NavLink to="/products" className='hover:text-main'>Sản phẩm</NavLink>
            {categoryLabel && categoryHref && <>
                <GrNext size={10} />
                <NavLink to={categoryHref} className='hover:text-main'>{categoryLabel}</NavLink>
            </>}
            {title && <>
                <GrNext size={10} />
                <span className='text-gray-500'>{title}</span>
            </>}
        </div>
    );
};

export default Breadcrumb;
