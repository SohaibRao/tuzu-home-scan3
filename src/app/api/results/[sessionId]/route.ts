import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';
import { ApiResponse, Session, Image, ImageAnalysis, SecurityReport } from '@/types';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

interface GroupedResults {
  primaryImage: Image;
  relatedImages: Image[];
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
  pendingCount: number;
  securityReport?: SecurityReport; // GPT-4 Vision professional security report
}

// GET - Retrieve analysis results for session
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId } = await params;

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Session not found or expired',
      }, { status: 404 });
    }

    // Group images by parent
    const groupedResults = groupImagesByParent(session.images);

    // Collect all unique recommendations
    const allRecommendations = collectRecommendations(session.images);

    // Calculate counts
    const completedCount = session.images.filter(img => img.analysisStatus === 'complete').length;
    const errorCount = session.images.filter(img => img.analysisStatus === 'error').length;
    const pendingCount = session.images.filter(img =>
      img.analysisStatus === 'pending' || img.analysisStatus === 'analyzing'
    ).length;

    // Determine overall risk level from security report if available
    let overallRiskScore = 5;
    let overallRiskLevel: 'high' | 'medium' | 'low' = 'medium';

    if (session.securityReport) {
      // Map exposure risk to numeric score
      const exposureToScore = {
        'Very Low': 9,
        'Low': 7,
        'Medium': 5,
        'High': 3,
        'Very High': 1,
      };
      overallRiskScore = exposureToScore[session.securityReport.header.overallExposureRisk] || 5;

      // Map exposure risk to level
      if (session.securityReport.header.overallExposureRisk === 'Very High' ||
          session.securityReport.header.overallExposureRisk === 'High') {
        overallRiskLevel = 'high';
      } else if (session.securityReport.header.overallExposureRisk === 'Medium') {
        overallRiskLevel = 'medium';
      } else {
        overallRiskLevel = 'low';
      }
    }

    const summary: ResultsSummary = {
      session,
      overallRiskScore,
      overallRiskLevel,
      groupedResults,
      allRecommendations,
      completedCount,
      errorCount,
      pendingCount,
      securityReport: session.securityReport,
    };

    return NextResponse.json<ApiResponse<ResultsSummary>>({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Results GET error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to retrieve results',
    }, { status: 500 });
  }
}

function groupImagesByParent(images: Image[]): GroupedResults[] {
  const groups: GroupedResults[] = [];
  const processedIds = new Set<string>();

  // First, find all primary images (no parentImageId)
  const primaryImages = images.filter(img => !img.parentImageId);

  for (const primary of primaryImages) {
    processedIds.add(primary.id);

    // Find related images
    const related = images.filter(img => img.parentImageId === primary.id);
    related.forEach(img => processedIds.add(img.id));

    // Calculate combined risk score for the group
    const groupImages = [primary, ...related];
    const { combinedRiskScore, combinedRiskLevel } = calculateGroupRisk(groupImages);

    groups.push({
      primaryImage: primary,
      relatedImages: related,
      combinedRiskScore,
      combinedRiskLevel,
    });
  }

  // Handle orphaned images (have parentImageId but parent doesn't exist)
  const orphanedImages = images.filter(
    img => img.parentImageId && !processedIds.has(img.id)
  );

  for (const orphan of orphanedImages) {
    const { combinedRiskScore, combinedRiskLevel } = calculateGroupRisk([orphan]);

    groups.push({
      primaryImage: orphan,
      relatedImages: [],
      combinedRiskScore,
      combinedRiskLevel,
    });
  }

  return groups;
}

function calculateGroupRisk(images: Image[]): {
  combinedRiskScore: number;
  combinedRiskLevel: 'high' | 'medium' | 'low';
} {
  const analyses = images
    .filter(img => img.analysis)
    .map(img => img.analysis!);

  if (analyses.length === 0) {
    return { combinedRiskScore: 5, combinedRiskLevel: 'medium' };
  }

  // Weight by risk level (prioritize lower scores)
  const weights = { high: 2, medium: 1.5, low: 1 };
  let totalWeight = 0;
  let weightedSum = 0;

  for (const analysis of analyses) {
    const weight = weights[analysis.riskLevel];
    weightedSum += analysis.riskScore * weight;
    totalWeight += weight;
  }

  const combinedRiskScore = Math.round((weightedSum / totalWeight) * 10) / 10;

  let combinedRiskLevel: 'high' | 'medium' | 'low';
  if (combinedRiskScore <= 3) {
    combinedRiskLevel = 'high';
  } else if (combinedRiskScore <= 6) {
    combinedRiskLevel = 'medium';
  } else {
    combinedRiskLevel = 'low';
  }

  return { combinedRiskScore, combinedRiskLevel };
}

function collectRecommendations(images: Image[]): string[] {
  const recommendations = new Set<string>();

  for (const image of images) {
    if (image.analysis?.recommendations) {
      image.analysis.recommendations.forEach(rec => recommendations.add(rec));
    }
  }

  return Array.from(recommendations);
}
