import React, { useState, useEffect } from 'react';

const ToggleOption = ({ initialStatus, onToggle }) => {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const handleToggle = () => {
    const newStatus = status === 1 ? 0 : 1;
    setStatus(newStatus);
    if (onToggle) {
      onToggle(newStatus);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button 
        // onClick={handleToggle} 
        style={{
          padding: '5px 10px', 
          backgroundColor: status === 1 ? '#4CAF50' : '#f44336', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        {status === 1 ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
};

export default ToggleOption;