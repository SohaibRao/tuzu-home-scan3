import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession, updateSession } from '@/lib/session-store';
import { ApiResponse, Session, Location } from '@/types';

// GET - Retrieve session
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('id');

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

    return NextResponse.json<ApiResponse<Session>>({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to retrieve session',
    }, { status: 500 });
  }
}

// POST - Create new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session ID is required',
      }, { status: 400 });
    }

    // Check if session already exists
    const existingSession = getSession(id);
    if (existingSession) {
      return NextResponse.json<ApiResponse<Session>>({
        success: true,
        data: existingSession,
      });
    }

    const session = createSession(id);

    return NextResponse.json<ApiResponse<Session>>({
      success: true,
      data: session,
    }, { status: 201 });
  } catch (error) {
    console.error('Session POST error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to create session',
    }, { status: 500 });
  }
}

// PATCH - Update session (location, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, location, analysisStatus } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session ID is required',
      }, { status: 400 });
    }

    const updates: Partial<Session> = {};

    if (location) {
      updates.location = location as Location;
    }

    if (analysisStatus) {
      updates.analysisStatus = analysisStatus;
    }

    const session = updateSession(id, updates);

    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found or expired',
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<Session>>({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Session PATCH error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update session',
    }, { status: 500 });
  }
}
