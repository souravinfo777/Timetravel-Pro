import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { SceneList } from './components/SceneList';
import { AppState, Scene } from './types';
import { generatePrompts, generateLocationDescription, setGeminiApiKey } from './services/gemini';
import { generateConsistencySeed } from './services/freeApis';
import { Copy, Code } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>({
    startYear: 2000,
    endYear: 2024,
    numImages: 5,
    locationHint: '',
    locationDescription: '',
    charactersEnabled: false,
    numPeople: 1,
    characterNotes: '',
    decayLevel: 50,
    aspectRatio: '16:9',
    imageSize: '1K',
    scenes: [],
    isGeneratingPrompts: false,
    isGeneratingLocation: false,
    places: [],
    aiProvider: 'free',
    geminiApiKey: '',
    historicalFacts: [],
    isLoadingFacts: false,
    weatherData: [],
    isLoadingWeather: false,
    consistencySeed: Date.now()
  });

  useEffect(() => {
    setGeminiApiKey(state.geminiApiKey);
  }, [state.geminiApiKey]);

  useEffect(() => {
    if (state.locationDescription) {
      const seed = generateConsistencySeed(state.locationDescription);
      setState(prev => ({ ...prev, consistencySeed: seed }));
    }
  }, [state.locationDescription]);

  const updateState = (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
    setState(prev => {
      const resolvedUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...resolvedUpdates };
    });
  };

  const handleGenerateLocation = async () => {
    if (!state.locationHint) return;
    updateState({ isGeneratingLocation: true, globalError: undefined });
    try {
      const { description, places } = await generateLocationDescription(state.locationHint, state.aiProvider);
      updateState({ locationDescription: description, places, isGeneratingLocation: false });
    } catch (error: any) {
      updateState({ globalError: error.message, isGeneratingLocation: false });
    }
  };

  const handleGeneratePrompts = async () => {
    updateState({ isGeneratingPrompts: true, globalError: undefined });
    try {
      const prompts = await generatePrompts(state, state.aiProvider);
      const scenes: Scene[] = prompts.map((p: any, i: number) => ({
        id: `scene-${i}-${Date.now()}`,
        year: p.year,
        prompt: p.prompt
      }));
      updateState({ scenes, isGeneratingPrompts: false });
    } catch (error: any) {
      updateState({ globalError: error.message, isGeneratingPrompts: false });
    }
  };

  const handleCopyPrompts = () => {
    const text = state.scenes.map(s => `Year ${s.year}:\n${s.prompt}`).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.scenes, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "prompts.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex flex-col h-screen bg-bg text-text-main font-sans overflow-hidden">
      <header className="h-14 bg-panel border-b border-border px-5 flex justify-between items-center shrink-0 z-10">
        <div className="font-bold tracking-tight flex items-center gap-2 text-[15px]">
          TIMETRAVEL<span className="text-accent">PRO</span>
          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-border text-text-dim font-normal">
            {state.aiProvider === 'free' ? 'FREE AI' : 'GEMINI'}
          </span>
        </div>
        <div className="flex gap-6 text-[13px] font-medium">
            <div className="text-accent">WORKSPACE</div>
            <div className="opacity-50">LIBRARY</div>
            <div className="opacity-50">HISTORY</div>
            <div className="opacity-50">SETTINGS</div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleCopyPrompts} disabled={state.scenes.length === 0} className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-black bg-accent rounded disabled:opacity-50 transition-colors">
            <Copy size={14} /> COPY PROMPTS
          </button>
          <button onClick={handleExportJSON} disabled={state.scenes.length === 0} className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-black bg-accent rounded disabled:opacity-50 transition-colors">
            <Code size={14} /> EXPORT JSON
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden bg-border gap-[1px]">
        <Sidebar state={state} updateState={updateState} onGenerateLocation={handleGenerateLocation} onGeneratePrompts={handleGeneratePrompts} />
        
        <main className="flex-1 flex flex-col bg-bg overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {state.globalError && (
              <div className="mb-6 p-4 bg-red-950/50 text-red-400 rounded-lg border border-red-900/50">
                {state.globalError}
              </div>
            )}
            
            {state.scenes.length === 0 && !state.isGeneratingPrompts ? (
              <div className="h-full flex flex-col items-center justify-center text-text-dim">
                <div className="text-6xl mb-4 opacity-20">🕰️</div>
                <p className="text-lg">Configure settings and generate prompts to begin.</p>
                <p className="text-sm mt-2 opacity-60">
                  {state.aiProvider === 'free' 
                    ? 'Using Free AI (Pollinations.ai) — no API key needed' 
                    : state.geminiApiKey 
                      ? 'Using Gemini AI — API key configured' 
                      : 'Switch to Free AI or enter your Gemini API key to start'}
                </p>
              </div>
            ) : (
              <SceneList state={state} updateState={updateState} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
