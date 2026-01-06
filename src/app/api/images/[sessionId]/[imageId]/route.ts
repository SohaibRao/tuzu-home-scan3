import { NextRequest, NextResponse } from 'next/server';
import { getImageFromSession, getSession, removeImageFromSession } from '@/lib/session-store';
import { getImageBuffer } from '@/lib/image-processor';
import fs from 'fs/promises';

interface RouteParams {
  params: Promise<{
    sessionId: string;
    imageId: string;
  }>;
}

// GET - Serve original image
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId, imageId } = await params;

    // Validate session
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get image record
    const image = getImageFromSession(sessionId, imageId);
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Read image file
    const buffer = await getImageBuffer(image.storagePath);
    if (!buffer) {
      return NextResponse.json({ error: 'Image file not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Image GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve image' }, { status: 500 });
  }
}

// DELETE - Remove image from session
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId, imageId } = await params;

    // Validate session
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Get image record before deletion
    const image = getImageFromSession(sessionId, imageId);
    if (!image) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    // Try to delete the image files
    try {
      await fs.unlink(image.storagePath);
      await fs.unlink(image.thumbnailPath);
    } catch {
      // Files may not exist, continue with removal from session
    }

    // Remove from session (also removes child images)
    const updatedSession = removeImageFromSession(sessionId, imageId);

    if (!updatedSession) {
      return NextResponse.json({ success: false, error: 'Failed to remove image' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        removedImageId: imageId,
        remainingImages: updatedSession.images.length,
      },
    });
  } catch (error) {
    console.error('Image DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete image' }, { status: 500 });
  }
}
