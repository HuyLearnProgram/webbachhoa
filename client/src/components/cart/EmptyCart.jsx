import React from 'react'
import { Link } from 'react-router-dom';
import path from '@/utils/path';
const EmptyCart = () => {
    return (
      <div className='flex flex-col justify-center items-center'>
        <p className="text-gray-500">Giỏ hàng của bạn đang trống.</p>
        <Link to={`/${path.PRODUCTS_BASE}`} className='mt-4'>
          <button className='bg-main p-4 rounded-xl text-white hover:underline hover:bg-green-500'>
            Mua sắm ngay
          </button>
        </Link>
      </div>
    );
  };

export default EmptyCart