'use client';

import React from 'react';

interface RiskBadgeProps {
  score: number;
  level?: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export function RiskBadge({
  score,
  level,
  size = 'md',
  showScore = true,
}: RiskBadgeProps) {
  // Determine risk level from score if not provided
  const riskLevel = level || (score <= 3 ? 'high' : score <= 6 ? 'medium' : 'low');

  const colors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const labels = {
    high: 'High Risk',
    medium: 'Medium Risk',
    low: 'Low Risk',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${colors[riskLevel]}
        ${sizes[size]}
      `}
    >
      <span
        className={`
          rounded-full
          ${size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5'}
          ${riskLevel === 'high' ? 'bg-red-500' : riskLevel === 'medium' ? 'bg-amber-500' : 'bg-green-500'}
        `}
      />
      {labels[riskLevel]}
      {showScore && <span className="font-bold">({score.toFixed(1)})</span>}
    </span>
  );
}

interface RiskGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskGauge({ score, size = 'md' }: RiskGaugeProps) {
  const clampedScore = Math.min(10, Math.max(1, score));
  const percentage = ((clampedScore - 1) / 9) * 100;

  const riskLevel = clampedScore <= 3 ? 'high' : clampedScore <= 6 ? 'medium' : 'low';

  const sizeStyles = {
    sm: { container: 'w-24 h-24', text: 'text-lg', label: 'text-xs' },
    md: { container: 'w-32 h-32', text: 'text-2xl', label: 'text-sm' },
    lg: { container: 'w-40 h-40', text: 'text-3xl', label: 'text-base' },
  };

  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
  };

  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative ${sizeStyles[size].container}`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={colors[riskLevel]}
          strokeWidth="8"
          strokeLinecap="round"
          style={{
            strokeDasharray,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${sizeStyles[size].text}`} style={{ color: colors[riskLevel] }}>
          {clampedScore.toFixed(1)}
        </span>
        <span className={`text-gray-500 ${sizeStyles[size].label}`}>
          / 10
        </span>
      </div>
    </div>
  );
}
