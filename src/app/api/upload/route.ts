import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { processAndStoreImage } from '@/lib/image-processor';
import { addImageToSession, getSession } from '@/lib/session-store';
import { ApiResponse, Image, UploadResponse } from '@/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
const MAX_IMAGES_PER_SESSION = parseInt(process.env.MAX_IMAGES_PER_SESSION || '30');

export async function POST(request: NextRequest) {
  let sessionId: string | null = null;
  let file: File | null = null;

  try {
    const formData = await request.formData();
    file = formData.get('file') as File | null;
    sessionId = formData.get('sessionId') as string | null;
    const parentImageId = formData.get('parentImageId') as string | null;

    // Validate session
    if (!sessionId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session ID is required',
      }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found or expired',
      }, { status: 404 });
    }

    // Check image limit
    if (session.images.length >= MAX_IMAGES_PER_SESSION) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Maximum ${MAX_IMAGES_PER_SESSION} images per session`,
      }, { status: 400 });
    }

    // Validate file
    if (!file) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No file provided',
      }, { status: 400 });
    }

    // Check file type
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const isHEIC = fileName.endsWith('.heic');

    if (!ALLOWED_TYPES.includes(fileType) && !isHEIC) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid file type. Allowed: JPG, JPEG, PNG, HEIC',
      }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'File too large. Maximum 10MB',
      }, { status: 400 });
    }

    // Process image
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processAndStoreImage(buffer, file.name, sessionId);

    // Create image record
    const image: Image = {
      id: processed.id,
      sessionId,
      parentImageId: parentImageId || undefined,
      originalFilename: processed.originalFilename,
      storagePath: processed.originalPath,
      thumbnailPath: processed.thumbnailPath,
      uploadedAt: new Date(),
      analysisStatus: 'pending',
    };

    // Add to session
    addImageToSession(sessionId, image);

    return NextResponse.json<ApiResponse<UploadResponse>>({
      success: true,
      data: {
        imageId: image.id,
        thumbnailUrl: `/api/images/${sessionId}/${image.id}/thumbnail`,
        originalUrl: `/api/images/${sessionId}/${image.id}`,
      },
    }, { status: 201 });
  } catch (error) {
    // Enhanced error logging with details
    console.error('Upload error occurred:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      sessionId,
      filename: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      timestamp: new Date().toISOString(),
    });

    // Categorize and return specific error messages
    let errorMessage = 'Failed to upload image';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('ENOSPC')) {
        errorMessage = 'Server storage full - please try again later';
        statusCode = 507;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Image processing timeout - file may be too large';
        statusCode = 408;
      } else if (error.message.includes('memory')) {
        errorMessage = 'Server memory limit exceeded - try a smaller image';
        statusCode = 413;
      } else if (error.message.toLowerCase().includes('format') || error.message.toLowerCase().includes('invalid')) {
        errorMessage = 'Invalid or corrupted image file';
        statusCode = 400;
      } else {
        // Include error details in development
        errorMessage = process.env.NODE_ENV === 'development'
          ? `Upload failed: ${error.message}`
          : 'Failed to upload image';
      }
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    }, { status: statusCode });
  }
}
