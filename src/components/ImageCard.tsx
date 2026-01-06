'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Image as ImageType } from '@/types';
import { RiskBadge } from './RiskBadge';

interface ImageCardProps {
  image: ImageType;
  sessionId: string;
  onRemove?: (imageId: string) => void;
  onAddRelated?: (imageId: string) => void;
  onClick?: (image: ImageType) => void;
  isRelated?: boolean;
}

export function ImageCard({
  image,
  sessionId,
  onRemove,
  onAddRelated,
  onClick,
  isRelated = false,
}: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const statusStyles = {
    pending: 'bg-gray-100 text-gray-600',
    analyzing: 'bg-blue-100 text-blue-600',
    complete: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
  };

  const statusLabels = {
    pending: 'Pending',
    analyzing: 'Analyzing...',
    complete: 'Complete',
    error: 'Error',
  };

  return (
    <div
      className={`
        relative rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm
        ${isRelated ? 'ml-4 scale-95' : ''}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      `}
      onClick={() => onClick?.(image)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 animate-pulse bg-gray-200" />
            )}
            <Image
              src={`/api/images/${sessionId}/${image.id}/thumbnail`}
              alt={image.originalFilename}
              fill
              className={`object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[image.analysisStatus]}`}>
            {image.analysisStatus === 'analyzing' && (
              <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {statusLabels[image.analysisStatus]}
          </span>
        </div>

        {/* Risk Score Badge (if complete) */}
        {image.analysisStatus === 'complete' && image.analysis && (
          <div className="absolute top-2 right-2">
            <RiskBadge
              score={image.analysis.riskScore}
              level={image.analysis.riskLevel}
              size="sm"
              showScore={false}
            />
          </div>
        )}

        {/* Related indicator */}
        {isRelated && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Related
            </span>
          </div>
        )}

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(image.id);
            }}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-xs text-gray-500 truncate" title={image.originalFilename}>
          {image.originalFilename}
        </p>

        {/* Add Related button */}
        {onAddRelated && !isRelated && image.analysisStatus !== 'analyzing' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddRelated(image.id);
            }}
            className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-[#1e3a5f] bg-blue-50 rounded hover:bg-blue-100 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Related Photo
          </button>
        )}
      </div>
    </div>
  );
}

interface ImagePreviewModalProps {
  image: ImageType | null;
  sessionId: string;
  onClose: () => void;
}

export function ImagePreviewModal({ image, sessionId, onClose }: ImagePreviewModalProps) {
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <Image
            src={`/api/images/${sessionId}/${image.id}`}
            alt={image.originalFilename}
            fill
            className="object-contain"
            sizes="100vw"
          />
        </div>
        <div className="mt-4 text-white">
          <h3 className="font-medium">{image.originalFilename}</h3>
          {image.analysis && (
            <div className="mt-2 flex items-center gap-4">
              <RiskBadge
                score={image.analysis.riskScore}
                level={image.analysis.riskLevel}
              />
              <p className="text-gray-300 text-sm">{image.analysis.caption}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
