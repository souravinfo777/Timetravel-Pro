import React, { useState } from 'react';
import { Scene } from '../types';
import { generateImage, editImage, analyzeImage } from '../services/gemini';
import { Image as ImageIcon, Download, Wand2, Search, Edit3 } from 'lucide-react';
import { motion } from 'motion/react';

interface SceneCardProps {
  key?: React.Key;
  scene: Scene;
  index: number;
  total: number;
  aspectRatio: string;
  imageSize: string;
  onUpdate: (updates: Partial<Scene>) => void;
}

export function SceneCard({ scene, index, total, aspectRatio, imageSize, onUpdate }: SceneCardProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  const handleGenerateImage = async () => {
    onUpdate({ isGeneratingImage: true, imageError: undefined });
    try {
      const imageUrl = await generateImage(scene.prompt, aspectRatio, imageSize);
      onUpdate({ imageUrl, isGeneratingImage: false });
    } catch (error: any) {
      onUpdate({ imageError: error.message, isGeneratingImage: false });
    }
  };

  const handleEditImage = async () => {
    if (!scene.imageUrl || !editPrompt) return;
    onUpdate({ isEditing: true, imageError: undefined });
    try {
      const newImageUrl = await editImage(scene.imageUrl, editPrompt);
      onUpdate({ imageUrl: newImageUrl, isEditing: false });
      setEditPrompt('');
      setShowEdit(false);
    } catch (error: any) {
      onUpdate({ imageError: error.message, isEditing: false });
    }
  };

  const handleAnalyzeImage = async () => {
    if (!scene.imageUrl) return;
    onUpdate({ isAnalyzing: true });
    try {
      const analysis = await analyzeImage(scene.imageUrl);
      onUpdate({ analysis, isAnalyzing: false });
    } catch (error: any) {
      onUpdate({ analysis: `Error: ${error.message}`, isAnalyzing: false });
    }
  };

  const handleDownload = () => {
    if (!scene.imageUrl) return;
    const a = document.createElement('a');
    a.href = scene.imageUrl;
    a.download = `scene-${scene.year}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-panel rounded border border-border overflow-hidden flex flex-col md:flex-row transition-all hover:border-accent">
      <div className="p-6 md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-[#1c1c1e] text-accent font-mono font-bold px-3 py-1 rounded text-lg border border-border">
            {scene.year}
          </div>
          <div className="text-[10px] uppercase tracking-[1px] text-text-dim">
            Scene {index + 1} of {total}
          </div>
        </div>
        
        <div className="flex-1 mb-4">
          <label className="block text-[10px] uppercase tracking-[1px] text-text-dim mb-2">Prompt</label>
          <textarea 
            value={scene.prompt}
            onChange={e => onUpdate({ prompt: e.target.value })}
            className="w-full h-40 p-3 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <button 
          onClick={handleGenerateImage} 
          disabled={scene.isGeneratingImage}
          className="w-full py-2 bg-[#252528] hover:bg-[#333] text-text-main text-xs font-semibold rounded disabled:opacity-50 transition-colors flex justify-center items-center gap-2 border border-border"
        >
          {scene.isGeneratingImage ? (
            <><span className="animate-spin text-accent">⏳</span> GENERATING IMAGE...</>
          ) : (
            <><ImageIcon size={14} className="text-accent" /> GENERATE IMAGE</>
          )}
        </button>
        {scene.imageError && (
          <p className="text-red-400 text-xs mt-2">{scene.imageError}</p>
        )}
      </div>

      <div className="md:w-1/2 bg-bg p-6 flex flex-col items-center justify-center relative min-h-[300px]">
        {scene.imageUrl ? (
          <div className="w-full h-full flex flex-col">
            <div className="relative flex-1 flex items-center justify-center mb-4 bg-panel rounded overflow-hidden border border-border">
              <motion.img 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={scene.imageUrl} 
                alt={`Scene from ${scene.year}`} 
                className="max-w-full max-h-[400px] object-contain" 
              />
              {(scene.isEditing || scene.isGeneratingImage) && (
                <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm flex items-center justify-center">
                  <span className="animate-spin text-4xl text-accent">⏳</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-border text-text-main rounded text-xs hover:border-accent transition-colors">
                <Download size={12} /> DOWNLOAD
              </button>
              <button onClick={() => setShowEdit(!showEdit)} className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-border text-text-main rounded text-xs hover:border-accent transition-colors">
                <Edit3 size={12} /> EDIT
              </button>
              <button onClick={handleAnalyzeImage} disabled={scene.isAnalyzing} className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-border text-text-main rounded text-xs hover:border-accent disabled:opacity-50 transition-colors">
                <Search size={12} /> {scene.isAnalyzing ? 'ANALYZING...' : 'ANALYZE'}
              </button>
            </div>

            {showEdit && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-panel border border-border rounded flex gap-2"
              >
                <input 
                  type="text" 
                  placeholder="e.g. Add a retro filter" 
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#1c1c1e] border border-border rounded text-xs text-text-main focus:outline-none focus:border-accent"
                />
                <button 
                  onClick={handleEditImage}
                  disabled={!editPrompt || scene.isEditing}
                  className="px-3 py-1.5 bg-accent text-black rounded text-xs font-bold hover:bg-[#e07b18] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <Wand2 size={12} /> APPLY
                </button>
              </motion.div>
            )}

            {scene.analysis && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 bg-panel border border-border rounded text-xs text-text-main max-h-40 overflow-y-auto"
              >
                <h4 className="font-bold text-text-main mb-2 flex items-center gap-1.5"><Search size={12} className="text-accent" /> ANALYSIS</h4>
                <p className="whitespace-pre-wrap leading-relaxed">{scene.analysis}</p>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-text-dim flex flex-col items-center">
            <ImageIcon size={48} className="mb-3 opacity-20" />
            <p className="text-xs">NO IMAGE GENERATED YET</p>
          </div>
        )}
      </div>
    </div>
  );
}
