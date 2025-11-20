
import React, { useState } from 'react';
import { Icons } from './Icons';
import { SpringConfig } from '../types';

interface MenuOverlayProps {
  isOpen: boolean;
  parallaxStrength: number;
  focalLayerIndex: number;
  springConfig: SpringConfig;
  backgroundColor: string;
  onClose: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onReset: () => void;
  onParallaxStrengthChange: (val: number) => void;
  onFocalLayerChange: (index: number) => void;
  onSpringConfigChange: (config: SpringConfig) => void;
  onBackgroundColorChange: (color: string) => void;
}

const BG_COLORS = ['#FFFFFF', '#FDFCF8', '#EFEDE6', '#E6E6E6', '#D1D1D1', '#1A1A1A'];

export const MenuOverlay: React.FC<MenuOverlayProps> = ({ 
    isOpen, 
    parallaxStrength,
    focalLayerIndex,
    springConfig,
    backgroundColor,
    onClose, 
    onImport, 
    onExport,
    onReset,
    onParallaxStrengthChange,
    onFocalLayerChange,
    onSpringConfigChange,
    onBackgroundColorChange
}) => {
  const [showShare, setShowShare] = useState(false);
  
  if (!isOpen) return null;
  
  // Generate embed code based on current state (Simplified)
  const getShareUrl = () => {
     const url = new URL(window.location.href);
     url.searchParams.set('mode', 'embed');
     url.searchParams.set('strength', parallaxStrength.toString());
     url.searchParams.set('damping', springConfig.damping.toString());
     url.searchParams.set('stiffness', springConfig.stiffness.toString());
     url.searchParams.set('bg', backgroundColor.replace('#', ''));
     return url.toString();
  };

  return (
    <div className="absolute top-4 right-4 w-80 backdrop-blur-md bg-white/90 rounded-3xl shadow-xl border border-white/50 p-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 overflow-y-auto max-h-[90vh]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-[var(--text-color)]">Settings</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <Icons.Close size={20} />
        </button>
      </div>

      <div className="space-y-6">
        
        {/* Canvas Appearance */}
        <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Canvas</h3>
            <div className="flex gap-2 mb-2">
                {BG_COLORS.map(c => (
                    <button
                        key={c}
                        onClick={() => onBackgroundColorChange(c)}
                        className={`w-8 h-8 rounded-full border-2 ${backgroundColor === c ? 'border-gray-600' : 'border-gray-200'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
        </div>

        <div className="w-full h-px bg-gray-200/50" />

        {/* Parallax Settings */}
        <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Parallax Physics</h3>
            
            {/* Strength */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Intensity</span>
                    <span>{parallaxStrength}%</span>
                </div>
                <input 
                    type="range" min="0" max="100" step="10"
                    value={parallaxStrength} 
                    onChange={(e) => onParallaxStrengthChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--active-color)]"
                />
            </div>

            {/* Damping (Friction) */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Smoothing (Damping)</span>
                    <span>{Math.round(springConfig.damping * 100)}</span>
                </div>
                <input 
                    type="range" min="0.80" max="0.99" step="0.01"
                    value={springConfig.damping} 
                    onChange={(e) => onSpringConfigChange({ ...springConfig, damping: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--active-color)]"
                />
            </div>

            {/* Stiffness (Tension) */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Responsiveness (Stiffness)</span>
                    <span>{Math.round(springConfig.stiffness * 100)}</span>
                </div>
                <input 
                    type="range" min="0.01" max="0.2" step="0.01"
                    value={springConfig.stiffness} 
                    onChange={(e) => onSpringConfigChange({ ...springConfig, stiffness: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--active-color)]"
                />
            </div>

            {/* Focal Point */}
            <div>
                <p className="text-xs text-gray-500 mb-2">Focal Plane</p>
                <div className="flex gap-1 bg-gray-100/50 p-1 rounded-xl">
                    {[0, 1, 2, 3, 4].map(idx => (
                        <button
                            key={idx}
                            onClick={() => onFocalLayerChange(idx)}
                            className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                                focalLayerIndex === idx 
                                ? 'bg-white shadow-sm text-[var(--active-color)]' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                           {idx === 0 ? 'Back' : idx === 4 ? 'Front' : idx}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="w-full h-px bg-gray-200/50" />

        {/* Share Section */}
        <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Share</h3>
            {!showShare ? (
                <button 
                    onClick={() => setShowShare(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-blue-50 transition-colors cursor-pointer group text-blue-500 bg-blue-50/50"
                >
                    <Icons.Share size={16} />
                    <span className="text-sm font-medium">Generate Embed Code</span>
                </button>
            ) : (
                <div className="bg-gray-50 p-3 rounded-2xl">
                    <p className="text-xs text-gray-500 mb-2">Copy this HTML to embed:</p>
                    <textarea 
                        readOnly
                        className="w-full h-24 text-[10px] font-mono bg-white border border-gray-200 rounded-lg p-2 resize-none focus:outline-none"
                        value={`<iframe src="${getShareUrl()}" width="800" height="600" style="border:none; border-radius:12px;"></iframe>`}
                    />
                    <button 
                        onClick={() => setShowShare(false)}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-800 underline"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>

        <div className="w-full h-px bg-gray-200/50" />

        {/* File Actions */}
        <div>
             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</h3>
            <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/60 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-[var(--secondary-bg)] flex items-center justify-center text-[var(--text-color)] group-hover:bg-[var(--accent-color)] transition-colors">
                        <Icons.Upload size={14} />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-color)]">Import JSON</span>
                    <input type="file" accept=".json" onChange={onImport} className="hidden" />
                </label>

                <button 
                    onClick={onExport}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/60 transition-colors cursor-pointer group"
                >
                    <div className="w-8 h-8 rounded-full bg-[var(--secondary-bg)] flex items-center justify-center text-[var(--text-color)] group-hover:bg-[var(--accent-color)] transition-colors">
                        <Icons.Download size={14} />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-color)]">Export JSON</span>
                </button>

                <div className="pt-2">
                    <button 
                        onClick={onReset}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-50 transition-colors cursor-pointer group text-red-500"
                    >
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 group-hover:bg-red-200 transition-colors">
                            <Icons.Trash size={14} />
                        </div>
                        <span className="text-sm font-medium">Clear Canvas</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
