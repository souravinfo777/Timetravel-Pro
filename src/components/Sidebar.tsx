import React from 'react';
import { AppState } from '../types';
import { MapPin, Sparkles, Users, Image as ImageIcon, Settings2 } from 'lucide-react';

interface SidebarProps {
  state: AppState;
  updateState: (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
  onGenerateLocation: () => void;
  onGeneratePrompts: () => void;
}

export function Sidebar({ state, updateState, onGenerateLocation, onGeneratePrompts }: SidebarProps) {
  return (
    <aside className="w-64 bg-panel flex flex-col h-full shrink-0 overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-[1px] text-text-dim mb-4 flex justify-between items-center">
          <span>TIMELINE SETTINGS</span>
          <Settings2 size={12} className="text-accent" />
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[1px] text-text-dim mb-1">Start Year</label>
            <input type="number" value={state.startYear} onChange={e => updateState({ startYear: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[1px] text-text-dim mb-1">End Year</label>
            <input type="number" value={state.endYear} onChange={e => updateState({ endYear: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[1px] text-text-dim mb-1">Number of Images</label>
          <input type="number" min="2" max="20" value={state.numImages} onChange={e => updateState({ numImages: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent" />
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-[1px] text-text-dim mb-4 flex justify-between items-center">
          <span>LOCATION</span>
          <MapPin size={12} className="text-accent" />
        </h2>
        <div className="mb-3">
          <label className="block text-[10px] uppercase tracking-[1px] text-text-dim mb-1">Location Hint (for AI)</label>
          <div className="flex gap-2">
            <input type="text" placeholder="e.g. Texas old yard" value={state.locationHint} onChange={e => updateState({ locationHint: e.target.value })} className="flex-1 px-3 py-2 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent" />
            <button 
              onClick={onGenerateLocation} 
              disabled={state.isGeneratingLocation || !state.locationHint} 
              className="px-3 py-2 bg-[#252528] text-text-main border border-border rounded hover:border-accent disabled:opacity-50 transition-colors flex items-center justify-center" 
              title="AI Generate Location"
            >
              {state.isGeneratingLocation ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <Sparkles size={14} />
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[1px] text-text-dim mb-1">Detailed Description</label>
          <textarea value={state.locationDescription} onChange={e => updateState({ locationDescription: e.target.value })} rows={4} className="w-full px-3 py-2 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent resize-none" placeholder="Describe the location in detail..." />
        </div>
        {state.places && state.places.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] uppercase tracking-[1px] text-text-dim mb-1">Maps References:</p>
            <ul className="text-xs text-accent space-y-1">
              {state.places.map((place, i) => (
                <li key={i}><a href={place.uri} target="_blank" rel="noreferrer" className="hover:underline">{place.title || 'View on Maps'}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="p-4 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-[1px] text-text-dim mb-4 flex justify-between items-center">
          <span>CHARACTERS</span>
          <Users size={12} className="text-accent" />
        </h2>
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={state.charactersEnabled} onChange={e => updateState({ charactersEnabled: e.target.checked })} className="rounded border-border bg-[#1c1c1e] text-accent focus:ring-accent focus:ring-offset-panel" />
          <span className="text-xs font-medium text-text-main">Enable Characters</span>
        </label>
        {state.charactersEnabled && (
          <div className="space-y-3 pl-6 border-l border-border">
            <div>
              <label className="block text-[10px] uppercase tracking-[1px] text-text-dim mb-1">Number of People</label>
              <input type="number" min="1" max="10" value={state.numPeople} onChange={e => updateState({ numPeople: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[1px] text-text-dim mb-1">Character Notes</label>
              <input type="text" placeholder="e.g. elderly couple" value={state.characterNotes} onChange={e => updateState({ characterNotes: e.target.value })} className="w-full px-3 py-2 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-[1px] text-text-dim mb-4 flex justify-between items-center">
          <span>IMAGE SETTINGS</span>
          <ImageIcon size={12} className="text-accent" />
        </h2>
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label className="text-[10px] uppercase tracking-[1px] text-text-dim">Decay Theme</label>
            <span className="text-xs text-text-dim">{state.decayLevel}%</span>
          </div>
          <input type="range" min="0" max="100" value={state.decayLevel} onChange={e => updateState({ decayLevel: parseInt(e.target.value) })} className="w-full accent-accent" />
          <div className="flex justify-between text-[10px] text-text-dim mt-1">
            <span>Pristine</span>
            <span>Ruined</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[1px] text-text-dim mb-1">Aspect Ratio</label>
            <select value={state.aspectRatio} onChange={e => updateState({ aspectRatio: e.target.value })} className="w-full px-3 py-2 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent">
              <option value="1:1">1:1</option>
              <option value="3:4">3:4</option>
              <option value="4:3">4:3</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-4 mt-auto">
        <button onClick={onGeneratePrompts} disabled={state.isGeneratingPrompts || !state.locationDescription} className="w-full py-2 bg-accent text-black text-xs font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2">
          {state.isGeneratingPrompts ? (
            <><span className="animate-spin">⏳</span> GENERATING...</>
          ) : (
            <><Sparkles size={14} /> GENERATE PROMPTS</>
          )}
        </button>
      </div>
    </aside>
  );
}
