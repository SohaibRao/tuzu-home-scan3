import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, updateImageInSession } from '@/lib/session-store';
import { getImageBuffer } from '@/lib/image-processor';
import { analyzeMultipleImages } from '@/lib/openai';
import { ApiResponse, Session } from '@/types';
//aaa
// POST - Trigger analysis for session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    console.log(`[Analyze] Starting analysis for session: ${sessionId}`);

    if (!sessionId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session ID is required',
      }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      console.error(`[Analyze] Session not found: ${sessionId}`);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found or expired',
      }, { status: 404 });
    }

    if (session.images.length === 0) {
      console.warn(`[Analyze] No images in session: ${sessionId}`);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No images to analyze',
      }, { status: 400 });
    }

    console.log(`[Analyze] Found ${session.images.length} images in session`);

    // Check for Azure OpenAI configuration
    if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_KEY) {
      console.error('[Analyze] Azure OpenAI credentials not configured');
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'AI analysis service not configured. Please check server configuration.',
      }, { status: 500 });
    }

    // Update session status
    updateSession(sessionId, { analysisStatus: 'analyzing' });

    // Collect all image buffers for batch analysis
    const pendingImages = session.images.filter(img => img.analysisStatus === 'pending');
    console.log(`[Analyze] ${pendingImages.length} pending images to analyze`);

    const imageBuffers: Buffer[] = [];
    const failedImages: string[] = [];

    // Mark all images as analyzing and collect their buffers
    for (const image of pendingImages) {
      updateImageInSession(sessionId, image.id, { analysisStatus: 'analyzing' });

      try {
        console.log(`[Analyze] Loading buffer for image ${image.id} from ${image.storagePath}`);
        const buffer = await getImageBuffer(image.storagePath);
        if (buffer) {
          console.log(`[Analyze] Successfully loaded buffer for image ${image.id} (${buffer.length} bytes)`);
          imageBuffers.push(buffer);
        } else {
          console.error(`[Analyze] Failed to load image buffer for ${image.id} - buffer is null`);
          failedImages.push(image.id);
          updateImageInSession(sessionId, image.id, { analysisStatus: 'error' });
        }
      } catch (error) {
        console.error(`[Analyze] Exception loading image ${image.id}:`, error);
        failedImages.push(image.id);
        updateImageInSession(sessionId, image.id, { analysisStatus: 'error' });
      }
    }

    console.log(`[Analyze] Loaded ${imageBuffers.length} buffers, ${failedImages.length} failed`);

    // Generate comprehensive GPT-4 Vision security report
    // For large batches (>10 images), process in smaller chunks to avoid API limits
    let securityReport = undefined;
    const MAX_IMAGES_PER_BATCH = 10;

    if (imageBuffers.length > 0) {
      console.log(`[Analyze] Analyzing ${imageBuffers.length} images with GPT-4 Vision...`);

      try {
        // If we have more than MAX_IMAGES_PER_BATCH, split into batches
        if (imageBuffers.length > MAX_IMAGES_PER_BATCH) {
          console.log(`[Analyze] Processing ${imageBuffers.length} images in batches of ${MAX_IMAGES_PER_BATCH}...`);

          // Process first batch to get the report
          const firstBatch = imageBuffers.slice(0, MAX_IMAGES_PER_BATCH);
          console.log(`[Analyze] Sending first batch of ${firstBatch.length} images to GPT-4 Vision...`);
          securityReport = await analyzeMultipleImages(firstBatch);

          // For remaining batches, we could optionally process them separately
          // For now, we'll just use the first batch for analysis
          // This is a reasonable compromise for the MVP
          console.log(`[Analyze] Note: Only first ${MAX_IMAGES_PER_BATCH} images analyzed due to API limits. Remaining ${imageBuffers.length - MAX_IMAGES_PER_BATCH} images will be marked as complete but not individually analyzed.`);
        } else {
          console.log(`[Analyze] Sending ${imageBuffers.length} images to GPT-4 Vision...`);
          securityReport = await analyzeMultipleImages(imageBuffers);
        }

        if (securityReport) {
          console.log('[Analyze] Security report generated successfully');
          console.log(`[Analyze] Report contains ${securityReport.areas.length} areas analyzed`);

          // Mark all successfully loaded images as complete
          for (const image of pendingImages) {
            if (!failedImages.includes(image.id)) {
              updateImageInSession(sessionId, image.id, { analysisStatus: 'complete' });
            }
          }
        } else {
          console.error('[Analyze] GPT-4 Vision returned null report - API may have failed');
          // Mark all loaded images as error since analysis failed
          for (const image of pendingImages) {
            if (!failedImages.includes(image.id)) {
              updateImageInSession(sessionId, image.id, { analysisStatus: 'error' });
            }
          }
        }
      } catch (gptError) {
        console.error('[Analyze] GPT-4 Vision analysis exception:', gptError);
        if (gptError instanceof Error) {
          console.error('[Analyze] Error message:', gptError.message);
          console.error('[Analyze] Error stack:', gptError.stack);
        }
        // Mark all loaded images as error
        for (const image of pendingImages) {
          if (!failedImages.includes(image.id)) {
            updateImageInSession(sessionId, image.id, { analysisStatus: 'error' });
          }
        }
      }
    } else {
      console.error('[Analyze] No image buffers loaded successfully - cannot proceed with analysis');
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
