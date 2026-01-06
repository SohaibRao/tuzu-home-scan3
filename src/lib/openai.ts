import {
  SecurityReport,
  GPT4VisionAnalysis,
  ExposureRisk,
  ConfidenceLevel,
  EffortCostLevel,
  AreaAnalysis,
  PrioritizedRecommendation,
} from '@/types';

// Azure OpenAI Configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

// Security Auditor System Prompt
const SECURITY_AUDITOR_SYSTEM_PROMPT = `You are Tuzu Security Auditor, a specialised AI designed to assist homeowners in evaluating the physical and environmental security exposure of their property by reviewing photos of:

- Doors
- Windows
- Yards
- Lighting
- Fences
- Garages
- Related exterior features

PRIMARY ROLE:
You act like a professional property security inspector, identifying observable vulnerabilities only, such as:
- Access points
- Visibility limitations
- Lighting gaps
- Approach paths
- Perimeter weaknesses

You do not speculate about unseen areas, individuals, intent, or criminal behaviour.

ASSESSMENT METHOD:
1. Identify visible vulnerabilities first
2. Then consider: Deterrence, Convenience, Balance between security and usability
3. All conclusions must be grounded in what is visible or reasonably inferable from the provided material

If images are unclear or incomplete:
- State limitations plainly
- Explain what cannot be assessed
- Note what additional images would improve accuracy

EXPOSURE RISK CLASSIFICATION (use these exact values):
- Very Low
- Low
- Medium
- High
- Very High

Each rating must include a CONFIDENCE LEVEL:
- High
- Medium
- Low

TONE & CONSTRAINTS:
- Direct, practical, and proportionate
- No fear-based language
- No exaggeration
- No brand bias
- Respect cost, effort, and homeowner practicality
- Clear technical explanations where helpful
- Calm, inspector-style communication

EFFORT AND COST LEVELS (for recommendations):
- Low
- Medium
- High

RESPONSE FORMAT:
You MUST respond with valid JSON only. No markdown, no extra text. Use this exact structure:

{
  "header": {
    "overallExposureRisk": "Very Low|Low|Medium|High|Very High",
    "overallConfidence": "High|Medium|Low",
    "summary": "One-line overview of general exposure and key issue",
    "date": "DD/MM/YYYY",
    "areasAnalyzed": number
  },
  "areas": [
    {
      "area": "Area Name (e.g., Front Door, Windows, Garage, Perimeter, Lighting)",
      "exposureRisk": "Very Low|Low|Medium|High|Very High",
      "confidence": "High|Medium|Low",
      "notes": "Concise observation summary",
      "recommendation": "Specific improvement suggestion",
      "effort": "Low|Medium|High",
      "cost": "Low|Medium|High"
    }
  ],
  "prioritizedRecommendations": [
    {
      "recommendation": "Specific actionable recommendation",
      "effort": "Low|Medium|High",
      "cost": "Low|Medium|High",
      "priority": 1
    }
  ],
  "conclusion": "Closing summary with key action items and overall assessment",
  "limitations": ["List any assessment limitations due to image quality or visibility"]
}

AREAS TO ANALYZE (if visible in the image):
- Doors: Entry points, locks, frames, materials, reinforcement
- Windows: Type, locks, accessibility, ground floor exposure, glass type
- Garage: Door type, security features, access points
- Perimeter: Fences, gates, hedges, boundary security
- Lighting: Coverage, motion sensors, dark spots
- Other: Any other security-relevant observations`;


// Parse the GPT response into a SecurityReport
function parseSecurityReport(response: string): SecurityReport | null {
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in GPT response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and transform the response
    const report: SecurityReport = {
      header: {
        overallExposureRisk: validateExposureRisk(parsed.header?.overallExposureRisk),
        overallConfidence: validateConfidence(parsed.header?.overallConfidence),
        summary: parsed.header?.summary || 'Security assessment completed.',
        date: parsed.header?.date || new Date().toLocaleDateString('en-GB'),
        areasAnalyzed: parsed.areas?.length || 0,
      },
      areas: (parsed.areas || []).map((area: Record<string, unknown>) => ({
        area: String(area.area || 'Unknown Area'),
        exposureRisk: validateExposureRisk(area.exposureRisk),
        confidence: validateConfidence(area.confidence),
        notes: String(area.notes || ''),
        recommendation: String(area.recommendation || ''),
        effort: validateEffortCost(area.effort),
        cost: validateEffortCost(area.cost),
      })) as AreaAnalysis[],
      prioritizedRecommendations: (parsed.prioritizedRecommendations || []).map(
        (rec: Record<string, unknown>, index: number) => ({
          recommendation: String(rec.recommendation || ''),
          effort: validateEffortCost(rec.effort),
          cost: validateEffortCost(rec.cost),
          priority: Number(rec.priority) || index + 1,
        })
      ) as PrioritizedRecommendation[],
      conclusion: parsed.conclusion || 'Assessment complete.',
      limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
    };

    return report;
  } catch (error) {
    console.error('Failed to parse GPT security report:', error);
    return null;
  }
}

// Validation helpers
function validateExposureRisk(value: unknown): ExposureRisk {
  const valid: ExposureRisk[] = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
  if (typeof value === 'string' && valid.includes(value as ExposureRisk)) {
    return value as ExposureRisk;
  }
  return 'Medium';
}

function validateConfidence(value: unknown): ConfidenceLevel {
  const valid: ConfidenceLevel[] = ['High', 'Medium', 'Low'];
  if (typeof value === 'string' && valid.includes(value as ConfidenceLevel)) {
    return value as ConfidenceLevel;
  }
  return 'Medium';
}

function validateEffortCost(value: unknown): EffortCostLevel {
  const valid: EffortCostLevel[] = ['Low', 'Medium', 'High'];
  if (typeof value === 'string' && valid.includes(value as EffortCostLevel)) {
    return value as EffortCostLevel;
  }
  return 'Medium';
}

// Main function to analyze a single image with GPT-4 Vision (Azure OpenAI)
export async function analyzeImageWithGPT4Vision(
  imageBuffer: Buffer
): Promise<GPT4VisionAnalysis> {
  const startTime = Date.now();

  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY) {
    return {
      rawResponse: '',
      parsedReport: null,
      processingTime: Date.now() - startTime,
      error: 'Azure OpenAI credentials not configured',
    };
  }

  try {
    const base64Image = imageBuffer.toString('base64');
    const userPrompt = 'Analyze this property image for security vulnerabilities and provide a professional security assessment.';

    // Azure OpenAI endpoint format
    const endpoint = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_KEY,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: SECURITY_AUDITOR_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.3, // Lower for more consistent analysis
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawResponse = data.choices?.[0]?.message?.content || '';

    const parsedReport = parseSecurityReport(rawResponse);

    return {
      rawResponse,
      parsedReport,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('GPT-4 Vision analysis failed:', error);
    return {
      rawResponse: '',
      parsedReport: null,
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Analyze multiple images and generate aggregate report (Azure OpenAI)
export async function analyzeMultipleImages(
  imageBuffers: Buffer[]
): Promise<SecurityReport | null> {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY || imageBuffers.length === 0) {
    return null;
  }

  try {
    // Build content array with all images
    const imageContents = imageBuffers.map((buffer) => {
      const base64Image = buffer.toString('base64');
      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
          detail: 'high' as const,
        },
      };
    });

    const userPrompt = `Analyze these ${imageBuffers.length} property images for security vulnerabilities and provide a comprehensive professional security assessment covering all visible areas.`;

    // Azure OpenAI endpoint format
    const endpoint = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_KEY,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: SECURITY_AUDITOR_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawResponse = data.choices?.[0]?.message?.content || '';

    return parseSecurityReport(rawResponse);
  } catch (error) {
    console.error('GPT-4 Vision multi-image analysis failed:', error);
    return null;
  }
}

