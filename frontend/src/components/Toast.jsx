import React, { useEffect } from 'react';


const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose && onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass = {
    info: 'bg-gray-800',
    success: 'bg-green-600',
    error: 'bg-red-600',
  }[type];

  return (
    <div className={`fixed bottom-4 right-4 ${bgClass} text-white px-4 py-2 rounded shadow-md`}>
      {message}
    </div>
  );
};

export default Toast;
