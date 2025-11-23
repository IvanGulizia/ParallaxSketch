
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { SpringConfig, UITheme, BlendMode } from '../types';
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
    onOnionSkinEnabledChange
}) => {
  const [showShare, setShowShare] = useState(false);
  const [shareTransparent, setShareTransparent] = useState(false);
  const [shareGyro, setShareGyro] = useState(useGyroscope);
  
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'uploading' | 'success' | 'error-fallback'>('idle');
  const [cloudLink, setCloudLink] = useState('');
  
  const menuRef = useRef<HTMLDivElement>(null);
  
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
  
  const generateCloudLink = async () => {
      setCloudStatus('uploading');
      
      const origin = window.location.origin === 'null' ? 'https://parallax-sketch.vercel.app' : window.location.origin;
      const rawData = getEncodedState();
      
      // FALLBACK: Client-side compression if cloud fetch fails
      const generateFallbackLink = () => {
          try {
            const compressed = LZString.compressToEncodedURIComponent(rawData);
            const url = new URL(origin + window.location.pathname);
            url.searchParams.set('mode', 'embed');
            url.searchParams.set('encoded', compressed);
            url.searchParams.set('strength', parallaxStrength.toString());
            url.searchParams.set('inverted', parallaxInverted.toString());
            url.searchParams.set('gyro', shareGyro.toString());
            if (shareTransparent) {
                url.searchParams.set('bg', 'transparent');
            } else {
                url.searchParams.set('bg', backgroundColor.replace('#', ''));
            }
            setCloudLink(url.toString());
            setCloudStatus('error-fallback');
          } catch (err) {
            console.error("Compression failed", err);
          }
      };

      try {
          // Attempt JSONBlob Cloud Upload
          // Added referrerPolicy and credentials omit to fix CORS NetworkErrors in strict environments
          const response = await fetch('https://jsonblob.com/api/jsonBlob', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
              },
              mode: 'cors',
              credentials: 'omit',
              referrerPolicy: 'no-referrer',
              body: rawData
          });

          if (!response.ok) throw new Error(`Cloud Error: ${response.statusText}`);
          
          const locationHeader = response.headers.get('Location');
          if (!locationHeader) throw new Error("No location header from cloud");
          
          const blobId = locationHeader.split('/').pop();
          
          const url = new URL(origin + window.location.pathname);
          url.searchParams.set('mode', 'embed');
          url.searchParams.set('blob', blobId || '');
          url.searchParams.set('strength', parallaxStrength.toString());
          url.searchParams.set('inverted', parallaxInverted.toString());
          url.searchParams.set('gyro', shareGyro.toString());
          
          if (shareTransparent) {
              url.searchParams.set('bg', 'transparent');
          } else {
              url.searchParams.set('bg', backgroundColor.replace('#', ''));
          }

          setCloudLink(url.toString());
          setCloudStatus('success');

      } catch (e) {
          console.warn("Cloud upload unavailable, switching to offline link.", e);
          generateFallbackLink();
      }
  };

  const handleExportTheme = () => {
      const data = JSON.stringify(uiTheme, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zen-theme.json';
      a.click();
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
                
                <ControlRow label="Layer Opacity">
                    <ToggleBtn 
                        checked={isOnionSkinEnabled} 
                        onChange={() => onOnionSkinEnabledChange(!isOnionSkinEnabled)} 
                        label={isOnionSkinEnabled ? 'Depth' : 'Flat'}
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

         {/* SECTION: THEME */}
         <div>
            <div className="flex items-center justify-between">
                <SectionTitle>Interface Theme</SectionTitle>
                <button onClick={handleExportTheme} className="text-[10px] text-[var(--active-color)] hover:underline opacity-80">
                    Export JSON
                </button>
            </div>
            
            <div className="bg-[var(--tool-bg)] p-4 rounded-2xl border border-[var(--border-color)]">
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { key: 'activeColor', label: 'Active Tint' },
                        { key: 'iconColor', label: 'Icons' },
                        { key: 'textColor', label: 'Text Primary' },
                        { key: 'secondaryText', label: 'Text Secondary' },
                        { key: 'toolBg', label: 'Tool Bg' },
                        { key: 'menuBg', label: 'Menu Bg' },
                        { key: 'appBg', label: 'App Bg' },
                        { key: 'buttonBg', label: 'Button Bg' },
                        { key: 'borderColor', label: 'Borders' },
                        { key: 'buttonBorder', label: 'Btn Borders' },
                        { key: 'sliderTrack', label: 'Slider Track' },
                        { key: 'sliderFilled', label: 'Slider Fill' },
                        { key: 'sliderHandle', label: 'Slider Handle' },
                        { key: 'disabledColor', label: 'Disabled' },
                        { key: 'scrollbarThumb', label: 'Scrollbar' },
                        { key: 'scrollbarTrack', label: 'Scrollbar BG' },
                    ].map((item) => (
                        <div key={item.key} className="flex flex-col gap-1">
                            <span className="text-[9px] text-[var(--secondary-text)] font-medium uppercase tracking-wide">{item.label}</span>
                            <div className="flex items-center gap-2 p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--secondary-bg)] relative hover:border-[var(--active-color)] transition-colors">
                                <div 
                                    className="w-full h-4 rounded shadow-sm border border-black/5 shrink-0" 
                                    style={{ backgroundColor: uiTheme[item.key as keyof UITheme] as string }}
                                />
                                <input 
                                    type="color" 
                                    value={uiTheme[item.key as keyof UITheme] as string}
                                    onChange={(e) => onUIThemeChange({ ...uiTheme, [item.key]: e.target.value })}
                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* SECTION: DATA */}
        <div>
            <SectionTitle>Share & Embed</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
                 
                 {/* 1. Import */}
                 <label className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--tool-bg)] border border-[var(--border-color)] hover:border-[var(--active-color)] hover:bg-[var(--secondary-bg)] transition-all cursor-pointer group">
                    <Icons.Upload size={20} className="text-[var(--icon-color)] mb-1 group-hover:text-[var(--active-color)]" />
                    <span className="text-[10px] font-medium text-[var(--text-color)]">Import JSON</span>
                    <input type="file" accept=".json" onChange={onImport} className="hidden" />
                 </label>

                 {/* 2. Share */}
                 <button 
                    onClick={() => {
                        setShowShare(!showShare);
                        setCloudStatus('idle');
                        setCloudLink('');
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all group ${
                        showShare 
                        ? 'bg-[var(--active-color)] border-[var(--active-color)]' 
                        : 'bg-[var(--tool-bg)] border-[var(--border-color)] hover:bg-[var(--secondary-bg)]'
                    }`}
                 >
                    <Icons.Link size={20} className={`mb-1 ${showShare ? 'text-white' : 'text-[var(--icon-color)] group-hover:text-[var(--active-color)]'}`} />
                    <span className={`text-[10px] font-medium ${showShare ? 'text-white' : 'text-[var(--text-color)]'}`}>Embed Code</span>
                 </button>

                 {/* 3. Export */}
                 <button 
                    onClick={onExport}
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--tool-bg)] border border-[var(--border-color)] hover:border-[var(--active-color)] hover:bg-[var(--secondary-bg)] transition-all group"
                 >
                    <Icons.Download size={20} className="text-[var(--icon-color)] mb-1 group-hover:text-[var(--active-color)]" />
                    <span className="text-[10px] font-medium text-[var(--text-color)]">Download JSON</span>
                 </button>

                 {/* 4. Reset */}
                 <button 
                    onClick={onReset}
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-all group"
                 >
                    <Icons.Trash size={20} className="text-red-400 mb-1 group-hover:text-red-600" />
                    <span className="text-[10px] font-medium text-red-600">Reset All</span>
                 </button>
            </div>
            
            {showShare && (
                 <div className="mt-3 p-4 bg-[var(--tool-bg)] rounded-xl border border-[var(--border-color)] animate-in fade-in space-y-4">
                    
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-50 block">Options</span>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={shareTransparent} onChange={(e) => setShareTransparent(e.target.checked)} />
                                <span className="text-[10px] text-[var(--text-color)]">Transparent BG</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={shareGyro} onChange={(e) => setShareGyro(e.target.checked)} />
                                <span className="text-[10px] text-[var(--text-color)]">Enable Gyro</span>
                            </label>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                         <div className="flex flex-col gap-2">
                             <button 
                                onClick={generateCloudLink}
                                disabled={cloudStatus === 'uploading'}
                                className={`w-full py-3 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${
                                    cloudStatus === 'uploading'
                                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                                    : 'bg-[var(--active-color)] text-white hover:opacity-90 shadow-md hover:shadow-lg'
                                }`}
                             >
                                 {cloudStatus === 'uploading' ? 'Generating Link...' : 'Generate Automatic Link'}
                             </button>
                             {cloudStatus === 'error-fallback' && (
                                 <div className="bg-blue-50 text-blue-700 p-2 rounded text-[10px] text-center border border-blue-100">
                                     <strong>Offline Link Generated</strong><br/>
                                     Cloud upload unavailable. Using compressed data link.
                                 </div>
                             )}
                         </div>

                        {cloudLink && (cloudStatus === 'success' || cloudStatus === 'error-fallback') && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-50 block">Copy Embed Code</span>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(cloudLink)}
                                        className="text-[10px] text-[var(--active-color)] hover:underline"
                                    >
                                        Copy Direct Link
                                    </button>
                                </div>
                                <textarea 
                                    readOnly
                                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                    className="w-full h-24 text-[10px] font-mono bg-[var(--secondary-bg)] border border-[var(--border-color)] rounded-lg p-2 resize-none focus:outline-none text-[var(--text-color)]"
                                    value={`<iframe src="${cloudLink}" width="100%" height="600" style="border:none; border-radius:12px; overflow:hidden;" allow="accelerometer; gyroscope;"></iframe>`}
                                />
                                <p className="text-[9px] text-[var(--secondary-text)] text-center">
                                    {cloudStatus === 'success' 
                                        ? "Hosted via JSONBlob. No setup required." 
                                        : "Offline Mode. Works everywhere but URL is long."}
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