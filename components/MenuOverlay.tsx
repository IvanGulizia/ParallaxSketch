

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { SpringConfig, UITheme, BlendMode, ExportConfig, TrajectoryType, ExportFormat } from '../types';
import { Slider } from './Slider';
// @ts-ignore
import LZString from 'lz-string';

// Helper Components
const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-[11px] font-bold text-[var(--icon-color)] opacity-50 uppercase tracking-widest mb-4 mt-2">{children}</h3>
);

const ControlRow = ({ label, children, isDisabled }: { label: string, children?: React.ReactNode, isDisabled?: boolean }) => (
    <div className="flex items-center justify-between mb-3 last:mb-0 gap-4">
        <span className={`text-sm font-medium whitespace-nowrap ${isDisabled ? 'text-[var(--disabled-color)]' : 'text-[var(--text-color)] opacity-80'}`}>{label}</span>
        <div className="flex items-center gap-2 flex-1 justify-end">{children}</div>
    </div>
);

const ToggleBtn = ({ checked, onChange, icon: Icon, label }: { checked: boolean, onChange: () => void, icon?: any, label: string }) => (
   <button 
      onClick={onChange}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-300 ${
          checked 
          ? 'bg-[var(--active-color)] text-white border-[var(--active-color)]' 
          : 'bg-[var(--button-bg)] text-[var(--icon-color)] border-[var(--button-border)] hover:bg-[var(--secondary-bg)]'
      }`}
   >
      {Icon && <Icon size={14} />}
      {label}
   </button>
);

const BlendGroup = ({ value, onChange }: { value: BlendMode, onChange: (v: BlendMode) => void }) => (
    <div className="flex bg-[var(--button-bg)] rounded-lg p-0.5 border border-[var(--button-border)]">
        {(['normal', 'multiply', 'difference'] as BlendMode[]).map((mode) => (
            <button
                key={mode}
                onClick={() => onChange(mode)}
                className={`px-2 py-1 rounded-md text-[10px] uppercase font-medium transition-all ${
                    value === mode 
                    ? 'bg-[var(--active-color)] text-white shadow-sm' 
                    : 'text-[var(--secondary-text)] hover:text-[var(--text-color)]'
                }`}
            >
                {mode}
            </button>
        ))}
    </div>
);

const Separator = () => (
    <div className="h-px bg-[var(--border-color)] w-[calc(100%+32px)] -mx-4" />
);

interface MenuOverlayProps {
  isOpen: boolean;
  parallaxStrength: number;
  parallaxInverted: boolean;
  focalLayerIndex: number;
  springConfig: SpringConfig;
  backgroundColor: string;
  canvasWidth: number;
  globalLayerBlendMode: BlendMode;
  activeLayer: number;
  layerBlendModes: Record<number, BlendMode>;
  aspectRatio: number | null;
  uiTheme: UITheme;
  isGridEnabled: boolean;
  isSnappingEnabled: boolean;
  gridSize: number;
  useGyroscope: boolean;
  isLowPowerMode: boolean;
  isOnionSkinEnabled: boolean;
  blurStrength: number;
  focusRange: number;
  exportConfig: ExportConfig;
  getEncodedState: () => string; 
  onClose: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onReset: () => void;
  onParallaxStrengthChange: (val: number) => void;
  onParallaxInvertedChange: (val: boolean) => void;
  onFocalLayerChange: (index: number) => void;
  onSpringConfigChange: (config: SpringConfig) => void;
  onBackgroundColorChange: (color: string) => void;
  onCanvasWidthChange: (width: number) => void;
  onAspectRatioChange: (ratio: number | null) => void;
  onGlobalLayerBlendModeChange: (mode: BlendMode) => void;
  onLayerBlendModeChange: (layerId: number, mode: BlendMode) => void;
  onUIThemeChange: (theme: UITheme) => void;
  onGridEnabledChange: (val: boolean) => void;
  onSnappingEnabledChange: (val: boolean) => void;
  onGridSizeChange: (val: number) => void;
  onUseGyroscopeChange: (val: boolean) => void;
  onLowPowerModeChange: (val: boolean) => void;
  onOnionSkinEnabledChange: (val: boolean) => void;
  onBlurStrengthChange: (val: number) => void;
  onFocusRangeChange: (val: number) => void;
  onExportConfigChange: (config: ExportConfig) => void;
}

export const MenuOverlay: React.FC<MenuOverlayProps> = ({ 
    isOpen, 
    parallaxStrength,
    parallaxInverted,
    focalLayerIndex,
    springConfig,
    backgroundColor,
    canvasWidth,
    globalLayerBlendMode,
    activeLayer,
    layerBlendModes,
    aspectRatio,
    uiTheme,
    isGridEnabled,
    isSnappingEnabled,
    gridSize,
    useGyroscope,
    isLowPowerMode,
    isOnionSkinEnabled,
    blurStrength,
    focusRange,
    exportConfig,
    getEncodedState,
    onClose, 
    onImport, 
    onExport,
    onReset,
    onParallaxStrengthChange,
    onParallaxInvertedChange,
    onFocalLayerChange,
    onSpringConfigChange,
    onBackgroundColorChange,
    onCanvasWidthChange,
    onAspectRatioChange,
    onGlobalLayerBlendModeChange,
    onLayerBlendModeChange,
    onUIThemeChange,
    onGridEnabledChange,
    onSnappingEnabledChange,
    onGridSizeChange,
    onUseGyroscopeChange,
    onLowPowerModeChange,
    onOnionSkinEnabledChange,
    onBlurStrengthChange,
    onFocusRangeChange,
    onExportConfigChange
}) => {
  const [showShare, setShowShare] = useState(false);
  const [shareTransparent, setShareTransparent] = useState(false);
  
  // Export Studio State
  const [showExportStudio, setShowExportStudio] = useState(false);

  // External Link Generator
  const [externalUrlInput, setExternalUrlInput] = useState('');
  const [generatedExternalLink, setGeneratedExternalLink] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const shareSectionRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if ((event.target as HTMLElement).closest('.menu-toggle-btn')) {
              return;
          }
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              if (isOpen) onClose();
          }
      };
      if (isOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  // Auto scroll to share section
  useEffect(() => {
      if (showShare && shareSectionRef.current) {
          setTimeout(() => {
            shareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
      }
  }, [showShare]);

  const requestGyroPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
            const response = await (DeviceOrientationEvent as any).requestPermission();
            if (response === 'granted') {
                onUseGyroscopeChange(true);
            } else {
                alert('Permission denied');
                onUseGyroscopeChange(false);
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        onUseGyroscopeChange(!useGyroscope);
    }
  };

  if (!isOpen) return null;
  
  const generateExternalLink = () => {
      if (!externalUrlInput) return;
      
      let finalUrl = externalUrlInput;

      // Gist Helper: Convert standard gist links to raw content links automatically
      // https://gist.github.com/User/Hash -> https://gist.githubusercontent.com/User/Hash/raw
      if (finalUrl.includes('gist.github.com') && !finalUrl.includes('raw')) {
         finalUrl = finalUrl.replace('gist.github.com', 'gist.githubusercontent.com') + '/raw';
      }

      // Check origin
      const origin = window.location.origin === 'null' ? 'https://parallax-sketch.vercel.app' : window.location.origin;
      const url = new URL(origin + window.location.pathname);
      
      url.searchParams.set('mode', 'embed');
      url.searchParams.set('url', finalUrl); // The fetcher in App.tsx will handle the decoding
      
      // -- Explicitly include ALL parameters as requested --
      
      // Visuals
      url.searchParams.set('strength', parallaxStrength.toString());
      url.searchParams.set('inverted', parallaxInverted.toString());
      url.searchParams.set('stiffness', springConfig.stiffness.toString());
      url.searchParams.set('damping', springConfig.damping.toString());
      url.searchParams.set('blur', blurStrength.toString());
      url.searchParams.set('focus', focusRange.toString());
      url.searchParams.set('focalLayer', focalLayerIndex.toString());
      
      // Grid & Canvas
      url.searchParams.set('grid', isGridEnabled.toString());
      url.searchParams.set('snap', isSnappingEnabled.toString());
      url.searchParams.set('gridSize', gridSize.toString());
      url.searchParams.set('width', canvasWidth.toString());
      if (aspectRatio) url.searchParams.set('aspect', aspectRatio.toString());

      // Blends
      url.searchParams.set('globalBlend', globalLayerBlendMode);
      
      // Physics / Gyro
      url.searchParams.set('gyro', useGyroscope.toString());

      // Background
      if (shareTransparent) url.searchParams.set('bg', 'transparent');
      else url.searchParams.set('bg', backgroundColor.replace('#', ''));
      
      setGeneratedExternalLink(url.toString());
  };

  return (
    <div 
        ref={menuRef}
        onMouseDown={(e) => e.stopPropagation()} 
        className="menu-overlay-container absolute w-96 flex flex-col z-50 animate-in fade-in slide-in-from-right-4 duration-300 shadow-2xl rounded-3xl overflow-hidden bg-[var(--menu-bg)]"
        style={{ 
            color: 'var(--text-color)', 
            top: 'calc(var(--spacing-x) * 0.5)',
            bottom: 'calc(var(--spacing-x) * 0.5)',
            right: 'calc(var(--spacing-x) * 0.5)'
        }} 
    >
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between bg-[var(--tool-bg)] border-b border-[var(--border-color)] shrink-0 rounded-t-3xl">
        <h2 className="text-lg font-medium tracking-tight">Settings</h2>
        <button onClick={onClose} className="text-[var(--icon-color)] hover:opacity-70 transition-opacity">
          <Icons.Close size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8 custom-scrollbar bg-[var(--menu-bg)]">
        
        {/* SECTION: CANVAS */}
        <div>
            <SectionTitle>Canvas & Grid</SectionTitle>
            
            <div className="bg-[var(--tool-bg)] p-4 rounded-2xl border border-[var(--border-color)] space-y-4">
                <ControlRow label="Width">
                    <div className="w-32">
                        <Slider 
                            min={20} max={100} step={1} 
                            value={canvasWidth} 
                            onChange={(v) => {
                                onCanvasWidthChange(v);
                                onAspectRatioChange(null);
                            }}
                        />
                    </div>
                </ControlRow>
                
                <ControlRow label="Layout">
                     <button 
                        onClick={() => onAspectRatioChange(aspectRatio === 1 ? null : 1)} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            aspectRatio === 1
                            ? 'bg-[var(--active-color)] text-white border-[var(--active-color)]' 
                            : 'bg-transparent text-[var(--text-color)] border-[var(--button-border)]'
                        }`}
                    >
                        Square (1:1)
                    </button>
                </ControlRow>

                <ControlRow label="Background">
                    <div className="flex items-center gap-2 px-1 py-1 bg-[var(--secondary-bg)] rounded-lg border border-[var(--button-border)] w-fit">
                         <div className="relative w-6 h-6 flex items-center justify-center cursor-pointer rounded overflow-hidden shadow-sm border border-[var(--border-color)]">
                            <div 
                                className="absolute inset-0"
                                style={{ backgroundColor }}
                            />
                            <input 
                                type="color" 
                                value={backgroundColor}
                                onChange={(e) => onBackgroundColorChange(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                         </div>
                    </div>
                </ControlRow>
                
                <Separator />
                
                <ControlRow label="Depth of Field">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-medium w-8 text-right">{blurStrength}px</span>
                        <div className="w-24">
                            <Slider 
                                min={0} max={20} step={1}
                                value={blurStrength} 
                                onChange={onBlurStrengthChange}
                            />
                        </div>
                    </div>
                </ControlRow>

                <ControlRow label="Focus Range">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-medium w-8 text-right">±{focusRange}</span>
                         <div className="w-24">
                            <Slider 
                                min={0} max={2} step={0.5}
                                value={focusRange} 
                                onChange={onFocusRangeChange}
                            />
                        </div>
                    </div>
                </ControlRow>
                
                <ControlRow label="Onion Skin">
                    <ToggleBtn 
                        checked={isOnionSkinEnabled} 
                        onChange={() => onOnionSkinEnabledChange(!isOnionSkinEnabled)} 
                        label={isOnionSkinEnabled ? 'Visible' : 'Hidden'}
                    />
                </ControlRow>

                <Separator />

                <ControlRow label="Global">
                    <BlendGroup value={globalLayerBlendMode} onChange={onGlobalLayerBlendModeChange} />
                </ControlRow>

                <ControlRow label={`Layer ${activeLayer}`}>
                    <BlendGroup value={layerBlendModes[activeLayer]} onChange={(m) => onLayerBlendModeChange(activeLayer, m)} />
                </ControlRow>

                 <Separator />

                 <div className="flex items-center justify-between">
                     <span className="text-sm font-medium text-[var(--text-color)] opacity-80">Grid Overlay</span>
                     <ToggleBtn 
                        checked={isGridEnabled} 
                        onChange={() => onGridEnabledChange(!isGridEnabled)} 
                        label={isGridEnabled ? 'On' : 'Off'}
                    />
                 </div>
                 
                 {isGridEnabled && (
                     <div className="pt-2 space-y-3 animate-in fade-in">
                         <ControlRow label="Snap to Grid">
                            <ToggleBtn 
                                checked={isSnappingEnabled} 
                                onChange={() => onSnappingEnabledChange(!isSnappingEnabled)} 
                                label={isSnappingEnabled ? 'Active' : 'Disabled'}
                            />
                         </ControlRow>
                         <ControlRow label={`Size (${gridSize}px)`}>
                            <div className="w-32">
                                <Slider 
                                    min={10} max={100} step={1}
                                    value={gridSize} 
                                    onChange={onGridSizeChange}
                                />
                            </div>
                         </ControlRow>
                     </div>
                 )}
            </div>
        </div>

        {/* SECTION: PHYSICS */}
        <div>
            <SectionTitle>Motion & Physics</SectionTitle>
            
            <div className="flex flex-wrap gap-2 mb-4">
                <ToggleBtn 
                    checked={isLowPowerMode} 
                    onChange={() => onLowPowerModeChange(!isLowPowerMode)} 
                    label="Eco Mode"
                    icon={isLowPowerMode ? Icons.Battery : Icons.Eco}
                />
                <ToggleBtn 
                    checked={useGyroscope} 
                    onChange={requestGyroPermission} 
                    label="Gyroscope"
                    icon={Icons.SliderHandle}
                />
            </div>

            <div className="bg-[var(--tool-bg)] p-4 rounded-2xl border border-[var(--border-color)] space-y-4">
                <ControlRow label="Parallax Depth">
                     <div className="w-32">
                        <Slider 
                            min={0} max={100} step={1}
                            value={parallaxStrength} 
                            onChange={onParallaxStrengthChange}
                        />
                     </div>
                </ControlRow>

                <ControlRow label="Focal Layer">
                     <div className="w-32">
                        <Slider 
                            min={0} max={4} step={1}
                            value={focalLayerIndex} 
                            onChange={onFocalLayerChange}
                        />
                     </div>
                </ControlRow>

                <ControlRow label="Invert Direction">
                    <ToggleBtn 
                        checked={parallaxInverted} 
                        onChange={() => onParallaxInvertedChange(!parallaxInverted)} 
                        label={parallaxInverted ? 'On' : 'Off'}
                    />
                </ControlRow>
                
                <Separator />
                
                <div className={`space-y-4 transition-colors duration-300`}>
                    <ControlRow label="Tension" isDisabled={isLowPowerMode}>
                         <div className="w-32">
                            <Slider 
                                min={0.01} max={1.0} step={0.01}
                                value={springConfig.stiffness} 
                                onChange={(v) => onSpringConfigChange({ ...springConfig, stiffness: v })}
                                disabled={isLowPowerMode}
                            />
                         </div>
                    </ControlRow>
                    <ControlRow label="Friction" isDisabled={isLowPowerMode}>
                         <div className="w-32">
                            <Slider 
                                min={0.01} max={0.99} step={0.01}
                                value={springConfig.damping} 
                                onChange={(v) => onSpringConfigChange({ ...springConfig, damping: v })}
                                disabled={isLowPowerMode}
                            />
                         </div>
                    </ControlRow>
                </div>
            </div>
        </div>

        {/* SECTION: DATA */}
        <div>
            <SectionTitle>Share & Export</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
                 
                 {/* 1. Import */}
                 <label className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--tool-bg)] border border-[var(--border-color)] hover:border-[var(--active-color)] hover:bg-[var(--secondary-bg)] transition-all cursor-pointer group">
                    <Icons.Upload size={20} className="text-[var(--icon-color)] mb-1 group-hover:text-[var(--active-color)]" />
                    <span className="text-[10px] font-medium text-[var(--text-color)]">Import JSON</span>
                    <input type="file" accept=".json" onChange={onImport} className="hidden" />
                 </label>

                 {/* 2. Share Generator */}
                 <button 
                    onClick={() => {
                        setShowShare(!showShare);
                        setShowExportStudio(false);
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all group ${
                        showShare 
                        ? 'bg-[var(--active-color)] border-[var(--active-color)]' 
                        : 'bg-[var(--tool-bg)] border-[var(--border-color)] hover:bg-[var(--secondary-bg)]'
                    }`}
                 >
                    <Icons.Link size={20} className={`mb-1 ${showShare ? 'text-white' : 'text-[var(--icon-color)] group-hover:text-[var(--active-color)]'}`} />
                    <span className={`text-[10px] font-medium ${showShare ? 'text-white' : 'text-[var(--text-color)]'}`}>Share Link</span>
                 </button>

                 {/* 3. Export JSON */}
                 <button 
                    onClick={onExport}
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--tool-bg)] border border-[var(--border-color)] hover:border-[var(--active-color)] hover:bg-[var(--secondary-bg)] transition-all group"
                 >
                    <Icons.Download size={20} className="text-[var(--icon-color)] mb-1 group-hover:text-[var(--active-color)]" />
                    <span className="text-[10px] font-medium text-[var(--text-color)]">Download JSON</span>
                 </button>

                 {/* 4. Video Export */}
                 <button 
                    onClick={() => {
                        setShowExportStudio(!showExportStudio);
                        setShowShare(false);
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all group ${
                        showExportStudio 
                        ? 'bg-[var(--active-color)] border-[var(--active-color)]' 
                        : 'bg-[var(--tool-bg)] border-[var(--border-color)] hover:bg-[var(--secondary-bg)]'
                    }`}
                 >
                    <Icons.Play size={20} className={`mb-1 ${showExportStudio ? 'text-white' : 'text-[var(--icon-color)] group-hover:text-[var(--active-color)]'}`} />
                    <span className={`text-[10px] font-medium ${showExportStudio ? 'text-white' : 'text-[var(--text-color)]'}`}>Export Video</span>
                 </button>
            </div>
            
            {/* Export Studio Panel */}
            {showExportStudio && (
                 <div className="mt-3 p-4 bg-[var(--tool-bg)] rounded-xl border border-[var(--border-color)] animate-in fade-in space-y-4">
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-50 block">Motion Path</span>
                        <div className="grid grid-cols-4 gap-1">
                            {[TrajectoryType.CIRCLE, TrajectoryType.FIGURE8, TrajectoryType.SWAY_H, TrajectoryType.SWAY_V].map(type => (
                                <button
                                    key={type}
                                    onClick={() => onExportConfigChange({...exportConfig, trajectory: type})}
                                    className={`py-2 rounded-lg text-[9px] font-medium border transition-all ${
                                        exportConfig.trajectory === type
                                        ? 'bg-[var(--active-color)] text-white border-[var(--active-color)]'
                                        : 'bg-[var(--button-bg)] text-[var(--text-color)] border-[var(--button-border)] hover:bg-[var(--secondary-bg)]'
                                    }`}
                                >
                                    {type === TrajectoryType.CIRCLE ? 'Circle' : type === TrajectoryType.FIGURE8 ? 'Fig. 8' : type === TrajectoryType.SWAY_H ? 'Horiz.' : 'Vert.'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-50 block">Format</span>
                        <div className="flex bg-[var(--secondary-bg)] p-1 rounded-lg border border-[var(--button-border)]">
                            {(['webm', 'mp4'] as ExportFormat[]).map(fmt => (
                                <button 
                                    key={fmt}
                                    onClick={() => onExportConfigChange({...exportConfig, format: fmt})}
                                    className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all uppercase ${exportConfig.format === fmt ? 'bg-[var(--button-bg)] shadow-sm text-[var(--active-color)]' : 'text-[var(--secondary-text)]'}`}
                                >
                                    {fmt}
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-[var(--secondary-text)] text-center">
                            {exportConfig.format === 'webm' ? "Best Quality & Looping (Recommended)" : "MP4 (Experimental/Safari)"}
                        </p>
                    </div>

                    <ControlRow label={`Duration: ${exportConfig.duration}s`}>
                        <div className="w-32">
                             <Slider 
                                min={1} max={10} step={1}
                                value={exportConfig.duration} 
                                onChange={(v) => onExportConfigChange({...exportConfig, duration: v})}
                            />
                        </div>
                    </ControlRow>
                    
                    <Separator />

                    <div className="flex gap-2">
                        <button
                            onClick={() => onExportConfigChange({...exportConfig, isActive: !exportConfig.isActive, isRecording: false})}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                exportConfig.isActive && !exportConfig.isRecording
                                ? 'bg-[var(--active-color)] text-white border-[var(--active-color)]'
                                : 'bg-[var(--button-bg)] text-[var(--text-color)] border-[var(--button-border)] hover:bg-[var(--secondary-bg)]'
                            }`}
                        >
                            {exportConfig.isActive && !exportConfig.isRecording ? 'Stop Preview' : 'Preview Loop'}
                        </button>
                        
                        <button
                            onClick={() => onExportConfigChange({...exportConfig, isActive: true, isRecording: true})}
                            disabled={exportConfig.isRecording}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                exportConfig.isRecording
                                ? 'bg-red-50 text-red-500 border-red-500 cursor-wait'
                                : 'bg-[var(--active-color)] text-white border-[var(--active-color)] opacity-90 hover:opacity-100'
                            }`}
                        >
                            {exportConfig.isRecording ? 'Recording...' : 'Record Video'}
                        </button>
                    </div>
                 </div>
            )}
            
            {showShare && (
                 <div ref={shareSectionRef} className="mt-3 p-4 bg-[var(--tool-bg)] rounded-xl border border-[var(--border-color)] animate-in fade-in space-y-4">
                    
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-50 block">Options</span>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={shareTransparent} onChange={(e) => setShareTransparent(e.target.checked)} />
                                <span className="text-[10px] text-[var(--text-color)]">Transparent BG</span>
                            </label>
                        </div>
                    </div>

                    <Separator />
                    
                    <div className="space-y-3 p-3 bg-[var(--secondary-bg)] rounded-lg border border-[var(--border-color)] animate-in fade-in">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-50 block">Embed from External Link</span>
                        <span className="text-[9px] text-[var(--secondary-text)] block">
                            Paste your JSON URL (e.g. GitHub Gist or Raw file) below.
                        </span>
                        <input 
                            type="text" 
                            placeholder="https://gist.github.com/..."
                            value={externalUrlInput}
                            onChange={(e) => setExternalUrlInput(e.target.value)}
                            className="w-full text-[10px] p-2 rounded border border-[var(--border-color)] focus:outline-none focus:border-[var(--active-color)]"
                        />
                        <button 
                            onClick={generateExternalLink}
                            disabled={!externalUrlInput}
                            className="w-full py-2 bg-[var(--active-color)] text-white rounded text-[10px] font-medium hover:opacity-90 transition-opacity"
                        >
                            Generate Embed Code
                        </button>
                        {generatedExternalLink && (
                            <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                                <textarea 
                                    readOnly
                                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                    className="w-full h-24 text-[9px] font-mono bg-white border border-[var(--border-color)] rounded p-2 resize-none focus:outline-none"
                                    value={`<iframe src="${generatedExternalLink}" width="100%" height="600" style="border:none; border-radius:12px; overflow:hidden;" allow="accelerometer; gyroscope;"></iframe>`}
                                />
                                <p className="text-[9px] text-green-600 font-medium text-center">
                                    Code generated! Copy and paste into your site.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>

      </div>

      {/* Footer */}
      <div className="p-4 bg-[var(--tool-bg)] border-t border-[var(--border-color)] text-center shrink-0 rounded-b-3xl">
          <span className="text-[10px] text-[var(--secondary-text)] opacity-60 font-medium">
              vibecoded by <a 
                href="https://ivangulizia.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline transition-opacity"
                style={{ color: 'var(--active-color)' }}
              >
                  Ivan Gulizia
              </a>
          </span>
      </div>
    </div>
  );
};