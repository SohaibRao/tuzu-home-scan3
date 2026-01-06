import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, updateImageInSession } from '@/lib/session-store';
import { getImageBuffer } from '@/lib/image-processor';
import { analyzeMultipleImages } from '@/lib/openai';
import { ApiResponse, Session } from '@/types';

// POST - Trigger analysis for session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

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

    if (session.images.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No images to analyze',
      }, { status: 400 });
    }

    // Update session status
    updateSession(sessionId, { analysisStatus: 'analyzing' });

    // Collect all image buffers for batch analysis
    const pendingImages = session.images.filter(img => img.analysisStatus === 'pending');
    const imageBuffers: Buffer[] = [];

    // Mark all images as analyzing and collect their buffers
    for (const image of pendingImages) {
      updateImageInSession(sessionId, image.id, { analysisStatus: 'analyzing' });

      try {
        const buffer = await getImageBuffer(image.storagePath);
        if (buffer) {
          imageBuffers.push(buffer);
        } else {
          updateImageInSession(sessionId, image.id, { analysisStatus: 'error' });
        }
      } catch (error) {
        console.error(`Failed to load image ${image.id}:`, error);
        updateImageInSession(sessionId, image.id, { analysisStatus: 'error' });
      }
    }

    // Generate comprehensive GPT-4 Vision security report for ALL images in one call
    let securityReport = undefined;

    if (imageBuffers.length > 0) {
      console.log(`Analyzing ${imageBuffers.length} images with GPT-4 Vision...`);

      try {
        securityReport = await analyzeMultipleImages(imageBuffers);
        if (securityReport) {
          console.log('Security report generated successfully');

          // Mark all images as complete
          for (const image of pendingImages) {
            updateImageInSession(sessionId, image.id, { analysisStatus: 'complete' });
          }
        } else {
          console.warn('GPT-4 Vision returned null report');
          // Mark all as error since analysis failed
          for (const image of pendingImages) {
            updateImageInSession(sessionId, image.id, { analysisStatus: 'error' });
          }
        }
      } catch (gptError) {
        console.error('GPT-4 Vision analysis failed:', gptError);
        // Mark all as error
        for (const image of pendingImages) {
          updateImageInSession(sessionId, image.id, { analysisStatus: 'error' });
        }
      }
    }

    // Update session with final status
    updateSession(sessionId, {
      analysisStatus: imageBuffers.length > 0 && securityReport ? 'complete' : 'error',
      securityReport: securityReport || undefined,
    });

    // Get final session state
    const finalSession = getSession(sessionId);

    return NextResponse.json<ApiResponse<Session>>({
      success: true,
      data: finalSession,
    });
  } catch (error) {
    console.error('Analyze error:', error);

    // Try to update session status on error
    try {
      const { sessionId } = await request.json();
      if (sessionId) {
        updateSession(sessionId, { analysisStatus: 'error' });
      }
    } catch {
      // Ignore errors in error handling
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to analyze images',
    }, { status: 500 });
  }
}
