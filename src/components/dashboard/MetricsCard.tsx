import React from 'react';
import '../../styles/dashboard.css';

interface MetricsCardProps {
  title: string;
  value: number;
  format?: 'number' | 'currency' | 'percentage';
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  subtitle?: string;
  loading?: boolean;
  error?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  format = 'number',
  icon,
  trend,
  trendValue,
  subtitle,
  loading = false,
  error,
  onClick,
  className = ''
}) => {
  const formatValue = (val: number, fmt: string): string => {
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getTrendIcon = (trendType?: string): string => {
    switch (trendType) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'neutral':
      default:
        return '➡️';
    }
  };

  const getTrendClass = (trendType?: string): string => {
    switch (trendType) {
      case 'up':
        return 'trend-up';
      case 'down':
        return 'trend-down';
      case 'neutral':
      default:
        return 'trend-neutral';
    }
  };

  const cardClasses = [
    'metrics-card',
    className,
    onClick ? 'metrics-card-clickable' : '',
    loading ? 'metrics-card-loading' : '',
    error ? 'metrics-card-error' : ''
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (onClick && !loading && !error) {
      onClick();
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && onClick && !loading && !error) {
      event.preventDefault();
      onClick();
    }
  };

  if (loading) {
    return (
      <div className={cardClasses}>
        <div className="metrics-card-loading-content">
          <div className="loading-skeleton loading-skeleton-icon"></div>
          <div className="loading-skeleton loading-skeleton-title"></div>
          <div className="loading-skeleton loading-skeleton-value"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cardClasses}>
        <div className="metrics-card-error-content">
          <div className="error-icon">⚠️</div>
          <div className="error-title">{title}</div>
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cardClasses}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      tabIndex={onClick ? 0 : -1}
      role={onClick ? 'button' : 'article'}
      aria-label={onClick ? `${title}: ${formatValue(value, format)}. Click to view details.` : undefined}
    >
      <div className="metrics-card-header">
        {icon && <div className="metrics-card-icon">{icon}</div>}
        <div className="metrics-card-title">{title}</div>
      </div>

      <div className="metrics-card-content">
        <div className="metrics-card-value">
          {formatValue(value, format)}
        </div>

        {subtitle && (
          <div className="metrics-card-subtitle">
            {subtitle}
          </div>
        )}

        {trend && trendValue !== undefined && (
          <div className={`metrics-card-trend ${getTrendClass(trend)}`}>
            <span className="trend-icon">{getTrendIcon(trend)}</span>
            <span className="trend-value">
              {format === 'percentage' ? `${trendValue.toFixed(1)}%` : `${trendValue.toFixed(1)}%`}
            </span>
            <span className="trend-period">vs last month</span>
          </div>
        )}
      </div>

      {onClick && (
        <div className="metrics-card-action">
          <span className="action-text">View Details</span>
          <span className="action-arrow">→</span>
        </div>
      )}
    </div>
  );
};

export default MetricsCard;