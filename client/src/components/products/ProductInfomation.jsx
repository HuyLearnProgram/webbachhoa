import React, { memo, useState } from 'react';


const ProductInfomation = ({ des, review, rerender }) => {
    const [activedTab, setActiveTab] = useState(1);

    return (
        <div>
            <div className='flex items-center gap-2 bottom-[-1px]'>
                <span
                    className={`p-2 px-4 cursor-pointer ${activedTab === 1 ? 'bg-white border border-b-0' : 'bg-gray-200'}`}
                    onClick={() => setActiveTab(1)}
                >
                    Mô tả sản phẩm
                </span>
                <span
                    className={`p-2 px-4 cursor-pointer ${activedTab === 2 ? 'bg-white border border-b-0' : 'bg-gray-200'}`}
                    onClick={() => setActiveTab(2)}
                >
                    Đánh giá
                </span>
            </div>

            <div className='w-full border p-4'>
                {activedTab === 1 && <p>{des}</p>}
                {activedTab === 2 && <div>{review}</div>}
            </div>
        </div>
    );
};

export default memo(ProductInfomation);
