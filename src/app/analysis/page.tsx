'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ProgressBar } from '@/components/ProgressBar';
import { RiskBadge } from '@/components/RiskBadge';
import { useSession } from '@/contexts/SessionContext';
import { Image as ImageType } from '@/types';
import Image from 'next/image';

type AnalysisState = 'idle' | 'analyzing' | 'generating-report' | 'complete' | 'error';

export default function AnalysisPage() {
  const router = useRouter();
  const { sessionId, images, refreshSession, isLoading: sessionLoading } = useSession();

  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyzedImages, setAnalyzedImages] = useState<ImageType[]>([]);

  const totalImages = images.length;
  const progress = totalImages > 0 ? (currentImageIndex / totalImages) * 100 : 0;

  const startAnalysis = useCallback(async () => {
    if (!sessionId || totalImages === 0) return;

    setAnalysisState('analyzing');
    setError(null);
    setCurrentImageIndex(0);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();

      if (data.success) {
        // Set to 100% and show generating report state
        setCurrentImageIndex(totalImages);
        setAnalysisState('generating-report');

        // Give a moment to show the generating report message
        await new Promise(resolve => setTimeout(resolve, 1500));

        setAnalyzedImages(data.data.images);
        setAnalysisState('complete');
        await refreshSession();
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalysisState('error');
    }
  }, [sessionId, totalImages, refreshSession]);

  // Auto-start analysis on mount
  useEffect(() => {
    if (!sessionLoading && sessionId && totalImages > 0 && analysisState === 'idle') {
      startAnalysis();
    }
  }, [sessionLoading, sessionId, totalImages, analysisState, startAnalysis]);

  // Simulate progress updates (only during analyzing state)
  useEffect(() => {
    if (analysisState === 'analyzing' && currentImageIndex < totalImages) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prev => {
          const next = prev + 1;
          // Don't go beyond totalImages - 1 to leave room for the API to complete
          return Math.min(next, totalImages - 1);
        });
      }, 2000); // Approximate 2 seconds per image

      return () => clearInterval(interval);
    }
  }, [analysisState, currentImageIndex, totalImages]);

  const handleViewResults = () => {
    router.push('/results');
  };

  const handleRetry = () => {
    setAnalysisState('idle');
    setError(null);
    setCurrentImageIndex(0);
    startAnalysis();
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-[#1e3a5f]" />
      </div>
    );
  }

  if (totalImages === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Photos to Analyze</h2>
          <p className="text-gray-600 mb-6">
            Please upload some photos before starting the analysis.
          </p>
          <Button fullWidth onClick={() => router.push('/upload')}>
            Go to Upload
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white py-6">
        <div className="max-w-2xl mx-auto px-4">
          {analysisState !== 'analyzing' && (
            <button
              onClick={() => router.push('/upload')}
              className="flex items-center gap-2 text-blue-100 hover:text-white mb-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          <h1 className="text-2xl font-bold">
            {analysisState === 'analyzing' ? 'Analyzing Photos...' :
             analysisState === 'complete' ? 'Analysis Complete' :
             analysisState === 'error' ? 'Analysis Failed' : 'Security Analysis'}
          </h1>
          <p className="text-blue-100 mt-1">
            {analysisState === 'analyzing' ? 'Our AI is examining your photos for security features.' :
             analysisState === 'complete' ? 'Your security assessment is ready.' :
             'Processing your uploaded photos.'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="w-12 h-1 bg-green-500 rounded" />
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className={`w-12 h-1 rounded ${analysisState === 'complete' ? 'bg-green-500' : analysisState === 'generating-report' ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            analysisState === 'complete' ? 'bg-green-500 text-white' :
            analysisState === 'generating-report' ? 'bg-blue-500 text-white' :
            'bg-gray-300 text-gray-600'
          }`}>
            {analysisState === 'complete' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : analysisState === 'generating-report' ? (
              <LoadingSpinner size="sm" className="text-white" />
            ) : '3'}
          </div>
        </div>

        {/* Analyzing State */}
        {analysisState === 'analyzing' && (
          <div className="space-y-6">
            <Card className="text-center">
              <div className="mb-6">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="animate-spin w-24 h-24 text-blue-100" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#1e3a5f"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (progress / 100) * 283}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#1e3a5f]">{Math.round(progress)}%</span>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Analyzing Photo {currentImageIndex + 1} of {totalImages}
              </h3>
              <p className="text-gray-600 text-sm">
                Please wait while our AI examines your photos for security features and vulnerabilities.
              </p>

              <div className="mt-6">
                <ProgressBar progress={progress} color="primary" />
              </div>
            </Card>

            {/* Processing info */}
            <Card className="bg-blue-50 border-blue-100">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#1e3a5f] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-[#1e3a5f]">What we&apos;re looking for:</h4>
                  <ul className="text-sm text-gray-700 mt-1 space-y-1">
                    <li>• Lock types and security features</li>
                    <li>• Window and door conditions</li>
                    <li>• Potential vulnerability points</li>
                    <li>• Security improvements opportunities</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Generating Report State */}
        {analysisState === 'generating-report' && (
          <div className="space-y-6">
            <Card className="text-center">
              <div className="mb-6">
                <div className="relative w-24 h-24 mx-auto">
                  <LoadingSpinner size="lg" className="text-[#1e3a5f]" />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generating Your Security Report
              </h3>
              <p className="text-gray-600 text-sm">
                Analysis complete! Our AI is now creating your comprehensive security report...
              </p>

              <div className="mt-6">
                <ProgressBar progress={100} color="primary" />
              </div>
            </Card>

            {/* Processing info */}
            <Card className="bg-green-50 border-green-100">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-green-800">Processing Complete</h4>
                  <p className="text-sm text-green-700 mt-1">
                    All photos have been analyzed. Generating your personalized security report with recommendations...
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Complete State */}
        {analysisState === 'complete' && (
          <div className="space-y-6">
            <Card className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Complete!</h2>
              <p className="text-gray-600 mb-6">
                We&apos;ve analyzed {totalImages} photo{totalImages !== 1 ? 's' : ''} and generated your security report.
              </p>
              <Button fullWidth size="lg" onClick={handleViewResults}>
                View Results
              </Button>
            </Card>

            {/* Quick preview of analyzed images */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Analyzed Photos</h3>
              <div className="grid grid-cols-4 gap-3">
                {(analyzedImages.length > 0 ? analyzedImages : images).slice(0, 8).map((image) => (
                  <div key={image.id} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={`/api/images/${sessionId}/${image.id}/thumbnail`}
                      alt={image.originalFilename}
                      fill
                      className="object-cover"
                      sizes="100px"
                    />
                    {image.analysis && (
                      <div className="absolute bottom-1 right-1">
                        <RiskBadge
                          score={image.analysis.riskScore}
                          level={image.analysis.riskLevel}
                          size="sm"
                          showScore={false}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {totalImages > 8 && (
                  <div className="aspect-[4/3] rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-500 text-sm font-medium">+{totalImages - 8}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Error State */}
        {analysisState === 'error' && (
          <Card className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Analysis Failed</h2>
            <p className="text-gray-600 mb-2">{error}</p>
            <p className="text-gray-500 text-sm mb-6">
              This could be due to a network issue or temporary service disruption.
            </p>
            <div className="space-y-3">
              <Button fullWidth onClick={handleRetry}>
                Try Again
              </Button>
              <Button fullWidth variant="outline" onClick={() => router.push('/upload')}>
                Back to Upload
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
