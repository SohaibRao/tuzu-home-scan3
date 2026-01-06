import { NextRequest, NextResponse } from 'next/server';
import { getImageFromSession, getSession } from '@/lib/session-store';
import { getImageBuffer } from '@/lib/image-processor';

interface RouteParams {
  params: Promise<{
    sessionId: string;
    imageId: string;
  }>;
}

// GET - Serve thumbnail image
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

    // Read thumbnail file
    const buffer = await getImageBuffer(image.thumbnailPath);
    if (!buffer) {
      return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Thumbnail GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve thumbnail' }, { status: 500 });
  }
}
