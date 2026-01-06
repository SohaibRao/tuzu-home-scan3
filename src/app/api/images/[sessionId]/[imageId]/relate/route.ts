import { NextRequest, NextResponse } from 'next/server';
import { updateImageInSession, getSession, getImageFromSession } from '@/lib/session-store';
import { ApiResponse, Image } from '@/types';

interface RouteParams {
  params: Promise<{
    sessionId: string;
    imageId: string;
  }>;
}

// POST - Link child image to parent
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId, imageId } = await params;
    const body = await request.json();
    const { parentImageId } = body;

    if (!parentImageId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Parent image ID is required',
      }, { status: 400 });
    }

    // Validate session
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found or expired',
      }, { status: 404 });
    }

    // Validate child image exists
    const childImage = getImageFromSession(sessionId, imageId);
    if (!childImage) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child image not found',
      }, { status: 404 });
    }

    // Validate parent image exists
    const parentImage = getImageFromSession(sessionId, parentImageId);
    if (!parentImage) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Parent image not found',
      }, { status: 404 });
    }

    // Prevent self-referencing
    if (imageId === parentImageId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cannot link image to itself',
      }, { status: 400 });
    }

    // Prevent linking to another child image
    if (parentImage.parentImageId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cannot link to an image that is already a related image',
      }, { status: 400 });
    }

    // Update child image with parent reference
    const updatedSession = updateImageInSession(sessionId, imageId, {
      parentImageId,
    });

    if (!updatedSession) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to update image relationship',
      }, { status: 500 });
    }

    const updatedImage = updatedSession.images.find(img => img.id === imageId);

    return NextResponse.json<ApiResponse<Image>>({
      success: true,
      data: updatedImage,
    });
  } catch (error) {
    console.error('Relate error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to link images',
    }, { status: 500 });
  }
}
