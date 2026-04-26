export type AIProvider = 'free' | 'gemini';

export interface Scene {
  id: string;
  year: number;
  prompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  imageError?: string;
  analysis?: string;
  isAnalyzing?: boolean;
  isEditing?: boolean;
  weatherSummary?: string;
}

export interface LocationResult {
  displayName: string;
  lat: number;
  lon: number;
  type: string;
}

export interface HistoricalFact {
  title: string;
  extract: string;
  year?: number;
  thumbnail?: string;
}

export interface WeatherData {
  year: number;
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  totalPrecipitation: number;
  dominantCondition: string;
}

export interface AppState {
  startYear: number;
  endYear: number;
  numImages: number;
  locationHint: string;
  locationDescription: string;
  charactersEnabled: boolean;
  numPeople: number;
  characterNotes: string;
  decayLevel: number;
  aspectRatio: string;
  imageSize: string;
  scenes: Scene[];
  isGeneratingPrompts: boolean;
  isGeneratingLocation: boolean;
  globalError?: string;
  places?: { uri: string; title?: string }[];
  aiProvider: AIProvider;
  geminiApiKey: string;
  selectedLocation?: LocationResult;
  historicalFacts: HistoricalFact[];
  isLoadingFacts: boolean;
  weatherData: WeatherData[];
  isLoadingWeather: boolean;
  consistencySeed: number;
}
