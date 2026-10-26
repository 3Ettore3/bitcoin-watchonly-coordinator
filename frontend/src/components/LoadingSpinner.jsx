import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
  }[size];
  return (
    <div className={`inline-block ${sizeMap} border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin ${className}`} />
  );
};

export default LoadingSpinner;
