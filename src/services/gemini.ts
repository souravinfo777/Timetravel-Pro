import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai/web';
import { AIProvider } from '../types';
import {
  generateFreeImage,
  generateFreePrompts,
  generateFreeLocationDescription,
  analyzeFreeImage
} from './freeApis';

let cachedApiKey: string | null = null;

export function setGeminiApiKey(key: string) {
  cachedApiKey = key;
}

export function getGeminiApiKey(): string | null {
  return cachedApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null) || null;
}

const getAI = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not set. Please enter your API key in the sidebar or switch to the Free AI provider.');
  }
  return new GoogleGenAI({ apiKey });
};

export async function generateLocationDescription(
  hint: string,
  provider: AIProvider = 'free'
): Promise<{ description: string; places: any[] }> {
  if (provider === 'free') {
    const description = await generateFreeLocationDescription(hint);
    return { description, places: [] };
  }

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: `Describe a real-world location based on this hint: "${hint}". 
    Provide a highly detailed physical description suitable for an image generation prompt. 
    Include details about:
    - Architecture and building materials
    - Vegetation and landscaping
    - Street elements (mailboxes, fences, pavement)
    - Lighting and atmosphere
    
    Do not include any conversational text, just the detailed description.`,
  });

  return { description: response.text || '', places: [] };
}

export async function generatePrompts(
  params: any,
  provider: AIProvider = 'free'
): Promise<any[]> {
  if (provider === 'free') {
    return generateFreePrompts(params);
  }

  const ai = getAI();
  const { startYear, endYear, numImages, locationDescription, charactersEnabled, numPeople, characterNotes, decayLevel } = params;

  const years = [];
  if (numImages <= 1) {
    years.push(startYear);
  } else {
    const step = (endYear - startYear) / (numImages - 1);
    for (let i = 0; i < numImages; i++) {
      years.push(Math.round(startYear + step * i));
    }
  }

  const promptText = `
    Generate a sequence of ${numImages} image prompts for the years: ${years.join(', ')}.
    
    Location: ${locationDescription}
    Characters: ${charactersEnabled ? `${numPeople} people. Notes: ${characterNotes}` : 'No people.'}
    Decay Level (0-100): ${decayLevel} (0 = pristine, 100 = completely ruined by the final year)
    
    CRITICAL RULES FOR CONSISTENCY AND ANGLE:
    1. EXACT SAME CAMERA ANGLE: Every single prompt MUST start with the exact same description of the camera angle, framing, and perspective (e.g., "Eye-level wide shot from the center of the street looking directly at the front of the house..."). Do not vary the angle.
    2. STRUCTURAL CONSISTENCY: The core buildings, terrain, and layout MUST be described identically in every prompt.
    3. PROGRESSION: Only change the weather, aging, decay, overgrowth, and character aging based on the year and decay level.
    4. TEXT OVERLAY: Include "Text overlay: [YEAR]" at the end of each prompt.
    5. Each prompt must be a single, highly detailed paragraph ready for an image generation model.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: promptText,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.INTEGER },
            prompt: { type: Type.STRING, description: "The detailed image generation prompt" }
          },
          required: ["year", "prompt"]
        }
      }
    }
  });

  const text = response.text || '[]';
  return JSON.parse(text);
}

export async function generateImage(
  prompt: string,
  aspectRatio: string,
  _imageSize: string,
  provider: AIProvider = 'free',
  consistencySeed: number = 0
): Promise<string> {
  if (provider === 'free') {
    return generateFreeImage(prompt, aspectRatio, consistencySeed);
  }

  const ai = getAI();

  let safePrompt = prompt.replace(/Text overlay:.*?$/im, '').trim();
  safePrompt = safePrompt.substring(0, 1000) + ' Documentary photography, highly detailed.';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: safePrompt }] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const mimeType = part.inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function editImage(
  base64Image: string,
  editPrompt: string,
  provider: AIProvider = 'free'
): Promise<string> {
  if (provider === 'free') {
    throw new Error('Image editing requires the Gemini AI provider. Switch to Gemini in the sidebar and enter your API key to use this feature.');
  }

  const ai = getAI();
  const mimeType = base64Image.split(';')[0].split(':')[1];
  const data = base64Image.split(',')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: editPrompt }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const outMimeType = part.inlineData.mimeType || 'image/png';
      return `data:${outMimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function analyzeImage(
  base64Image: string,
  provider: AIProvider = 'free'
): Promise<string> {
  if (provider === 'free') {
    return analyzeFreeImage(base64Image);
  }

  const ai = getAI();
  const mimeType = base64Image.split(';')[0].split(':')[1];
  const data = base64Image.split(',')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: "Analyze this image in detail. Describe the environment, the condition of the location, any characters present, and the overall mood." }
      ]
    }
  });

  return response.text || '';
}
