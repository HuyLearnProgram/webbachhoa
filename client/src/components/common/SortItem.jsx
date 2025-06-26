import React from 'react';
import { useSearchParams } from 'react-router-dom';

const SortItem = ({ sortOptions, sortOption, setSortOption }) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const handleSortChange = (e) => {
      const selectedSort = e.target.value;
      setSortOption(selectedSort);
  
      if (selectedSort) {
        searchParams.set('sort', selectedSort);
      } else {
        searchParams.delete('sort');
      }
      setSearchParams(searchParams);
    };

  return (
    <div className="sort-container">
      <label htmlFor="sort" className="font-semibold text-sm mr-2">Sắp xếp:</label>
      <select
        id="sort"
        value={sortOption}
        onChange={handleSortChange}
        className="border p-1 rounded w-[200px] text-xs"
      >
        <option value="" className='text-xs'>Chọn</option>
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value} className='text-xs'>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortItem;
