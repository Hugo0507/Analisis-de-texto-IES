/**
 * MetricCard Component (Molecule)
 *
 * Power BI-style metric card for displaying key statistics.
 */

import React from 'react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  isLoading?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  subtitle,
  variant = 'default',
  isLoading = false,
  className = '',
}) => {
  // Variant styles for border
  const variantStyles = {
    default: 'border-l-blue-500',
    primary: 'border-l-blue-600',
    success: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    danger: 'border-l-red-500',
  };

  // Trend icons and colors
  const trendConfig = {
    up: {
      icon: '↑',
      color: 'text-green-600',
    },
    down: {
      icon: '↓',
      color: 'text-red-600',
    },
    neutral: {
      icon: '→',
      color: 'text-gray-600',
    },
  };

  return (
    <div
      className={`
        bg-white rounded-lg shadow-md p-6 border-l-4
        ${variantStyles[variant]}
        hover:shadow-lg transition-shadow duration-200
        ${className}
      `}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {/* Title */}
          <p className="text-sm font-medium text-gray-600 mb-1">
            {title}
          </p>

          {/* Value */}
          {isLoading ? (
            <div className="h-9 w-24 bg-gray-200 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {value}
            </p>
          )}

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-gray-500">
              {subtitle}
            </p>
          )}

          {/* Trend */}
          {trend && trendValue && (
            <div className={`flex items-center mt-2 text-sm font-medium ${trendConfig[trend].color}`}>
              <span className="mr-1">{trendConfig[trend].icon}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className="text-4xl text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
