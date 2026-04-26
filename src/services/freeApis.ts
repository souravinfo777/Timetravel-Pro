import { LocationResult, HistoricalFact, WeatherData } from '../types';

// --- Nominatim Geocoding (OpenStreetMap) ---
export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (!query.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=0`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TimeTravel-Pro-App/1.0' }
  });
  if (!res.ok) throw new Error('Location search failed');
  const data = await res.json();
  return data.map((item: any) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.type || 'place'
  }));
}

// --- Wikipedia API ---
export async function getHistoricalFacts(locationName: string): Promise<HistoricalFact[]> {
  const searchTerm = locationName.split(',')[0].trim();
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm + ' history')}&srlimit=4&format=json&origin=*`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();
  const titles: string[] = (searchData.query?.search || []).map((s: any) => s.title);
  if (titles.length === 0) return [];

  const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${titles.map(t => encodeURIComponent(t)).join('|')}&prop=extracts|pageimages&exintro=true&explaintext=true&exsentences=3&piprop=thumbnail&pithumbsize=200&format=json&origin=*`;
  const extractRes = await fetch(extractUrl);
  if (!extractRes.ok) return [];
  const extractData = await extractRes.json();
  const pages = Object.values(extractData.query?.pages || {}) as any[];

  return pages
    .filter((p: any) => p.extract && p.extract.length > 30)
    .map((p: any) => ({
      title: p.title,
      extract: p.extract,
      thumbnail: p.thumbnail?.source
    }));
}

// --- Open-Meteo Historical Weather API ---
export async function getHistoricalWeather(
  lat: number,
  lon: number,
  startYear: number,
  endYear: number
): Promise<WeatherData[]> {
  const results: WeatherData[] = [];
  const currentYear = new Date().getFullYear();
  const clampedStart = Math.max(1940, Math.min(startYear, currentYear - 1));
  const clampedEnd = Math.min(endYear, currentYear - 1);

  if (clampedStart > clampedEnd) return [];

  const step = Math.max(1, Math.floor((clampedEnd - clampedStart) / 4));
  const sampleYears: number[] = [];
  for (let y = clampedStart; y <= clampedEnd; y += step) {
    sampleYears.push(y);
  }
  if (sampleYears[sampleYears.length - 1] !== clampedEnd) {
    sampleYears.push(clampedEnd);
  }

  for (const year of sampleYears.slice(0, 5)) {
    try {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${year}-01-01&end_date=${year}-12-31&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weathercode&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const daily = data.daily;
      if (!daily || !daily.temperature_2m_mean) continue;

      const temps = daily.temperature_2m_mean.filter((t: any) => t !== null) as number[];
      const maxTemps = daily.temperature_2m_max.filter((t: any) => t !== null) as number[];
      const minTemps = daily.temperature_2m_min.filter((t: any) => t !== null) as number[];
      const precip = daily.precipitation_sum.filter((p: any) => p !== null) as number[];
      const codes = daily.weathercode.filter((c: any) => c !== null) as number[];

      const avgTemp = temps.length > 0 ? temps.reduce((a: number, b: number) => a + b, 0) / temps.length : 0;
      const maxTemp = maxTemps.length > 0 ? Math.max(...maxTemps) : 0;
      const minTemp = minTemps.length > 0 ? Math.min(...minTemps) : 0;
      const totalPrecipitation = precip.reduce((a: number, b: number) => a + b, 0);
      const dominantCondition = getWeatherCondition(codes);

      results.push({
        year,
        avgTemp: Math.round(avgTemp * 10) / 10,
        maxTemp: Math.round(maxTemp * 10) / 10,
        minTemp: Math.round(minTemp * 10) / 10,
        totalPrecipitation: Math.round(totalPrecipitation),
        dominantCondition
      });
    } catch {
      // Skip failed years
    }
  }

  return results;
}

function getWeatherCondition(codes: number[]): string {
  if (codes.length === 0) return 'Unknown';
  const freq: Record<string, number> = {};
  for (const code of codes) {
    const condition = weatherCodeToCondition(code);
    freq[condition] = (freq[condition] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

function weatherCodeToCondition(code: number): string {
  if (code <= 1) return 'Clear';
  if (code <= 3) return 'Cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Showers';
  if (code <= 94) return 'Thunderstorm';
  return 'Stormy';
}

// --- Consistency Seed ---
export function generateConsistencySeed(locationDescription: string): number {
  let hash = 0;
  for (let i = 0; i < locationDescription.length; i++) {
    const chr = locationDescription.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

// --- Pollinations.ai Free Image Generation ---
function getImageDimensions(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1': return { width: 1024, height: 1024 };
    case '3:4': return { width: 768, height: 1024 };
    case '4:3': return { width: 1024, height: 768 };
    case '9:16': return { width: 576, height: 1024 };
    case '16:9': return { width: 1024, height: 576 };
    default: return { width: 1024, height: 576 };
  }
}

export function getPollinationsImageUrl(
  prompt: string,
  width: number,
  height: number,
  seed: number
): string {
  const safePrompt = prompt
    .replace(/Text overlay:.*?$/im, '')
    .trim()
    .substring(0, 500);
  const styled = safePrompt + ', documentary photography, highly detailed, photorealistic, cinematic lighting, 8k resolution';
  const encoded = encodeURIComponent(styled);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
}

export async function generateFreeImage(
  prompt: string,
  aspectRatio: string,
  consistencySeed: number
): Promise<string> {
  const dims = getImageDimensions(aspectRatio);
  const url = getPollinationsImageUrl(prompt, dims.width, dims.height, consistencySeed);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Free image generation failed. Please try again.');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// --- Free Prompt Generation using Pollinations Text API ---
export async function generateFreePrompts(params: {
  startYear: number;
  endYear: number;
  numImages: number;
  locationDescription: string;
  charactersEnabled: boolean;
  numPeople: number;
  characterNotes: string;
  decayLevel: number;
}): Promise<{ year: number; prompt: string }[]> {
  const { startYear, endYear, numImages, locationDescription, charactersEnabled, numPeople, characterNotes, decayLevel } = params;

  const years: number[] = [];
  if (numImages <= 1) {
    years.push(startYear);
  } else {
    const step = (endYear - startYear) / (numImages - 1);
    for (let i = 0; i < numImages; i++) {
      years.push(Math.round(startYear + step * i));
    }
  }

  const systemPrompt = `You are a prompt engineer for AI image generation specializing in time-travel sequences. Generate exactly ${numImages} image prompts. Return ONLY a valid JSON array with objects having "year" (integer) and "prompt" (string) fields. No markdown, no explanation, just the JSON array.

CRITICAL CONSISTENCY RULES:
- Every prompt MUST begin with the EXACT same camera angle, framing, and perspective description
- The core structural elements (buildings, terrain, roads) MUST be described identically across all prompts
- Only vary temporal elements: aging, weathering, decay, vegetation growth/overgrowth, lighting changes
- Use the same photographic style throughout: "documentary photography, photorealistic, cinematic lighting"
- Include consistent architectural details and materials in every prompt`;

  const userPrompt = `Generate ${numImages} image prompts for years: ${years.join(', ')}.

Location: ${locationDescription}
Characters: ${charactersEnabled ? `${numPeople} people. Notes: ${characterNotes}` : 'No people.'}
Decay Level (0-100): ${decayLevel} (0 = pristine, 100 = completely ruined by final year)

Rules:
1. EXACT same camera angle in every prompt (start each with identical angle description)
2. Core buildings and layout described identically
3. Only change weather, aging, decay, overgrowth based on year and decay level
4. Include "Text overlay: [YEAR]" at end of each prompt
5. Each prompt must be a detailed paragraph for image generation
6. Maintain consistent lighting direction and photographic style`;

  const url = `https://text.pollinations.ai/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'openai',
      jsonMode: true
    })
  });

  if (!res.ok) throw new Error('Free prompt generation failed. Please try again.');

  const text = await res.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Could not parse generated prompts. Please try again.');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) throw new Error('Invalid response format');

  return parsed.map((item: any) => ({
    year: typeof item.year === 'number' ? item.year : parseInt(item.year) || years[0],
    prompt: String(item.prompt || '')
  }));
}

// --- Free Location Description ---
export async function generateFreeLocationDescription(hint: string): Promise<string> {
  const url = `https://text.pollinations.ai/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a location description expert for image generation. Provide highly detailed physical descriptions suitable for photorealistic image prompts. Include architecture, building materials, vegetation, street elements, lighting, and atmosphere. No conversational text, just the description. Focus on consistent, repeatable visual elements.' },
        { role: 'user', content: `Describe this real-world location in detail for image generation: "${hint}"` }
      ],
      model: 'openai'
    })
  });

  if (!res.ok) throw new Error('Free location description generation failed');
  return await res.text();
}

// --- Free Image Analysis ---
export async function analyzeFreeImage(_imageUrl: string): Promise<string> {
  return 'Image analysis requires the Gemini AI provider. Switch to Gemini in the sidebar to use this feature.';
}
