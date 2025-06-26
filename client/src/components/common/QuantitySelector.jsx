import React from 'react';

const QuantitySelector = ({ quantity, stock, onIncrease, onDecrease, onChange }) => {
  const handleInputChange = (e) => {
    const value = parseInt(e.target.value, 10);
    onChange(isNaN(value) ? 1 : value);
  };

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={onDecrease}
        className="px-2 py-1 border bg-slate-100 rounded-md hover:bg-gray-200"
      >
        -
      </button>
      <input
        type="number"
        value={quantity}
        onChange={handleInputChange}
        className="w-15 text-center input-blur" 
        min="1"
        max={stock}
      />

      <button
        onClick={onIncrease}
        className="px-2 py-1 border bg-slate-100 rounded-md hover:bg-gray-200"
      >
        +
      </button>
    </div>
  );
};

export default QuantitySelector;
