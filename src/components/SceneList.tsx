import React, { useState } from 'react';
import { AppState, Scene } from '../types';
import { SceneCard } from './SceneCard';
import { generateImage } from '../services/gemini';
import { motion } from 'motion/react';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { TimelapseModal } from './TimelapseModal';
import { VideoExportModal } from './VideoExportModal';
import { Play, Video } from 'lucide-react';

interface SceneListProps {
  state: AppState;
  updateState: (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
}

export function SceneList({ state, updateState }: SceneListProps) {
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [showVideoExport, setShowVideoExport] = useState(false);

  const updateScene = (id: string, updates: Partial<Scene>) => {
    updateState(prev => ({
      scenes: prev.scenes.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const handleGenerateAll = async () => {
    const scenesToGenerate = state.scenes.filter(scene => !scene.imageUrl && !scene.isGeneratingImage);
    
    scenesToGenerate.forEach(scene => {
      updateScene(scene.id, { isGeneratingImage: true, imageError: undefined });
    });

    await Promise.all(scenesToGenerate.map(async (scene, idx) => {
      try {
        const sceneSeed = state.consistencySeed + state.scenes.indexOf(scene);
        const imageUrl = await generateImage(
          scene.prompt,
          state.aspectRatio,
          state.imageSize,
          state.aiProvider,
          sceneSeed
        );
        updateScene(scene.id, { imageUrl, isGeneratingImage: false });
      } catch (error: any) {
        updateScene(scene.id, { imageError: error.message, isGeneratingImage: false });
      }
    }));
  };

  const firstScene = state.scenes[0];
  const lastScene = state.scenes[state.scenes.length - 1];
  const hasBeforeAfter = firstScene?.imageUrl && lastScene?.imageUrl && state.scenes.length > 1;
  const hasAnyImages = state.scenes.some(s => s.imageUrl);
  const allImagesGenerated = state.scenes.length > 0 && state.scenes.every(s => s.imageUrl);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {state.isGeneratingPrompts && (
        <div className="flex flex-col items-center justify-center py-20 text-text-dim">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="text-4xl mb-6 text-accent"
          >
            ⏳
          </motion.div>
          <p className="text-lg animate-pulse">Thinking deeply about the timeline...</p>
          
          <div className="w-full mt-12 space-y-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full h-64 bg-panel rounded border border-border animate-pulse flex">
                <div className="w-1/2 p-6 border-r border-border">
                  <div className="h-6 w-24 bg-[#252528] rounded mb-4"></div>
                  <div className="h-4 w-full bg-[#252528] rounded mb-2"></div>
                  <div className="h-4 w-3/4 bg-[#252528] rounded"></div>
                </div>
                <div className="w-1/2 bg-bg"></div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!state.isGeneratingPrompts && state.scenes.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-text-main tracking-tight">Generated Timeline</h2>
              <p className="text-text-dim mt-1">{state.scenes.length} scenes from {state.startYear} to {state.endYear}</p>
            </div>
            <div className="flex gap-3">
              {hasAnyImages && (
                <button 
                  onClick={() => setShowTimelapse(true)} 
                  className="px-4 py-2 bg-panel hover:bg-[#252528] text-text-main text-xs font-semibold rounded border border-border transition-colors flex items-center gap-2"
                >
                  <Play size={14} className="text-accent" /> PLAY TIMELAPSE
                </button>
              )}
              {allImagesGenerated && (
                <button 
                  onClick={() => setShowVideoExport(true)} 
                  className="px-4 py-2 bg-panel hover:bg-[#252528] text-text-main text-xs font-semibold rounded border border-accent transition-colors flex items-center gap-2"
                >
                  <Video size={14} className="text-accent" /> MAKE VIDEO
                </button>
              )}
              <button 
                onClick={handleGenerateAll} 
                className="px-4 py-2 bg-accent hover:bg-[#e07b18] text-black text-xs font-semibold rounded transition-colors"
              >
                GENERATE ALL IMAGES
              </button>
            </div>
          </div>
          
          {hasBeforeAfter && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-12"
            >
              <h3 className="text-[10px] uppercase tracking-[1px] text-text-dim mb-4">Before & After Comparison</h3>
              <BeforeAfterSlider 
                beforeImage={firstScene.imageUrl!} 
                afterImage={lastScene.imageUrl!} 
                beforeLabel={firstScene.year.toString()}
                afterLabel={lastScene.year.toString()}
              />
            </motion.div>
          )}

          <div className="space-y-8">
            {state.scenes.map((scene, index) => (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <SceneCard 
                  scene={scene} 
                  index={index} 
                  total={state.scenes.length}
                  aspectRatio={state.aspectRatio}
                  imageSize={state.imageSize}
                  aiProvider={state.aiProvider}
                  consistencySeed={state.consistencySeed}
                  onUpdate={(updates) => updateScene(scene.id, updates)} 
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {showTimelapse && (
        <TimelapseModal scenes={state.scenes} onClose={() => setShowTimelapse(false)} />
      )}

      {showVideoExport && (
        <VideoExportModal scenes={state.scenes} onClose={() => setShowVideoExport(false)} />
      )}
    </div>
  );
}
