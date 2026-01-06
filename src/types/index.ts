// Re-export Security Report types
export * from './security-report';
import type { SecurityReport, GPT4VisionAnalysis } from './security-report';

// Session Types
export interface Location {
  suburb?: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  source: 'auto' | 'manual';
}

export interface Session {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  location?: Location;
  images: Image[];
  analysisStatus: 'pending' | 'analyzing' | 'complete' | 'error';
  securityReport?: SecurityReport; // GPT-4 Vision professional security report
}

// Image Types
export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface Tag {
  name: string;
  confidence: number;
}

export interface ImageAnalysis {
  azureResponse: unknown;
  tags: Tag[];
  caption: string;
  detectedObjects: DetectedObject[];
  riskScore: number; // 1-10 (1 = high risk, 10 = very secure)
  riskLevel: 'high' | 'medium' | 'low';
  riskNotes: string[];
  recommendations: string[];
  gpt4Analysis?: GPT4VisionAnalysis; // GPT-4 Vision security analysis
}

export interface Image {
  id: string;
  sessionId: string;
  parentImageId?: string;
  originalFilename: string;
  storagePath: string;
  thumbnailPath: string;
  uploadedAt: Date;
  analysisStatus: 'pending' | 'analyzing' | 'complete' | 'error';
  analysis?: ImageAnalysis; // Deprecated: kept for backward compatibility
  gpt4Analysis?: GPT4VisionAnalysis; // GPT-4 Vision analysis for individual image
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UploadResponse {
  imageId: string;
  thumbnailUrl: string;
  originalUrl: string;
}

export interface AnalysisProgress {
  total: number;
  completed: number;
  current?: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
}

// Azure AI Vision Types
export interface AzureVisionTag {
  name: string;
  confidence: number;
}

export interface AzureVisionCaption {
  text: string;
  confidence: number;
}

export interface AzureVisionObject {
  // API 4.0 structure
  tags?: Array<{
    name: string;
    confidence: number;
  }>;
  boundingBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  // Legacy API structure (for backward compatibility)
  rectangle?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  object?: string;
  confidence?: number;
}

export interface AzureVisionResponse {
  modelVersion: string;
  captionResult?: {
    text: string;
    confidence: number;
  };
  denseCaptionsResult?: {
    values: Array<{
      text: string;
      confidence: number;
      boundingBox: BoundingBox;
    }>;
  };
  tagsResult?: {
    values: AzureVisionTag[];
  };
  objectsResult?: {
    values: AzureVisionObject[];
  };
  readResult?: {
    stringIndexType: string;
    content: string;
    pages: unknown[];
  };
}
