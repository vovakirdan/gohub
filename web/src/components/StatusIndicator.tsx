import React from 'react';

interface StatusIndicatorProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ value, size = 'md' }) => {
  let color = 'bg-green-500';
  
  if (value > 80) {
    color = 'bg-red-500';
  } else if (value > 60) {
    color = 'bg-orange-400';
  } else if (value > 40) {
    color = 'bg-yellow-400';
  }
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} ${color} rounded-full animate-pulse-subtle`}
      title={`Usage: ${Math.round(value)}%`}
    />
  );
};

export default StatusIndicator;