import { AzureVisionResponse, ImageAnalysis, Tag, DetectedObject } from '@/types';

const AZURE_VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT;
const AZURE_VISION_KEY = process.env.AZURE_VISION_KEY;

// Visual features to request from Azure AI Vision
const VISUAL_FEATURES = ['caption', 'denseCaptions', 'tags', 'objects', 'read'];

export async function analyzeImage(imageBuffer: Buffer): Promise<AzureVisionResponse> {
  if (!AZURE_VISION_ENDPOINT || !AZURE_VISION_KEY) {
    throw new Error('Azure Vision API credentials not configured');
  }

  const endpoint = `${AZURE_VISION_ENDPOINT}/computervision/imageanalysis:analyze`;
  const params = new URLSearchParams({
    'api-version': '2024-02-01',
    'features': VISUAL_FEATURES.join(','),
    'language': 'en',
  });

  const response = await fetch(`${endpoint}?${params}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_VISION_KEY,
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(imageBuffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Vision API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export function processAzureResponse(azureResponse: AzureVisionResponse): {
  tags: Tag[];
  caption: string;
  detectedObjects: DetectedObject[];
} {
  // Extract tags
  const tags: Tag[] = azureResponse.tagsResult?.values?.map(tag => ({
    name: tag.name,
    confidence: tag.confidence,
  })) || [];

  // Extract caption
  const caption = azureResponse.captionResult?.text || 'No caption available';

  // Extract detected objects (filter out any without a valid name)
  const detectedObjects: DetectedObject[] = (azureResponse.objectsResult?.values || [])
    .filter(obj => obj.tags?.[0]?.name || obj.object)
    .map(obj => ({
      name: obj.tags?.[0]?.name || obj.object || 'unknown',
      confidence: obj.tags?.[0]?.confidence || obj.confidence || 0,
      boundingBox: obj.boundingBox ? {
        x: obj.boundingBox.x,
        y: obj.boundingBox.y,
        w: obj.boundingBox.w,
        h: obj.boundingBox.h,
      } : undefined,
    }));

  return { tags, caption, detectedObjects };
}

// Security-related keywords for risk assessment
const SECURITY_POSITIVE_KEYWORDS = [
  'lock', 'deadbolt', 'security', 'reinforced', 'metal', 'steel',
  'alarm', 'camera', 'sensor', 'bolt', 'chain', 'keypad',
  'smart lock', 'double glazed', 'tempered', 'bars', 'grille',
  'peephole', 'intercom', 'video doorbell', 'motion sensor'
];

const SECURITY_NEGATIVE_KEYWORDS = [
  'broken', 'damaged', 'crack', 'rust', 'old', 'worn',
  'unlocked', 'open', 'gap', 'hole', 'weak', 'rotted',
  'single pane', 'flimsy', 'loose'
];

const VULNERABILITY_KEYWORDS = [
  'window', 'door', 'glass', 'wooden', 'sliding', 'basement',
  'ground floor', 'accessible', 'low', 'entry point'
];

export function calculateRiskScore(
  tags: Tag[],
  caption: string,
  detectedObjects: DetectedObject[],
  locationRiskFactor: number = 1 // 0.8 = lower risk area, 1.2 = higher risk area
): ImageAnalysis {
  const allText = [
    caption?.toLowerCase() || '',
    ...tags.map(t => t.name?.toLowerCase() || ''),
    ...detectedObjects.map(o => o.name?.toLowerCase() || ''),
  ].join(' ');

  let score = 5; // Start neutral
  const riskNotes: string[] = [];
  const recommendations: string[] = [];

  // Check for positive security features
  const foundPositives = SECURITY_POSITIVE_KEYWORDS.filter(kw => allText.includes(kw));
  if (foundPositives.length > 0) {
    score += foundPositives.length * 0.5;
    riskNotes.push(`Security features detected: ${foundPositives.join(', ')}`);
  }

  // Check for negative security indicators
  const foundNegatives = SECURITY_NEGATIVE_KEYWORDS.filter(kw => allText.includes(kw));
  if (foundNegatives.length > 0) {
    score -= foundNegatives.length * 0.7;
    riskNotes.push(`Potential issues detected: ${foundNegatives.join(', ')}`);
    recommendations.push('Consider addressing the identified damage or wear issues');
  }

  // Check for vulnerability points
  const foundVulnerabilities = VULNERABILITY_KEYWORDS.filter(kw => allText.includes(kw));
  if (foundVulnerabilities.length > 0 && foundPositives.length === 0) {
    score -= 1;
    riskNotes.push('Entry point detected without visible security features');
    recommendations.push('Consider adding visible security measures to this entry point');
  }

  // Specific recommendations based on detected items
  if (allText.includes('window') && !allText.includes('lock')) {
    recommendations.push('Add window locks for enhanced security');
  }

  if (allText.includes('door') && !allText.includes('deadbolt')) {
    recommendations.push('Consider installing a deadbolt for added door security');
  }

  if (allText.includes('glass') && !allText.includes('tempered') && !allText.includes('reinforced')) {
    recommendations.push('Consider security film or reinforced glass for vulnerable windows');
  }

  if (allText.includes('sliding')) {
    recommendations.push('Add a security bar or pin lock to sliding doors/windows');
  }

  // Apply location risk factor
  score = score * locationRiskFactor;

  // Clamp score between 1 and 10
  score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

  // Determine risk level
  let riskLevel: 'high' | 'medium' | 'low';
  if (score <= 3) {
    riskLevel = 'high';
  } else if (score <= 6) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Add general note if no specific issues found
  if (riskNotes.length === 0) {
    riskNotes.push('Standard security assessment - no significant features or issues detected');
    recommendations.push('Consider a professional security assessment for detailed recommendations');
  }

  return {
    azureResponse: {},
    tags,
    caption,
    detectedObjects,
    riskScore: score,
    riskLevel,
    riskNotes,
    recommendations: [...new Set(recommendations)], // Remove duplicates
  };
}

export function calculateOverallRiskScore(analyses: ImageAnalysis[]): number {
  if (analyses.length === 0) return 5;

  // Calculate weighted average based on risk level
  const weights = { high: 2, medium: 1.5, low: 1 };
  let totalWeight = 0;
  let weightedSum = 0;

  for (const analysis of analyses) {
    const weight = weights[analysis.riskLevel];
    weightedSum += analysis.riskScore * weight;
    totalWeight += weight;
  }

  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
