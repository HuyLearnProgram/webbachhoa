import React, { memo, useState, useEffect } from 'react';
import icons from '@/utils/icons';
import { useNavigate, useParams } from 'react-router-dom';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const { FaCaretDown, FaTimes } = icons;

const FilterItem = ({ name, activeClick, changeActiveFilter, step, min, max }) => {
    const navigate = useNavigate();
    const { category } = useParams();
    const [sliderValue, setSliderValue] = useState([min, max]);
    const [tempSliderValue, setTempSliderValue] = useState([min, max]);

    const handleSliderChange = (value) => {
        setTempSliderValue(value);
    };
    
    const handleSubmit = () => {
        const queries = new URLSearchParams(window.location.search);
        queries.set(name, tempSliderValue.join('-'));
        navigate({
            pathname: category ? `/products/${category}` : '/products',
            search: queries.toString()
        }, { replace: true });
    
        setSliderValue(tempSliderValue);
    };
    
    const handleReset = () => {
        const queries = new URLSearchParams(window.location.search);
        queries.delete(name);
    
        navigate({
            pathname: category ? `/products/${category}` : '/products',
            search: queries.toString()
        }, { replace: true });
    
        
        setSliderValue([min, max]);
        setTempSliderValue([min, max]);
    };
    
    const handleClosePopup = () => {
        changeActiveFilter(null);
    };
    
    
    useEffect(() => {
        const queries = new URLSearchParams(window.location.search);
        const priceParam = queries.get('price');
        const ratingParam = queries.get('rating');
    
        if (name === 'price' && priceParam) {
            setSliderValue(priceParam.split('-').map(Number));
            setTempSliderValue(priceParam.split('-').map(Number));
        } else if (name === 'rating' && ratingParam) {
            setSliderValue(ratingParam.split('-').map(Number));
            setTempSliderValue(ratingParam.split('-').map(Number));
        }
    }, [name, navigate]);    

    return (
        <div
            className='p-3 text-gray-700 text-xs gap-6 relative border border-gray-800 flex justify-between items-center cursor-pointer'
            onClick={(e) => {
                e.stopPropagation();
                changeActiveFilter(name);
            }}
        >
            <span className='capitalize'>{name}</span>
            <FaCaretDown />
            {activeClick === name && (
                <div className='z-10 absolute top-[calc(100%+1px)] left-0 w-fit p-4 border bg-white min-w-[170px]'>
                    <div className='flex justify-between items-center' >
                        <span className='font-semibold'>Filter by {name}</span>
                        <button onClick={handleClosePopup} className='text-gray-500 hover:text-red-500'>
                            <FaTimes />
                        </button>
                    </div>
                    <div className='mt-4'>
                        <div className='flex justify-between mb-2'>
                            <span>{tempSliderValue[0]}</span>
                            <span>{tempSliderValue[1]}</span>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                            <Slider
                                range
                                min={min}
                                max={max}
                                step={step}
                                value={tempSliderValue}
                                onChange={handleSliderChange}
                            />
                        </div>
                    </div>
                    <div className='mt-4 flex justify-between'>
                        <button
                            className='bg-main text-white px-4 py-2 rounded'
                            onClick={handleSubmit}
                        >
                            Submit
                        </button>
                        <button
                            className='hover:text-main underline text-sm'
                            onClick={handleReset}
                        >  Reset
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(FilterItem);