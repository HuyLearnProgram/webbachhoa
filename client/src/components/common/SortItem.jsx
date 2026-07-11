import React from 'react';
import { useSearchParams } from 'react-router-dom';

// defaultLabel: nhãn của option rỗng — trang tìm kiếm truyền "Liên quan" (Smart Search xếp hạng
// mặc định theo độ liên quan khi không chọn sort tường minh), nơi khác giữ "Chọn"
const SortItem = ({ sortOptions, sortOption, setSortOption, defaultLabel = 'Chọn' }) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const handleSortChange = (e) => {
      const selectedSort = e.target.value;
      setSortOption(selectedSort);
  
      if (selectedSort) {
        searchParams.set('sort', selectedSort);
      } else {
        searchParams.delete('sort');
      }
      searchParams.delete('page');
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
        <option value="" className='text-xs'>{defaultLabel}</option>
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
