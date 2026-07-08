import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const CategoryComboBox = ({ onSelectCategory, search, initialCategoryId }) => {
    const { categories } = useSelector((state) => state.app);
    const [selectedCategory, setSelectedCategory] = useState(initialCategoryId ?? '');

    useEffect(() => {
        setSelectedCategory(initialCategoryId ?? '');
    }, [initialCategoryId]);

    const handleChange = (event) => {
        const selectedId = event.target.value;
        setSelectedCategory(selectedId);

        const selectedCategory = categories.find(category => category.id === parseInt(selectedId));
        if (onSelectCategory) {
            onSelectCategory(selectedCategory);
        }
    };
    const selectClass = (typeof search !== 'undefined' && search !== null) 
    ? "border p-1 w-full rounded-md text-xs" 
    : "border p-2 w-full rounded-md";
    
    return (
        <div className='w-full'>
            <select 
                value={selectedCategory} 
                onChange={handleChange}
                className={selectClass}
            >
                <option value="" className={search ? 'text-xs' : ''}>Chọn phân loại</option>
                {categories?.map((category) => (
                    <option key={category.id} value={category.id} className={search ? 'text-xs' : ''}>
                        {category.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default CategoryComboBox;