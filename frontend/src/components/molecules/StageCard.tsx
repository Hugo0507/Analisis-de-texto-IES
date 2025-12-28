/**
 * StageCard Component (Molecule)
 *
 * Card for displaying pipeline stage status.
 */

import React from 'react';
import { Badge, Spinner } from '../atoms';

export interface StageCardProps {
  stageName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration?: number;  // in seconds
  cacheHit?: boolean;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  className?: string;
}

export const StageCard: React.FC<StageCardProps> = ({
  stageName,
  status,
  duration,
  cacheHit,
  errorMessage,
  startedAt,
  completedAt,
  className = '',
}) => {
  // Status configuration
  const statusConfig = {
    pending: {
      badge: 'default',
      icon: '⏳',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
    running: {
      badge: 'info',
      icon: null, // Will use Spinner
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    completed: {
      badge: 'success',
      icon: '✓',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    failed: {
      badge: 'danger',
      icon: '✗',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    skipped: {
      badge: 'default',
      icon: '⊘',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
  };

  const config = statusConfig[status];

  // Format stage name (snake_case to Title Case)
  const formatStageName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div
      className={`
        border rounded-lg p-4 transition-all duration-200
        ${config.bgColor} ${config.borderColor}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        {/* Left side: Icon + Name */}
        <div className="flex items-center space-x-3">
          {/* Icon or Spinner */}
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            {status === 'running' ? (
              <Spinner size="sm" />
            ) : (
              <span className="text-2xl">{config.icon}</span>
            )}
          </div>

          {/* Stage Name */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {formatStageName(stageName)}
            </h3>

            {/* Duration & Cache */}
            <div className="flex items-center space-x-2 mt-1">
              {duration !== undefined && (
                <span className="text-xs text-gray-600">
                  {formatDuration(duration)}
                </span>
              )}

              {cacheHit && (
                <span className="text-xs text-blue-600 font-medium">
                  • Cached
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Status Badge */}
        <Badge variant={config.badge as any} size="sm">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-3 text-xs text-red-600 bg-red-100 border border-red-200 rounded p-2">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {/* Timestamps */}
      {(startedAt || completedAt) && (
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          {startedAt && (
            <div>Started: {new Date(startedAt).toLocaleString()}</div>
          )}
          {completedAt && (
            <div>Completed: {new Date(completedAt).toLocaleString()}</div>
          )}
        </div>
      )}
    </div>
  );
};
