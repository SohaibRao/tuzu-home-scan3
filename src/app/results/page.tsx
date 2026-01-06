'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { RiskBadge, RiskGauge } from '@/components/RiskBadge';
import { SecurityReportDisplay } from '@/components/SecurityReport';
import { useSession } from '@/contexts/SessionContext';
import { Image as ImageType, SecurityReport, Session } from '@/types';

interface GroupedResults {
  primaryImage: ImageType;
  relatedImages: ImageType[];
  combinedRiskScore: number;
  combinedRiskLevel: 'high' | 'medium' | 'low';
}

interface ResultsSummary {
  session: Session;
  overallRiskScore: number;
  overallRiskLevel: 'high' | 'medium' | 'low';
  groupedResults: GroupedResults[];
  allRecommendations: string[];
  completedCount: number;
  errorCount: number;
  securityReport?: SecurityReport;
}

export default function ResultsPage() {
  const router = useRouter();
  const { sessionId, isLoading: sessionLoading, initSession } = useSession();

  const [results, setResults] = useState<ResultsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!sessionId) return;

      try {
        const response = await fetch(`/api/results/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to load results');
        }

        const data = await response.json();
        if (data.success) {
          setResults(data.data);
        } else {
          throw new Error(data.error || 'Failed to load results');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };

    if (!sessionLoading && sessionId) {
      fetchResults();
    }
  }, [sessionId, sessionLoading]);

  const handleStartNew = async () => {
    localStorage.removeItem('tuzu_session_id');
    await initSession();
    router.push('/location');
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-[#1e3a5f]" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Results</h2>
          <p className="text-gray-600 mb-6">{error || 'No results available.'}</p>
          <Button fullWidth onClick={() => router.push('/upload')}>
            Back to Upload
          </Button>
        </Card>
      </div>
    );
  }

  const riskColors = {
    high: 'text-red-600',
    medium: 'text-amber-600',
    low: 'text-green-600',
  };

  const riskBgColors = {
    high: 'bg-red-50 border-red-100',
    medium: 'bg-amber-50 border-amber-100',
    low: 'bg-green-50 border-green-100',
  };

  // Check if we have a professional security report from GPT-4 Vision
  const hasSecurityReport = results.securityReport && results.securityReport.areas.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-slate-800 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/analysis')}
            className="flex items-center gap-2 text-white/80 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Show professional security report if available, otherwise legacy display */}
        {hasSecurityReport ? (
          <SecurityReportDisplay
            report={results.securityReport!}
            images={results.session?.images}
            sessionId={sessionId!}
          />
        ) : (
          <LegacyResultsDisplay
            results={results}
            sessionId={sessionId!}
            expandedGroup={expandedGroup}
            setExpandedGroup={setExpandedGroup}
            riskColors={riskColors}
            riskBgColors={riskBgColors}
          />
        )}

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Button fullWidth size="lg" onClick={handleStartNew}>
            Start New Scan
          </Button>
          <Button fullWidth variant="outline" onClick={() => router.push('/upload')}>
            Upload More Photos
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center mt-8">
          This assessment is for informational purposes only and should not replace a professional security evaluation.
        </p>
      </div>
    </div>
  );
}

// Legacy results display for backward compatibility
function LegacyResultsDisplay({
  results,
  sessionId,
  expandedGroup,
  setExpandedGroup,
  riskColors,
  riskBgColors,
}: {
  results: ResultsSummary;
  sessionId: string;
  expandedGroup: string | null;
  setExpandedGroup: (id: string | null) => void;
  riskColors: Record<string, string>;
  riskBgColors: Record<string, string>;
}) {
  return (
    <>
      {/* Header with Overall Score */}
      <div className={`-mx-4 -mt-8 mb-6 py-8 px-4 ${
        results.overallRiskLevel === 'high' ? 'bg-gradient-to-br from-red-600 to-red-700' :
        results.overallRiskLevel === 'medium' ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
        'bg-gradient-to-br from-green-500 to-green-600'
      } text-white`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <RiskGauge score={results.overallRiskScore} size="lg" />
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold mb-2">Security Assessment</h1>
            <p className="text-white/90 text-lg mb-1">
              Overall Risk Level: <span className="font-semibold capitalize">{results.overallRiskLevel}</span>
            </p>
            <p className="text-white/70">
              Based on analysis of {results.completedCount} photo{results.completedCount !== 1 ? 's' : ''}
              {results.errorCount > 0 && ` (${results.errorCount} failed)`}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card className={`mb-6 ${riskBgColors[results.overallRiskLevel]}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            results.overallRiskLevel === 'high' ? 'bg-red-100' :
            results.overallRiskLevel === 'medium' ? 'bg-amber-100' :
            'bg-green-100'
          }`}>
            {results.overallRiskLevel === 'high' ? (
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : results.overallRiskLevel === 'medium' ? (
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className={`font-semibold ${riskColors[results.overallRiskLevel]}`}>
              {results.overallRiskLevel === 'high' ? 'High Risk - Action Recommended' :
               results.overallRiskLevel === 'medium' ? 'Moderate Risk - Improvements Suggested' :
               'Low Risk - Good Security Practices'}
            </h3>
            <p className="text-gray-700 text-sm mt-1">
              {results.overallRiskLevel === 'high' ?
                'Your home has significant security vulnerabilities that should be addressed promptly.' :
               results.overallRiskLevel === 'medium' ?
                'Your home has some security features but there are areas that could be improved.' :
                'Your home appears to have good security measures in place.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      {results.allRecommendations.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Recommendations
          </h2>
          <ul className="space-y-3">
            {results.allRecommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-[#1e3a5f] flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Detailed Results by Image Group */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h2>
      <div className="space-y-4">
        {results.groupedResults.map((group, index) => (
          <Card
            key={group.primaryImage.id}
            className="cursor-pointer"
            padding="none"
            onClick={() => setExpandedGroup(
              expandedGroup === group.primaryImage.id ? null : group.primaryImage.id
            )}
          >
            {/* Summary Header */}
            <div className="p-4 flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                <Image
                  src={`/api/images/${sessionId}/${group.primaryImage.id}/thumbnail`}
                  alt={group.primaryImage.originalFilename}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    Area {index + 1}
                  </h3>
                  <RiskBadge
                    score={group.combinedRiskScore}
                    level={group.combinedRiskLevel}
                    size="sm"
                  />
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {group.primaryImage.analysis?.caption || group.primaryImage.originalFilename}
                </p>
                {group.relatedImages.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    +{group.relatedImages.length} related photo{group.relatedImages.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedGroup === group.primaryImage.id ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Expanded Details */}
            {expandedGroup === group.primaryImage.id && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                {/* Primary Image Analysis */}
                <ImageAnalysisDetail
                  image={group.primaryImage}
                  sessionId={sessionId}
                  isPrimary
                />

                {/* Related Images */}
                {group.relatedImages.map(related => (
                  <ImageAnalysisDetail
                    key={related.id}
                    image={related}
                    sessionId={sessionId}
                  />
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

function ImageAnalysisDetail({
  image,
  sessionId,
  isPrimary = false,
}: {
  image: ImageType;
  sessionId: string;
  isPrimary?: boolean;
}) {
  if (!image.analysis) {
    return (
      <div className={`${isPrimary ? '' : 'ml-4 border-l-2 border-gray-100 pl-4'}`}>
        <div className="flex items-center gap-3">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={`/api/images/${sessionId}/${image.id}/thumbnail`}
              alt={image.originalFilename}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
          <div>
            <p className="text-sm text-gray-500">{image.originalFilename}</p>
            <p className="text-xs text-gray-400">Analysis not available</p>
          </div>
        </div>
      </div>
    );
  }

  const analysis = image.analysis;

  return (
    <div className={`${isPrimary ? '' : 'ml-4 border-l-2 border-gray-100 pl-4'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          <Image
            src={`/api/images/${sessionId}/${image.id}/thumbnail`}
            alt={image.originalFilename}
            fill
            className="object-cover"
            sizes="128px"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <RiskBadge
              score={analysis.riskScore}
              level={analysis.riskLevel}
              size="sm"
            />
            {!isPrimary && (
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                Related
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{analysis.caption}</p>
        </div>
      </div>

      {/* Detected Tags */}
      {analysis.tags.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Detected Features:</p>
          <div className="flex flex-wrap gap-1">
            {analysis.tags.slice(0, 8).map((tag, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
              >
                {tag.name}
              </span>
            ))}
            {analysis.tags.length > 8 && (
              <span className="text-xs text-gray-400">
                +{analysis.tags.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Risk Notes */}
      {analysis.riskNotes.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Notes:</p>
          <ul className="text-sm text-gray-700 space-y-1">
            {analysis.riskNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
