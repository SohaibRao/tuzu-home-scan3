// Security Report Types for Tuzu Security Auditor

export type ExposureRisk = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type EffortCostLevel = 'Low' | 'Medium' | 'High';

export interface AreaAnalysis {
  area: string;
  exposureRisk: ExposureRisk;
  confidence: ConfidenceLevel;
  notes: string;
  recommendation: string;
  effort: EffortCostLevel;
  cost: EffortCostLevel;
}

export interface SecurityReportHeader {
  overallExposureRisk: ExposureRisk;
  overallConfidence: ConfidenceLevel;
  summary: string;
  date: string;
  areasAnalyzed: number;
}

export interface SecurityReport {
  header: SecurityReportHeader;
  areas: AreaAnalysis[];
  prioritizedRecommendations: PrioritizedRecommendation[];
  conclusion: string;
  limitations?: string[];
}

export interface PrioritizedRecommendation {
  recommendation: string;
  effort: EffortCostLevel;
  cost: EffortCostLevel;
  priority: number;
}

// Context passed from Azure Vision to GPT-4
export interface VisionContext {
  tags: Array<{ name: string; confidence: number }>;
  caption: string;
  objects: Array<{
    name: string;
    confidence: number;
    location?: { x: number; y: number; w: number; h: number };
  }>;
}

// GPT-4 Vision analysis result
export interface GPT4VisionAnalysis {
  rawResponse: string;
  parsedReport: SecurityReport | null;
  processingTime: number;
  error?: string;
}
