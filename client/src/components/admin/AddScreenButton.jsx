import React from 'react';
import { useNavigate } from 'react-router-dom';

function AddScreenButton({ buttonName = "+ Thêm", buttonClassName, toLink, showMessage }) { 
  const navigate = useNavigate();
  const defaultClassName = "bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-full";
  

  const handleClick = () => {
    if (showMessage) {
    } else if (toLink) {
      navigate(toLink); // Chuyển đến toLink
    }
  };

  const combinedClassName = buttonClassName ? `${defaultClassName} ${buttonClassName}` : defaultClassName;

  return (
    <div className="fixed bottom-16 right-16">
      <button className={combinedClassName} onClick={handleClick}>
        {buttonName}
      </button>
    </div>
  );
}

export default AddScreenButton;


