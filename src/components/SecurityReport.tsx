'use client';

import React from 'react';
import Image from 'next/image';
import {
  SecurityReport,
  AreaAnalysis,
  ExposureRisk,
  ConfidenceLevel,
  EffortCostLevel,
  PrioritizedRecommendation,
  Image as ImageType,
} from '@/types';

// Exposure Risk Badge Component (5-level)
interface ExposureRiskBadgeProps {
  risk: ExposureRisk;
  confidence?: ConfidenceLevel;
  size?: 'sm' | 'md' | 'lg';
  showConfidence?: boolean;
}

export function ExposureRiskBadge({
  risk,
  confidence,
  size = 'md',
  showConfidence = false,
}: ExposureRiskBadgeProps) {
  const colors: Record<ExposureRisk, string> = {
    'Very Low': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Low': 'bg-green-100 text-green-700 border-green-200',
    'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
    'High': 'bg-orange-100 text-orange-700 border-orange-200',
    'Very High': 'bg-red-100 text-red-700 border-red-200',
  };

  const dotColors: Record<ExposureRisk, string> = {
    'Very Low': 'bg-emerald-500',
    'Low': 'bg-green-500',
    'Medium': 'bg-amber-500',
    'High': 'bg-orange-500',
    'Very High': 'bg-red-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${colors[risk]}
        ${sizes[size]}
      `}
    >
      <span
        className={`
          rounded-full
          ${size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5'}
          ${dotColors[risk]}
        `}
      />
      {risk}
      {showConfidence && confidence && (
        <span className="opacity-75 text-xs">({confidence})</span>
      )}
    </span>
  );
}

// Confidence Badge
interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  size?: 'sm' | 'md';
}

export function ConfidenceBadge({ level, size = 'sm' }: ConfidenceBadgeProps) {
  const colors: Record<ConfidenceLevel, string> = {
    'High': 'bg-blue-100 text-blue-700',
    'Medium': 'bg-gray-100 text-gray-700',
    'Low': 'bg-yellow-100 text-yellow-700',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded ${colors[level]} ${sizes[size]}`}>
      {level} Confidence
    </span>
  );
}

// Effort/Cost Tag
interface EffortCostTagProps {
  label: string;
  level: EffortCostLevel;
}

export function EffortCostTag({ label, level }: EffortCostTagProps) {
  const colors: Record<EffortCostLevel, string> = {
    'Low': 'bg-green-50 text-green-600 border-green-200',
    'Medium': 'bg-amber-50 text-amber-600 border-amber-200',
    'High': 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${colors[level]}`}>
      {label}: {level}
    </span>
  );
}

// Security Report Header
interface SecurityReportHeaderProps {
  header: SecurityReport['header'];
}

export function SecurityReportHeader({ header }: SecurityReportHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
            Tuzu Security Auditor Report
          </div>
          <div className="text-xs text-slate-400">
            Version: 2.0 | Date: {header.date}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 mb-1">Areas Analyzed</div>
          <div className="text-2xl font-bold">{header.areasAnalyzed}</div>
        </div>
      </div>

      <div className="border-t border-slate-600 pt-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="text-sm text-slate-300">Overall Exposure Risk:</span>
          <ExposureRiskBadge risk={header.overallExposureRisk} size="lg" />
          <span className="text-slate-400">|</span>
          <ConfidenceBadge level={header.overallConfidence} size="md" />
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          {header.summary}
        </p>
      </div>
    </div>
  );
}

// Area Analysis Card
interface AreaAnalysisCardProps {
  area: AreaAnalysis;
  index: number;
  images?: ImageType[];
  sessionId?: string;
}

export function AreaAnalysisCard({ area, index, images, sessionId }: AreaAnalysisCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Images for this area */}
      {images && images.length > 0 && sessionId && (
        <div className="flex gap-2 p-2 bg-gray-50 border-b border-gray-100">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative w-24 h-24 rounded overflow-hidden bg-gray-200 flex-shrink-0"
            >
              <Image
                src={`/api/images/${sessionId}/${image.id}/thumbnail`}
                alt={image.originalFilename}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          ))}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
              {index + 1}
            </span>
            <h3 className="font-semibold text-gray-900">{area.area}</h3>
          </div>
          <ExposureRiskBadge risk={area.exposureRisk} size="sm" />
        </div>

        <div className="mb-3">
          <ConfidenceBadge level={area.confidence} />
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <div className="font-medium text-gray-700 mb-1">Notes</div>
            <p className="text-gray-600 leading-relaxed">{area.notes}</p>
          </div>

          <div>
            <div className="font-medium text-gray-700 mb-1">Recommendation</div>
            <p className="text-gray-600 leading-relaxed">{area.recommendation}</p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <EffortCostTag label="Effort" level={area.effort} />
            <EffortCostTag label="Cost" level={area.cost} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Prioritized Recommendations List
interface RecommendationsListProps {
  recommendations: PrioritizedRecommendation[];
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  if (recommendations.length === 0) return null;

  // Sort by priority
  const sorted = [...recommendations].sort((a, b) => a.priority - b.priority);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Prioritized Recommendations
      </h3>

      <div className="space-y-3">
        {sorted.map((rec, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {rec.priority}
            </span>
            <div className="flex-1">
              <p className="text-gray-700 text-sm mb-2">{rec.recommendation}</p>
              <div className="flex items-center gap-2">
                <EffortCostTag label="Effort" level={rec.effort} />
                <EffortCostTag label="Cost" level={rec.cost} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Limitations Section
interface LimitationsProps {
  limitations: string[];
}

export function Limitations({ limitations }: LimitationsProps) {
  if (!limitations || limitations.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Assessment Limitations
      </h4>
      <ul className="text-sm text-amber-700 space-y-1">
        {limitations.map((limitation, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-amber-500 mt-1">-</span>
            {limitation}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Conclusion Section
interface ConclusionProps {
  conclusion: string;
}

export function Conclusion({ conclusion }: ConclusionProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Conclusion
      </h3>
      <p className="text-gray-700 leading-relaxed">{conclusion}</p>
    </div>
  );
}

// Analyzed Images Gallery
interface AnalyzedImagesProps {
  images: ImageType[];
  sessionId: string;
}

export function AnalyzedImages({ images, sessionId }: AnalyzedImagesProps) {
  if (!images || images.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Analyzed Photos ({images.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 group"
          >
            <Image
              src={`/api/images/${sessionId}/${image.id}/thumbnail`}
              alt={image.originalFilename}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Full Security Report Display
interface SecurityReportDisplayProps {
  report: SecurityReport;
  images?: ImageType[];
  sessionId?: string;
}

// Helper function to distribute images across areas
function distributeImages(images: ImageType[], areaCount: number): ImageType[][] {
  if (!images || images.length === 0 || areaCount === 0) {
    return Array(areaCount).fill([]);
  }

  const result: ImageType[][] = Array(areaCount).fill(null).map(() => []);

  // Distribute images evenly across areas
  images.forEach((image, index) => {
    const areaIndex = index % areaCount;
    result[areaIndex].push(image);
  });

  return result;
}

export function SecurityReportDisplay({ report, images, sessionId }: SecurityReportDisplayProps) {
  // Distribute images across area cards
  const distributedImages = distributeImages(images || [], report.areas.length);

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <SecurityReportHeader header={report.header} />

      {/* Areas Analyzed with Images */}
      {report.areas.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Area-by-Area Assessment
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {report.areas.map((area, index) => (
              <AreaAnalysisCard
                key={index}
                area={area}
                index={index}
                images={distributedImages[index]}
                sessionId={sessionId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Prioritized Recommendations */}
      <RecommendationsList recommendations={report.prioritizedRecommendations} />

      {/* Limitations */}
      <Limitations limitations={report.limitations || []} />

      {/* Conclusion */}
      <Conclusion conclusion={report.conclusion} />

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
        Report generated by Tuzu Security Auditor powered by AI
      </div>
    </div>
  );
}
