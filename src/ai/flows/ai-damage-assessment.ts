'use server';
/**
 * @fileOverview AI agent for assessing municipal issues from images.
 * Primary: Uses Gemini 2.5 Flash vision model with GEMINI_API_KEY.
 * Fallback: Uses Groq API or safe default fallback object.
 */

export type AIDamageAssessmentInput = {
  mediaDataUri: string;
};

export type AIDamageAssessmentOutput = {
  damageDetected: boolean;
  damageCategory: string;
  severity: 'Low' | 'Medium' | 'High';
  verificationSuggestion: 'Likely genuine' | 'Needs manual verification';
  description: string;
  suggestedDepartment:
    | 'Engineering'
    | 'Sanitation'
    | 'Electrical'
    | 'Water Supply'
    | 'Parks & Environment'
    | 'Traffic & Roads'
    | 'Public Works'
    | 'Unassigned';
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

const SYSTEM_PROMPT = `You are an expert AI assistant for a municipal corporation.
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
- Water-logged damage → Water Supply
- Garbage/Debris → Sanitation
- Streetlight Issue → Electrical
- Unsure → Unassigned

Respond ONLY with a valid JSON object matching this schema:
{
  "damageDetected": true or false,
  "damageCategory": "Pothole" | "Crack" | "Surface failure" | "Water-logged damage" | "Garbage/Debris" | "Streetlight Issue" | "None",
  "severity": "Low" | "Medium" | "High",
  "verificationSuggestion": "Likely genuine" | "Needs manual verification",
  "description": "2-5 sentences: what you see, its extent, public impact, and urgency",
  "suggestedDepartment": "Engineering" | "Sanitation" | "Electrical" | "Water Supply" | "Parks & Environment" | "Traffic & Roads" | "Public Works" | "Unassigned",
  "suggestedPriority": "Low" | "Medium" | "High" | "Critical",
  "duplicateSuggestion": "brief note on duplicate likelihood"
}`;

export async function aiDamageAssessment(input: AIDamageAssessmentInput): Promise<AIDamageAssessmentOutput> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  // Parse data URI
  const match = input.mediaDataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    console.error('Invalid mediaDataUri format');
    return FALLBACK;
  }
  const [, mediaType, base64Data] = match;

  // 1. Try Gemini Vision Model (Primary)
  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mediaType, data: base64Data } },
                  { text: SYSTEM_PROMPT },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        return formatResult(parsed);
      } else {
        const errText = await response.text();
        console.warn(`Gemini Vision API returned status ${response.status}:`, errText);
      }
    } catch (err: any) {
      console.warn('Gemini Vision call failed, attempting fallback:', err?.message);
    }
  }

  // 2. Try Groq API as Secondary (if available)
  if (GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: SYSTEM_PROMPT,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content || '';
        const clean = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        return formatResult(parsed);
      } else {
        const errText = await response.text();
        console.warn(`Groq API returned status ${response.status}:`, errText);
      }
    } catch (err: any) {
      console.warn('Groq API call failed:', err?.message);
    }
  }

  return FALLBACK;
}

function formatResult(parsed: any): AIDamageAssessmentOutput {
  const validCategories = ['Pothole', 'Crack', 'Surface failure', 'Water-logged damage', 'Garbage/Debris', 'Streetlight Issue', 'None'];
  const validDepts     = ['Engineering', 'Sanitation', 'Electrical', 'Water Supply', 'Parks & Environment', 'Traffic & Roads', 'Public Works', 'Unassigned'];
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
}