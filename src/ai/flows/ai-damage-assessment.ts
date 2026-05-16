'use server';
/**
 * @fileOverview AI agent for assessing municipal issues from images.
 * Uses Groq API (free) with Llama vision model — no Genkit/Gemini required.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export type AIDamageAssessmentInput = {
  mediaDataUri: string;
};

export type AIDamageAssessmentOutput = {
  damageDetected: boolean;
  damageCategory: string;
  severity: 'Low' | 'Medium' | 'High';
  verificationSuggestion: 'Likely genuine' | 'Needs manual verification';
  description: string;
  suggestedDepartment: 'Engineering' | 'Water Supply' | 'Drainage' | 'Electricity' | 'Traffic' | 'Unassigned';
  suggestedPriority: 'Low' | 'Medium' | 'High' | 'Critical';
  duplicateSuggestion: string;
};

const FALLBACK: AIDamageAssessmentOutput = {
  damageDetected: false,
  damageCategory: 'None',
  severity: 'Low',
  verificationSuggestion: 'Needs manual verification',
  description: 'AI analysis is temporarily unavailable. Please manually select the correct problem category (e.g., Garbage/Debris, Pothole, Crack, Streetlight Issue) and write a description based on your photo.',
  suggestedDepartment: 'Unassigned',
  suggestedPriority: 'Medium',
  duplicateSuggestion: 'Unable to assess — manual verification required.',
};

export async function aiDamageAssessment(input: AIDamageAssessmentInput): Promise<AIDamageAssessmentOutput> {
  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set in .env');
    return FALLBACK;
  }

  // Parse data URI
  const match = input.mediaDataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    console.error('Invalid mediaDataUri format');
    return FALLBACK;
  }
  const [, mediaType, base64Data] = match;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // free Groq vision model
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64Data}`,
                },
              },
              {
                type: 'text',
                text: `You are an expert AI assistant for a municipal corporation.
Look at this image and identify what civic issue is visible. Do NOT assume it is a road problem.

CATEGORY RULES — match ONLY to what you actually see:
- Garbage, trash, litter, waste bags, dumped rubbish → "Garbage/Debris"
- Hole or depression in road → "Pothole"
- Cracks or fractures on road → "Crack"
- Crumbling or broken road surface → "Surface failure"
- Standing water or flooding → "Water-logged damage"
- Broken or non-functional streetlight → "Streetlight Issue"
- No issue visible or unclear image → "None"

CRITICAL RULE: If you see garbage or waste material → category MUST be "Garbage/Debris". Never classify it as road damage.

DEPARTMENT MAPPING:
- Pothole / Crack / Surface failure → Engineering
- Water-logged damage → Drainage
- Garbage/Debris → Traffic
- Streetlight Issue → Electricity
- Unsure → Unassigned

Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation — just the raw JSON:
{
  "damageDetected": true or false,
  "damageCategory": "Pothole" | "Crack" | "Surface failure" | "Water-logged damage" | "Garbage/Debris" | "Streetlight Issue" | "None",
  "severity": "Low" | "Medium" | "High",
  "verificationSuggestion": "Likely genuine" | "Needs manual verification",
  "description": "2-5 sentences: what you see, its extent, public impact, and urgency",
  "suggestedDepartment": "Engineering" | "Water Supply" | "Drainage" | "Electricity" | "Traffic" | "Unassigned",
  "suggestedPriority": "Low" | "Medium" | "High" | "Critical",
  "duplicateSuggestion": "brief note on duplicate likelihood"
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Groq API error ${response.status}:`, errText);
      return FALLBACK;
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';

    // Strip accidental markdown fences
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // Validate each field with safe fallbacks
    const validCategories = ['Pothole', 'Crack', 'Surface failure', 'Water-logged damage', 'Garbage/Debris', 'Streetlight Issue', 'None'];
    const validDepts     = ['Engineering', 'Water Supply', 'Drainage', 'Electricity', 'Traffic', 'Unassigned'];
    const validSeverities = ['Low', 'Medium', 'High'];
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

    return {
      damageDetected:        Boolean(parsed.damageDetected),
      damageCategory:        validCategories.includes(parsed.damageCategory) ? parsed.damageCategory : 'None',
      severity:              validSeverities.includes(parsed.severity) ? parsed.severity : 'Low',
      verificationSuggestion: parsed.verificationSuggestion === 'Likely genuine' ? 'Likely genuine' : 'Needs manual verification',
      description:           String(parsed.description || 'Please verify manually.'),
      suggestedDepartment:   validDepts.includes(parsed.suggestedDepartment) ? parsed.suggestedDepartment : 'Unassigned',
      suggestedPriority:     validPriorities.includes(parsed.suggestedPriority) ? parsed.suggestedPriority : 'Medium',
      duplicateSuggestion:   String(parsed.duplicateSuggestion || 'Manual verification recommended.'),
    };

  } catch (error: any) {
    console.error('Groq API call failed:', error?.message);
    return FALLBACK;
  }
}