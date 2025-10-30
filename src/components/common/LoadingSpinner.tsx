import React from 'react';
import '../../styles/components.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  overlay?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  text,
  overlay = false,
  className = ''
}) => {
  const spinnerClasses = `loading-spinner ${size} ${color} ${className}`;
  
  const spinner = (
    <div className={spinnerClasses}>
      <div className="spinner-circle">
        <div className="spinner-inner"></div>
      </div>
      {text && <div className="spinner-text">{text}</div>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        <div className="loading-overlay-content">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
};

// Inline loading spinner for buttons and small components
export const InlineSpinner: React.FC<{ size?: 'small' | 'medium'; color?: string }> = ({
  size = 'small',
  color = 'currentColor'
}) => (
  <div className={`inline-spinner ${size}`} style={{ color }}>
    <div className="inline-spinner-circle"></div>
  </div>
);

// Full page loading spinner
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="page-loader">
    <div className="page-loader-content">
      <LoadingSpinner size="large" text={text} />
    </div>
  </div>
);

// Loading skeleton for content placeholders
export const LoadingSkeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}> = ({ width = '100%', height = '20px', borderRadius = '4px', className = '' }) => (
  <div
    className={`loading-skeleton ${className}`}
    style={{
      width,
      height,
      borderRadius
    }}
  />
);

// Loading card skeleton
export const LoadingCard: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = ''
}) => (
  <div className={`loading-card ${className}`}>
    <LoadingSkeleton height="24px" width="60%" className="mb-2" />
    {Array.from({ length: lines }).map((_, index) => (
      <LoadingSkeleton
        key={index}
        height="16px"
        width={index === lines - 1 ? '40%' : '100%'}
        className="mb-1"
      />
    ))}
  </div>
);

// Loading table skeleton
export const LoadingTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`loading-table ${className}`}>
    <div className="loading-table-header">
      {Array.from({ length: columns }).map((_, index) => (
        <LoadingSkeleton key={index} height="20px" className="loading-table-header-cell" />
      ))}
    </div>
    <div className="loading-table-body">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="loading-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} height="16px" className="loading-table-cell" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default LoadingSpinner;