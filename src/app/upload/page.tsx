'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UploadProgress } from '@/components/ProgressBar';
import { ImageCard, ImagePreviewModal } from '@/components/ImageCard';
import { useSession } from '@/contexts/SessionContext';
import { Image as ImageType } from '@/types';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  retryCount?: number;
}

const MAX_IMAGES = 30;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
const MAX_RETRIES = 3; // Retry failed uploads up to 3 times
const BATCH_SIZE = 5; // Upload 5 files at a time to prevent server overload

export default function UploadPage() {
  const router = useRouter();
  const { sessionId, images, addImage, removeImage, location, isLoading: sessionLoading, resetSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const relatedInputRef = useRef<HTMLInputElement>(null);

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageType | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [failedUploads, setFailedUploads] = useState<{name: string; file: File; parentImageId?: string}[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const remainingSlots = MAX_IMAGES - images.length - uploadingFiles.length;

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large. Maximum 10MB.`;
    }

    const isValidType = ALLOWED_TYPES.includes(file.type.toLowerCase()) ||
      file.name.toLowerCase().endsWith('.heic');

    if (!isValidType) {
      return `${file.name} is not a supported format. Use JPG, PNG, or HEIC.`;
    }

    return null;
  };

  const uploadFile = async (file: File, parentImageId?: string, retryCount = 0): Promise<boolean> => {
    const uploadId = Math.random().toString(36).substring(7);

    setUploadingFiles(prev => [...prev, {
      id: uploadId,
      file,
      progress: 0,
      status: 'uploading',
      retryCount,
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId!);
      if (parentImageId) {
        formData.append('parentImageId', parentImageId);
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadId && f.progress < 90
            ? { ...f, progress: f.progress + 10 }
            : f
        ));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      // Update to processing
      setUploadingFiles(prev => prev.map(f =>
        f.id === uploadId ? { ...f, progress: 100, status: 'processing' } : f
      ));

      // Add image to session
      const newImage: ImageType = {
        id: data.data.imageId,
        sessionId: sessionId!,
        parentImageId: parentImageId,
        originalFilename: file.name,
        storagePath: '',
        thumbnailPath: '',
        uploadedAt: new Date(),
        analysisStatus: 'pending',
      };

      addImage(newImage);

      // Mark as complete and remove from uploading
      setUploadingFiles(prev => prev.map(f =>
        f.id === uploadId ? { ...f, status: 'complete' } : f
      ));

      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      }, 1000);

      return true; // Upload successful

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      // Retry logic with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const nextRetry = retryCount + 1;
        const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadId ? {
            ...f,
            status: 'uploading' as const,
            error: `Retrying (${nextRetry}/${MAX_RETRIES})...`,
            retryCount: nextRetry,
          } : f
        ));

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));

        // Remove current upload UI and retry
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        return uploadFile(file, parentImageId, nextRetry);
      }

      // Max retries exhausted
      setUploadingFiles(prev => prev.map(f =>
        f.id === uploadId ? {
          ...f,
          status: 'error',
          error: `${errorMessage} (after ${MAX_RETRIES} retries)`,
        } : f
      ));

      // Track failed upload with file reference for manual retry
      setFailedUploads(prev => [...prev, { name: file.name, file, parentImageId }]);

      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      }, 3000);

      return false; // Upload failed
    }
  };

  const handleFiles = useCallback(async (files: FileList, parentImageId?: string) => {
    const fileArray = Array.from(files);

    // Validate file count
    if (fileArray.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more image(s). Maximum ${MAX_IMAGES} per session.`);
      return;
    }

    // Validate all files first and collect valid ones
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        invalidFiles.push(error);
      } else {
        validFiles.push(file);
      }
    }

    // Show alert for invalid files
    if (invalidFiles.length > 0) {
      alert(`${invalidFiles.length} file(s) could not be uploaded:\n\n${invalidFiles.slice(0, 3).join('\n')}${invalidFiles.length > 3 ? `\n...and ${invalidFiles.length - 3} more` : ''}`);
    }

    // If no valid files, return early
    if (validFiles.length === 0) {
      return;
    }

    // Process valid files in batches to prevent server overload
    // Upload BATCH_SIZE files concurrently, then move to next batch
    let successCount = 0;
    let failCount = 0;

    setBatchProgress({ current: 0, total: validFiles.length });

    // Split into batches
    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
      const batch = validFiles.slice(i, i + BATCH_SIZE);

      // Upload batch concurrently (max BATCH_SIZE at a time)
      const results = await Promise.all(
        batch.map(file => uploadFile(file, parentImageId))
      );

      // Count successes and failures
      results.forEach(success => {
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      });

      // Update progress
      setBatchProgress({ current: Math.min(i + BATCH_SIZE, validFiles.length), total: validFiles.length });
    }

    // Clear batch progress
    setBatchProgress(null);

    // Show summary if there were failures
    if (failCount > 0 && successCount > 0) {
      console.log(`Upload complete: ${successCount} succeeded, ${failCount} failed after retries`);
    }
  }, [sessionId, remainingSlots]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleAddRelated = (parentId: string) => {
    setSelectedParentId(parentId);
    relatedInputRef.current?.click();
  };

  const handleRelatedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && selectedParentId) {
      handleFiles(e.target.files, selectedParentId);
    }
    setSelectedParentId(null);
    if (relatedInputRef.current) {
      relatedInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!sessionId) return;

    const confirmDelete = window.confirm('Remove this photo? Related photos will also be removed.');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/images/${sessionId}/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove image');
      }

      // Remove from local state
      removeImage(imageId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove image');
    }
  };

  // Group images by parent
  const groupedImages = images.reduce((acc, image) => {
    if (!image.parentImageId) {
      // Primary image
      if (!acc[image.id]) {
        acc[image.id] = { primary: image, related: [] };
      } else {
        acc[image.id].primary = image;
      }
    } else {
      // Related image
      if (!acc[image.parentImageId]) {
        acc[image.parentImageId] = { primary: null, related: [image] };
      } else {
        acc[image.parentImageId].related.push(image);
      }
    }
    return acc;
  }, {} as Record<string, { primary: ImageType | null; related: ImageType[] }>);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/location')}
            className="flex items-center gap-2 text-blue-100 hover:text-white mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold">Upload Photos</h1>
          <p className="text-blue-100 mt-1">
            Take photos of windows, doors, and locks for analysis.
          </p>
          {location && (
            <p className="text-blue-200 text-sm mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {location.suburb || location.city || 'Location set'}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="w-12 h-1 bg-[#1e3a5f] rounded" />
          <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-sm font-bold">2</div>
          <div className="w-12 h-1 bg-gray-300 rounded" />
          <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center text-sm font-bold">3</div>
        </div>

        {/* Upload Zone */}
        <Card
          className={`
            border-2 border-dashed transition-colors mb-6
            ${dragOver ? 'border-[#1e3a5f] bg-blue-50' : 'border-gray-300'}
            ${remainingSlots <= 0 ? 'opacity-50 pointer-events-none' : ''}
          `}
          padding="lg"
          onClick={() => remainingSlots > 0 && fileInputRef.current?.click()}
          onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {remainingSlots > 0 ? 'Upload Photos' : 'Maximum images reached'}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {remainingSlots > 0 ? (
                <>Tap to select or drag and drop. {remainingSlots} of {MAX_IMAGES} slots remaining.</>
              ) : (
                'Remove some images to upload more.'
              )}
            </p>
            <p className="text-xs text-gray-400">
              JPG, PNG, HEIC up to 10MB each
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic,.heic"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </Card>

        {/* Hidden input for related photos */}
        <input
          ref={relatedInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/heic,.heic"
          multiple
          className="hidden"
          onChange={handleRelatedFileChange}
        />

        {/* Batch Upload Progress */}
        {batchProgress && (
          <Card className="mb-6 bg-blue-50 border-blue-100">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="sm" className="text-[#1e3a5f]" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Processing batch upload: {batchProgress.current} of {batchProgress.total} files
                </p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#1e3a5f] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Uploading Files */}
        {uploadingFiles.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Uploading...</h3>
            {uploadingFiles.map(file => (
              <UploadProgress
                key={file.id}
                filename={file.file.name}
                progress={file.progress}
                status={file.status}
                error={file.error}
                retryCount={file.retryCount}
              />
            ))}
          </div>
        )}

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Photos ({images.length})
              </h3>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedImages).map(([parentId, group]) => {
                if (!group.primary) return null;

                return (
                  <div key={parentId} className="space-y-2">
                    {/* Primary Image */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      <ImageCard
                        image={group.primary}
                        sessionId={sessionId!}
                        onAddRelated={handleAddRelated}
                        onRemove={handleRemoveImage}
                        onClick={setPreviewImage}
                      />

                      {/* Related Images */}
                      {group.related.map(related => (
                        <ImageCard
                          key={related.id}
                          image={related}
                          sessionId={sessionId!}
                          onRemove={handleRemoveImage}
                          onClick={setPreviewImage}
                          isRelated
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && uploadingFiles.length === 0 && (
          <Card className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No photos yet</h3>
            <p className="text-gray-600 text-sm">
              Upload photos of your windows, doors, and locks to get started.
            </p>
          </Card>
        )}

        {/* Failed Uploads Warning */}
        {failedUploads.length > 0 && (
          <Card className="bg-amber-50 border-amber-200 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1">
                  {failedUploads.length} Upload{failedUploads.length !== 1 ? 's' : ''} Failed
                </h4>
                <p className="text-sm text-amber-800 mb-2">
                  The following images could not be uploaded after {MAX_RETRIES} automatic retry attempts. You can retry manually or continue with successfully uploaded images.
                </p>
                <ul className="text-sm text-amber-700 space-y-1 mb-3">
                  {failedUploads.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="truncate">• {item.name}</li>
                  ))}
                  {failedUploads.length > 5 && (
                    <li>• And {failedUploads.length - 5} more...</li>
                  )}
                </ul>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      setIsRetrying(true);
                      const filesToRetry = [...failedUploads];
                      setFailedUploads([]); // Clear the list

                      // Retry all failed uploads
                      for (const { file, parentImageId } of filesToRetry) {
                        await uploadFile(file, parentImageId, 0);
                      }
                      setIsRetrying(false);
                    }}
                    disabled={isRetrying}
                  >
                    {isRetrying ? 'Retrying...' : `Retry All (${failedUploads.length})`}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFailedUploads([])}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Tips */}
        <Card className="bg-blue-50 border-blue-100 mb-6">
          <h4 className="font-semibold text-[#1e3a5f] mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tips for Best Results
          </h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-[#1e3a5f]">•</span>
              Take clear, well-lit photos showing locks and security features
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1e3a5f]">•</span>
              Include both wide shots and close-ups of locks/handles
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1e3a5f]">•</span>
              Use &quot;Add Related Photo&quot; to link detail shots to main images
            </li>
          </ul>
        </Card>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 py-4 border-t border-gray-200 -mx-4 px-4 space-y-2">
          <Button
            fullWidth
            size="lg"
            onClick={() => router.push('/analysis')}
            disabled={images.length === 0 || uploadingFiles.length > 0}
          >
            {uploadingFiles.length > 0 ? 'Uploading...' : `Analyze ${images.length} Photo${images.length !== 1 ? 's' : ''}`}
          </Button>

          {images.length > 0 && (
            <Button
              fullWidth
              size="lg"
              variant="outline"
              onClick={async () => {
                if (window.confirm('Are you sure you want to start a new scan? All current photos will be removed.')) {
                  await resetSession();
                  setFailedUploads([]);
                  router.push('/location');
                }
              }}
              disabled={uploadingFiles.length > 0}
            >
              Start New Scan
            </Button>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && sessionId && (
        <ImagePreviewModal
          image={previewImage}
          sessionId={sessionId}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
