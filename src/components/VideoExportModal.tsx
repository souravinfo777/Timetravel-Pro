import React, { useState, useRef, useEffect } from 'react';
import { Scene } from '../types';
import { X, Video, Download, Loader2, Settings, Clock, MoveHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoExportModalProps {
  scenes: Scene[];
  onClose: () => void;
}

type TransitionType = 'fade' | 'slide' | 'cut';

export function VideoExportModal({ scenes, onClose }: VideoExportModalProps) {
  const [duration, setDuration] = useState(3);
  const [transition, setTransition] = useState<TransitionType>('fade');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [exportMimeType, setExportMimeType] = useState('video/mp4');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const imagesWithUrls = scenes.filter(s => s.imageUrl);

  const getSupportedMimeType = () => {
    const types = [
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm';
  };

  const startExport = async () => {
    if (!canvasRef.current || imagesWithUrls.length === 0) return;

    setIsExporting(true);
    setProgress(0);
    setVideoUrl(null);
    chunksRef.current = [];

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance/quality
    if (!ctx) return;

    // Set canvas size based on first image or default
    const firstImg = await loadImage(imagesWithUrls[0].imageUrl!);
    canvas.width = firstImg.width;
    canvas.height = firstImg.height;

    const mimeType = getSupportedMimeType();
    setExportMimeType(mimeType);

    const stream = canvas.captureStream(30); // 30 FPS
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 15000000 // 15 Mbps for "best quality"
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsExporting(false);
    };

    recorder.start();

    const fps = 30;
    const totalFramesPerImage = duration * fps;
    const transitionFrames = transition === 'cut' ? 0 : Math.min(fps, totalFramesPerImage / 2);
    
    for (let i = 0; i < imagesWithUrls.length; i++) {
      const currentImg = await loadImage(imagesWithUrls[i].imageUrl!);
      const nextImg = i < imagesWithUrls.length - 1 ? await loadImage(imagesWithUrls[i + 1].imageUrl!) : null;

      for (let frame = 0; frame < totalFramesPerImage; frame++) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw current image
        ctx.globalAlpha = 1;
        ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height);

        // Handle transitions
        if (nextImg && frame >= totalFramesPerImage - transitionFrames) {
          const t = (frame - (totalFramesPerImage - transitionFrames)) / transitionFrames;
          
          if (transition === 'fade') {
            ctx.globalAlpha = t;
            ctx.drawImage(nextImg, 0, 0, canvas.width, canvas.height);
          } else if (transition === 'slide') {
            ctx.globalAlpha = 1;
            ctx.drawImage(currentImg, -t * canvas.width, 0, canvas.width, canvas.height);
            ctx.drawImage(nextImg, canvas.width - t * canvas.width, 0, canvas.width, canvas.height);
          }
        }

        // Add Year Text Overlay - High Quality
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(40, 40, 160, 60, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#f59e0b'; // amber-500
        ctx.font = 'bold 36px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(imagesWithUrls[i].year.toString(), 120, 70);

        setProgress(Math.round(((i * totalFramesPerImage + frame) / (imagesWithUrls.length * totalFramesPerImage)) * 100));
        
        // Wait for next frame
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
      }
    }

    recorder.stop();
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const getFileExtension = () => {
    if (exportMimeType.includes('mp4')) return 'mp4';
    return 'webm';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/90 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-panel border border-border rounded shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded">
              <Video className="text-accent" size={20} />
            </div>
            <h2 className="text-[15px] font-bold text-text-main">EXPORT VIDEO</h2>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!videoUrl && !isExporting && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-[1px] font-medium text-text-dim">
                    <Clock size={12} className="text-text-dim" /> Duration per image
                  </label>
                  <span className="text-accent font-mono font-bold">{duration}s</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={duration} 
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] uppercase tracking-[1px] font-medium text-text-dim">
                  <MoveHorizontal size={12} className="text-text-dim" /> Transition Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fade', 'slide', 'cut'] as TransitionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTransition(type)}
                      className={`py-2 text-[10px] font-bold uppercase tracking-[1px] rounded border transition-all ${
                        transition === type 
                          ? 'bg-accent/20 border-accent text-accent' 
                          : 'bg-[#1c1c1e] border-border text-text-dim hover:border-accent'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-bg rounded border border-border">
                <p className="text-[10px] text-text-dim uppercase font-bold tracking-[1px] mb-1">Quality Settings</p>
                <p className="text-xs text-text-dim">High Bitrate (15Mbps) • {imagesWithUrls[0]?.imageUrl ? 'Original Resolution' : 'Auto'}</p>
              </div>

              <button 
                onClick={startExport}
                className="w-full py-2 bg-accent hover:bg-[#e07b18] text-black text-xs font-semibold rounded shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Video size={14} /> START EXPORT
              </button>
            </>
          )}

          {isExporting && (
            <div className="py-8 flex flex-col items-center justify-center space-y-6">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" stroke="#2D2D30" strokeWidth="8" 
                  />
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" stroke="#F28C28" strokeWidth="8" 
                    strokeDasharray={`${progress * 2.82} 282`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-text-main">
                  {progress}%
                </div>
              </div>
              <div className="text-center">
                <p className="text-text-main font-medium">Generating High Quality Video...</p>
                <p className="text-text-dim text-xs mt-1">Please keep this tab active</p>
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="space-y-6">
              <div className="aspect-video bg-black rounded overflow-hidden border border-border">
                <video src={videoUrl} controls className="w-full h-full" />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setVideoUrl(null); setProgress(0); }}
                  className="flex-1 py-2 bg-[#252528] hover:bg-[#333] text-text-main text-xs font-bold rounded transition-all"
                >
                  RESET
                </button>
                <a 
                  href={videoUrl} 
                  download={`timelapse-video.${getFileExtension()}`}
                  className="flex-[2] py-2 bg-accent hover:bg-[#e07b18] text-black text-xs font-bold rounded shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download size={14} /> DOWNLOAD .{getFileExtension().toUpperCase()}
                </a>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
}
