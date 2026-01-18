'use client';

import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function ProgressBar({
  progress,
  showLabel = true,
  size = 'md',
  color = 'primary',
  className = '',
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colors = {
    primary: 'bg-[#1e3a5f]',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizes[size]} overflow-hidden`}>
        <div
          className={`${colors[color]} ${sizes[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

interface UploadProgressProps {
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  retryCount?: number;
}

export function UploadProgress({ filename, progress, status, error, retryCount }: UploadProgressProps) {
  const statusColors = {
    uploading: 'primary' as const,
    processing: 'warning' as const,
    complete: 'success' as const,
    error: 'danger' as const,
  };

  const statusText = {
    uploading: retryCount && retryCount > 0 ? `Retrying...` : 'Uploading...',
    processing: 'Processing...',
    complete: 'Complete',
    error: 'Failed',
  };

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
          {filename}
        </span>
        <span className={`text-xs font-medium ${
          status === 'complete' ? 'text-green-600' :
          status === 'error' ? 'text-red-600' :
          'text-gray-500'
        }`}>
          {error || statusText[status]}
        </span>
      </div>
      <ProgressBar
        progress={progress}
        showLabel={false}
        size="sm"
        color={statusColors[status]}
      />
    </div>
  );
}
