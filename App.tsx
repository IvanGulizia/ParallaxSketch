
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar';
import { LayerSlider } from './components/LayerSlider';
import { DrawingCanvas } from './components/DrawingCanvas';
import { MenuOverlay } from './components/MenuOverlay';
import { ToolType, AppState, Stroke, EraserMode, BlendMode, TrajectoryType, SymmetryMode } from './types';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import LZString from 'lz-string';
import { Icons } from './components/Icons';

// Extended Harmonious Palettes (7 colors)
const PRESET_PALETTES = [
    ['#E0BBE4', '#957DAD', '#D291BC', '#FEC8D8', '#FFDFD3', '#D6E2E9', '#F1E3D3'], // Pastel Sunset
    ['#F4F1DE', '#E07A5F', '#3D405B', '#81B29A', '#F2CC8F', '#9F86C0', '#5E548E'], // Terra Extended
    ['#CCD5AE', '#E9EDC9', '#FEFAE0', '#FAEDCD', '#D4A373', '#A3B18A', '#588157'], // Nature
    ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51', '#2B9348', '#8338EC'], // Vivid
    ['#4A4A4A', '#8C8C80', '#D8D4C5', '#EFEDE6', '#FDFCF8', '#2F3E46', '#CAD2C5'], // Monochrome
    ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff'], // Rainbow Pastel
    ['#a0c4ff', '#bdb2ff', '#ffc6ff', '#fffffc', '#d4d4d4', '#e2e2df', '#d2d2cf'], // Soft Cool
    ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7', '#669bbc', '#006d77'], // Retro Pop
    ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25', '#a3b18a', '#588157'], // Earthy Green
    ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429', '#023047', '#ffb703'], // Americano
    ['#fff100', '#ff8c00', '#e81123', '#ec008c', '#68217a', '#00188f', '#00bcf2'], // CMYK Vibes
    ['#dad7cd', '#a3b18a', '#588157', '#3a5a40', '#344e41', '#3a0ca3', '#4361ee'], // Forest
    ['#000000', '#14213d', '#fca311', '#e5e5e5', '#ffffff', '#e0e1dd', '#778da9'], // High Contrast
    ['#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff', '#8d99ae', '#2b2d42'], // Cotton Candy
    ['#7400b8', '#6930c3', '#5e60ce', '#5390d9', '#4ea8de', '#48bfe3', '#56cfe1'], // Deep Purple Blue
    ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557', '#457b9d', '#a8dadc'], // Americana
    ['#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057'], // Grays
    ['#ffe5ec', '#ffc2d1', '#ffb3c6', '#ff8fab', '#fb6f92', '#ff006e', '#8338ec'], // Pink Love
    ['#d8e2dc', '#ffe5d9', '#ffcad4', '#f4acb7', '#9d8189', '#f2e9e4', '#c9ada7'], // Muted Rose
    ['#03045e', '#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48bfe3', '#90e0ef']  // Ocean
];

// Helper Component for Shortcuts Overlay
const ShortcutsOverlay = ({ onClose, isEmbed }: { onClose: () => void, isEmbed: boolean }) => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Shortcuts</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icons.Close size={20} /></button>
            </div>
            
            <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span>Play / Pause</span>
                    <div className="flex gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">Space</kbd></div>
                </div>
                {isEmbed && (
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span>Menu / Help</span>
                        <div className="flex gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">M</kbd></div>
                    </div>
                )}
                {!isEmbed && (
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span>Export JSON</span>
                        <div className="flex gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">E</kbd></div>
                    </div>
                )}
                {!isEmbed && (
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span>Select Color (1-7)</span>
                        <div className="flex gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">1</kbd>...<kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">7</kbd></div>
                    </div>
                )}
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span>Pick Color</span>
                    <div className="flex gap-1"><span className="text-xs italic">Right Click</span></div>
                </div>
                {isEmbed && (
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span>Toggle Gyro</span>
                        <div className="flex gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">A</kbd> or <span className="text-xs italic">Double Tap</span></div>
                    </div>
                )}
                {!isEmbed && (
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span>Prev / Next Palette</span>
                        <div className="flex gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">A</kbd> / <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">D</kbd></div>
                    </div>
                )}
                {isEmbed && (
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span>Next Palette</span>
                        <div className="flex gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">D</kbd> or <span className="text-xs italic">Swipe Right</span></div>
                    </div>
                )}
                 <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span>Focus Layer</span>
                    <div className="flex gap-1"><Icons.ArrowUp size={12}/> / <Icons.ArrowDown size={12}/></div>
                </div>
                 <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span>Active Layer</span>
                    <div className="flex gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">W</kbd> / <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">S</kbd></div>
                </div>
                <div className="flex justify-between items-center">
                    <span>Depth of Field</span>
                    <div className="flex gap-1"><span className="text-xs italic">Shift + Scroll</span> {isEmbed && <span>or <span className="text-xs italic">Pinch</span></span>}</div>
                </div>
            </div>
        </div>
    </div>
);

export default function App() {
  // Detect Mobile/iPad for default settings
  // iPad Pro often reports as MacIntel but has touch points
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const [state, setState] = useState<AppState>({
    activeTool: ToolType.BRUSH,
    activeLayer: 3, // Default middle layer (0-6) is 3
    brushSize: 10,
    activeColorSlot: 0,
    activeSecondaryColorSlot: 1,
    activeBlendMode: 'normal',
    activeFillBlendMode: 'normal',
    isFillEnabled: false,
    isColorSynced: false, 
    isStrokeEnabled: true,
    palette: PRESET_PALETTES[0], 
    parallaxStrength: 10, 
    parallaxInverted: false,
    springConfig: { stiffness: 0.2, damping: 0.2 }, 
    focalLayerIndex: 3, // Default focal point in middle of 7 layers
    isPlaying: false,
    useGyroscope: isMobile, 
    isLowPowerMode: true, 
    eraserMode: EraserMode.STROKE, 
    isMenuOpen: false,
    canvasBackgroundColor: '#FFFFFF',
    canvasWidth: 100, 
    aspectRatio: null, 
    
    // Grid
    isGridEnabled: false,
    isSnappingEnabled: true,
    gridSize: 40,
    symmetryMode: SymmetryMode.NONE,
    
    // Visual
    isOnionSkinEnabled: true,
    blurStrength: 0,
    focusRange: 0,

    globalLayerBlendMode: 'normal',
    // Initialized for 7 layers (0-6)
    layerBlendModes: { 0: 'normal', 1: 'normal', 2: 'normal', 3: 'normal', 4: 'normal', 5: 'normal', 6: 'normal' },
    layerBlurStrengths: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    uiTheme: {
        activeColor: "#566fa8",
        textColor: "#18284c",
        secondaryText: "#d5cdb4",
        toolBg: "#FFFFFF",
        menuBg: "#f8f8f6",
        appBg: "#f8f8f6",
        buttonBg: "#FFFFFF",
        borderColor: "#efeadc",
        buttonBorder: "#efeadc",
        iconColor: "#18284c",
        sliderTrack: "#d3cdba", 
        sliderFilled: "#97b1fb",
        sliderHandle: "#566fa8",
        disabledColor: "#d4cdb7",
        scrollbarThumb: "#eeeadd",
        scrollbarTrack: "#ffffff" 
    },
    isEmbedMode: false,
    isTransparentEmbed: false,

    // Export defaults
    exportConfig: {
        isActive: false,
        isRecording: false,
        trajectory: TrajectoryType.FIGURE8,
        duration: 3,
        format: 'webm'
    }
  });

  // History now tracks committed states, not visual transient states
  const [history, setHistory] = useState<Stroke[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Visual Strokes state (the current strokes being rendered)
  // This is detached from history to prevent micro-movements from spamming the stack
  const [currentStrokes, setCurrentStrokes] = useState<Stroke[]>([]);

  // Embed specific state
  const [showEmbedShortcuts, setShowEmbedShortcuts] = useState(false);
  const lastTap = useRef<number>(0);

  // Sync history with current strokes on load or undo/redo
  useEffect(() => {
      setCurrentStrokes(history[historyIndex]);
  }, [history, historyIndex]);

  // Request Gyro Permission helper
  const requestGyroPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
            const response = await (DeviceOrientationEvent as any).requestPermission();
            if (response === 'granted') {
                setState(s => ({ ...s, useGyroscope: true }));
                return true;
            }
        } catch (e) {
            console.error("Gyro permission error", e);
        }
        return false;
    }
    setState(s => ({ ...s, useGyroscope: !s.useGyroscope }));
    return true; 
  };

  // Apply UI Theme CSS Variables & Layout Spacing
  useEffect(() => {
      const root = document.documentElement;
      root.style.setProperty('--active-color', state.uiTheme.activeColor);
      root.style.setProperty('--text-color', state.uiTheme.textColor);
      root.style.setProperty('--secondary-text', state.uiTheme.secondaryText);
      root.style.setProperty('--tool-bg', state.uiTheme.toolBg);
      root.style.setProperty('--menu-bg', state.uiTheme.menuBg);
      root.style.setProperty('--secondary-bg', state.uiTheme.appBg);
      root.style.setProperty('--button-bg', state.uiTheme.buttonBg);
      root.style.setProperty('--border-color', state.uiTheme.borderColor);
      root.style.setProperty('--button-border', state.uiTheme.buttonBorder);
      root.style.setProperty('--icon-color', state.uiTheme.iconColor);
      root.style.setProperty('--slider-track', state.uiTheme.sliderTrack);
      root.style.setProperty('--slider-filled', state.uiTheme.sliderFilled);
      root.style.setProperty('--slider-handle', state.uiTheme.sliderHandle);
      root.style.setProperty('--disabled-color', state.uiTheme.disabledColor);
      root.style.setProperty('--scrollbar-thumb', state.uiTheme.scrollbarThumb);
      root.style.setProperty('--scrollbar-track', state.uiTheme.scrollbarTrack);
      
      const updateSpacing = () => {
          const isMobile = window.innerWidth < 768;
          root.style.setProperty('--spacing-x', isMobile ? '1rem' : '3rem');
      };
      
      window.addEventListener('resize', updateSpacing);
      updateSpacing();

      const styleId = 'theme-scrollbar-style';
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
          .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: ${state.uiTheme.scrollbarThumb} ${state.uiTheme.scrollbarTrack};
          }
          .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
              background: ${state.uiTheme.scrollbarTrack};
              border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
              background-color: ${state.uiTheme.scrollbarThumb};
              border-radius: 99px;
              border: 2px solid ${state.uiTheme.scrollbarTrack};
              background-clip: content-box;
          }
      `;
      
      return () => window.removeEventListener('resize', updateSpacing);
  }, [state.uiTheme]);

  // Handle Scroll to Switch Layers (Standard App Mode)
  useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
          // Shift + Scroll for DoF (Global)
          if (e.shiftKey) {
              e.preventDefault();
              const sign = Math.sign(e.deltaY); 
              const delta = sign > 0 ? -1 : 1; 
              setState(s => ({ ...s, blurStrength: Math.max(0, Math.min(20, s.blurStrength + delta)) }));
              return;
          }

          // Normal Layer Scroll (Only if not Embed)
          if (state.isEmbedMode) return;
          if ((e.target as HTMLElement).closest('.menu-overlay-container')) return;

          e.preventDefault();
          if (Math.abs(e.deltaY) > 10) {
              setState(s => {
                  const dir = e.deltaY > 0 ? -1 : 1;
                  // Updated to max 6
                  const next = Math.max(0, Math.min(6, s.activeLayer + dir));
                  if (next === s.activeLayer) return s;
                  return { ...s, activeLayer: next };
              });
          }
      };

      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => window.removeEventListener('wheel', handleWheel);
  }, [state.isMenuOpen, state.isEmbedMode]);

  const loadData = (data: any, isTransparent: boolean) => {
      if (!data) return;

      if (data.s) {
          const reconstructedStrokes: Stroke[] = data.s.map((minStroke: any) => ({
              id: uuidv4(),
              points: minStroke.p.map((pt: number[]) => ({ x: pt[0], y: pt[1] })),
              colorSlot: minStroke.c,
              fillColorSlot: minStroke.fc,
              size: minStroke.s,
              tool: minStroke.t === 1 ? ToolType.ERASER : ToolType.BRUSH,
              layerId: minStroke.l,
              isEraser: minStroke.t === 1,
              blendMode: minStroke.bm || 'normal',
              fillBlendMode: minStroke.fbm || 'normal',
              isStrokeEnabled: true
          }));
          setHistory([reconstructedStrokes]);
          setHistoryIndex(0);
          
          if (data.c) {
              setState(s => ({
              ...s,
              palette: data.p || s.palette,
              parallaxStrength: data.c.ps ?? s.parallaxStrength,
              parallaxInverted: data.c.pi === 1,
              canvasWidth: data.c.cw ?? s.canvasWidth,
              focalLayerIndex: data.c.fl ?? s.focalLayerIndex,
              canvasBackgroundColor: isTransparent ? 'transparent' : (data.c.bg ?? s.canvasBackgroundColor),
              blurStrength: data.c.bs ?? s.blurStrength,
              focusRange: data.c.fr ?? s.focusRange,
              symmetryMode: data.c.sm ?? SymmetryMode.NONE
              }));
          }
      } 
      else if (data.strokes) {
          setHistory([data.strokes]);
          setHistoryIndex(0);
          setState(s => ({
              ...s,
              palette: data.palette || s.palette,
              focalLayerIndex: data.config?.focalLayerIndex ?? s.focalLayerIndex,
              globalLayerBlendMode: data.config?.globalLayerBlendMode ?? s.globalLayerBlendMode,
              layerBlendModes: data.config?.layerBlendModes ?? s.layerBlendModes,
              layerBlurStrengths: data.config?.layerBlurStrengths ?? s.layerBlurStrengths,
              canvasWidth: data.config?.canvasWidth ?? s.canvasWidth
          }));
      }
  };

  const handleCyclePalette = (direction: -1 | 1) => {
     const currentIndex = PRESET_PALETTES.indexOf(state.palette);
     let nextIndex = 0;
     if (currentIndex !== -1) {
         nextIndex = (currentIndex + direction + PRESET_PALETTES.length) % PRESET_PALETTES.length;
     }
     setState(s => ({ ...s, palette: PRESET_PALETTES[nextIndex] }));
  };
  
  const handleExport = () => {
    const data = JSON.stringify({ 
        version: 7,
        palette: state.palette,
        strokes: currentStrokes,
        config: {
            parallaxStrength: state.parallaxStrength,
            parallaxInverted: state.parallaxInverted,
            focalLayerIndex: state.focalLayerIndex,
            springConfig: state.springConfig,
            backgroundColor: state.canvasBackgroundColor,
            globalLayerBlendMode: state.globalLayerBlendMode,
            canvasWidth: state.canvasWidth,
            layerBlendModes: state.layerBlendModes,
            layerBlurStrengths: state.layerBlurStrengths,
            blurStrength: state.blurStrength,
            focusRange: state.focusRange,
            symmetryMode: state.symmetryMode
        }
    });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zen-sketch.json';
    a.click();
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Global Shortcuts
          
          // Play / Pause
          if (e.code === 'Space') {
              e.preventDefault(); 
              handleTogglePlay();
          }

          // SWAPPED W/S Logic based on user request:
          // W now increases Active Layer (Front)
          if (e.key === 'w') {
              setState(s => ({ ...s, activeLayer: Math.min(6, s.activeLayer + 1) }));
          }
          // S now decreases Active Layer (Back)
          if (e.key === 's') {
               setState(s => ({ ...s, activeLayer: Math.max(0, s.activeLayer - 1) }));
          }

          // Embed Specific
          if (state.isEmbedMode) {
              // Map arrows to focal layer in embed (matches creation logic below)
              if (e.key === 'ArrowUp') setState(s => ({ ...s, focalLayerIndex: Math.max(0, s.focalLayerIndex - 1) }));
              if (e.key === 'ArrowDown') setState(s => ({ ...s, focalLayerIndex: Math.min(6, s.focalLayerIndex + 1) }));

              if (e.key === 'd' || e.key === 'ArrowRight') handleCyclePalette(1); // Next
              if (e.key === 'a' || e.key === 'ArrowLeft') {
                  setState(s => ({ ...s, useGyroscope: !s.useGyroscope }));
              }
              if (e.key === 'm') {
                  setShowEmbedShortcuts(prev => !prev);
              }
              if (e.key === 'r') {
                  handleReset();
              }
          }

          // Creation Specific Shortcuts
          if (!state.isEmbedMode) {
              if (e.key === 'd') handleCyclePalette(1);
              if (e.key === 'a') handleCyclePalette(-1);

              // SWAPPED Arrow Up/Down Logic:
              // Arrow Up now controls Focal Layer (Back/Away) - Matches previous 'W' logic
              if (e.key === 'ArrowUp') setState(s => ({ ...s, focalLayerIndex: Math.max(0, s.focalLayerIndex - 1) }));
              // Arrow Down now controls Focal Layer (Front/Closer) - Matches previous 'S' logic
              if (e.key === 'ArrowDown') setState(s => ({ ...s, focalLayerIndex: Math.min(6, s.focalLayerIndex + 1) }));

              if (e.key === 'e') {
                  handleExport();
              }
              if (e.key === 'r') {
                  handleReset();
              }
              if (['1','2','3','4','5','6','7'].includes(e.key)) {
                  const index = parseInt(e.key) - 1;
                  handleColorPick(index);
              }
          }
      };

      let initialPinchDist = 0;
      let initialBlur = 0;
      let touchStartX = 0;
      let touchStartY = 0;

      const handleTouchStart = (e: TouchEvent) => {
          if (state.isEmbedMode) {
              if (e.touches.length === 2) {
                  initialPinchDist = Math.hypot(
                      e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY
                  );
                  initialBlur = state.blurStrength;
              } else if (e.touches.length === 1) {
                  touchStartX = e.touches[0].clientX;
                  touchStartY = e.touches[0].clientY;
              }
          }
      };

      const handleTouchEnd = (e: TouchEvent) => {
          if (state.isEmbedMode) {
              initialPinchDist = 0;
              
              const now = Date.now();
              if (now - lastTap.current < 300) {
                  requestGyroPermission();
              }
              lastTap.current = now;

              if (e.changedTouches.length === 1) {
                 const touchEndX = e.changedTouches[0].clientX;
                 const touchEndY = e.changedTouches[0].clientY;
                 const dx = touchEndX - touchStartX;
                 const dy = touchEndY - touchStartY;
                 if (Math.abs(dx) > 100 && Math.abs(dy) < 60) {
                     if (dx > 0) handleCyclePalette(1);
                     else setState(s => ({ ...s, useGyroscope: !s.useGyroscope }));
                 }
              }
          }
      };
      
      const handleTouchMove = (e: TouchEvent) => {
          if (state.isEmbedMode && e.touches.length === 2 && initialPinchDist > 0) {
              e.preventDefault(); 
              const currentDist = Math.hypot(
                  e.touches[0].clientX - e.touches[1].clientX,
                  e.touches[0].clientY - e.touches[1].clientY
              );
              const delta = (currentDist - initialPinchDist) / 10; 
              const newBlur = initialBlur - delta;
              setState(s => ({ ...s, blurStrength: Math.max(0, Math.min(20, newBlur)) }));
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });

      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('touchstart', handleTouchStart);
          window.removeEventListener('touchend', handleTouchEnd);
          window.removeEventListener('touchmove', handleTouchMove);
      };
  }, [state.isEmbedMode, state.palette, state.focalLayerIndex, state.blurStrength, state.isPlaying, state.useGyroscope, state.activeLayer]);

  useEffect(() => {
      if (state.isEmbedMode) {
          setState(s => ({ ...s, activeLayer: s.focalLayerIndex }));
      }
  }, [state.focalLayerIndex, state.isEmbedMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'embed') {
        const isTransparent = params.get('bg') === 'transparent';
        
        // Improved Mobile Detection for iPad
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        const pStrength = params.get('strength');
        const pInverted = params.get('inverted');
        const pStiffness = params.get('stiffness');
        const pDamping = params.get('damping');
        const pBlur = params.get('blur');
        const pFocus = params.get('focus');
        const pFocalLayer = params.get('focalLayer');
        const pGrid = params.get('grid');
        const pSnap = params.get('snap');
        const pGridSize = params.get('gridSize');
        const pWidth = params.get('width');
        const pAspect = params.get('aspect');
        const pGlobalBlend = params.get('globalBlend');
        const pStrokeColor = params.get('strokeColor');
        const pSymmetry = params.get('symmetry');
        const pUi = params.get('ui');
        
        // Embed Styling
        const pRadius = params.get('borderRadius');
        const pBorderW = params.get('borderWidth');
        const pBorderC = params.get('borderColor');

        const defaultColorSlot = pStrokeColor ? -1 : (isMobileDevice ? 0 : -1);

        setState(s => ({
            ...s,
            isEmbedMode: true,
            isTransparentEmbed: isTransparent,
            isPlaying: true,
            parallaxStrength: pStrength ? parseInt(pStrength) : 50,
            parallaxInverted: pInverted === 'true',
            springConfig: {
                stiffness: pStiffness ? parseFloat(pStiffness) : 0.05,
                damping: pDamping ? parseFloat(pDamping) : 0.92
            },
            blurStrength: pBlur ? parseInt(pBlur) : 0,
            focusRange: pFocus ? parseFloat(pFocus) : 0,
            focalLayerIndex: pFocalLayer ? parseInt(pFocalLayer) : 3, 
            isGridEnabled: pGrid === 'true',
            isSnappingEnabled: pSnap === 'true',
            gridSize: pGridSize ? parseInt(pGridSize) : 40,
            canvasWidth: pWidth ? parseInt(pWidth) : 100,
            aspectRatio: pAspect ? parseFloat(pAspect) : null,
            globalLayerBlendMode: (pGlobalBlend as BlendMode) || 'normal',
            canvasBackgroundColor: isTransparent ? 'transparent' : (params.get('bg') ? '#' + params.get('bg') : '#FFFFFF'),
            useGyroscope: isMobileDevice, 
            isLowPowerMode: true,
            activeColorSlot: defaultColorSlot,
            symmetryMode: (pSymmetry as SymmetryMode) || SymmetryMode.NONE,
            embedStyle: {
                borderRadius: pRadius ? parseInt(pRadius) : 0,
                borderWidth: pBorderW ? parseInt(pBorderW) : 0,
                borderColor: pBorderC ? '#' + pBorderC : '#000000'
            }
        }));
        
        // Hide UI if ui=false param
        if (pUi === 'false') {
            // We don't have a specific state for suppressing all UI, but we can assume minimal
            // The shortcuts overlay is hidden by default anyway
        }

        const externalUrl = params.get('url');
        if (externalUrl) {
            const decodedUrl = decodeURIComponent(externalUrl);
            fetch(decodedUrl)
                .then(res => { if (!res.ok) throw new Error("Failed"); return res.json(); })
                .then(data => loadData(data, isTransparent))
                .catch(err => console.error("Ext error", err));
            return;
        }
        
        // Vercel KV ID Loading
        const vercelId = params.get('vercelId');
        if (vercelId) {
            fetch(`/api/load?id=${vercelId}`)
                .then(res => { if (!res.ok) throw new Error("Failed"); return res.json(); })
                .then(data => loadData(data, isTransparent))
                .catch(err => console.error("Vercel Load Error", err));
            return;
        }

        const encodedData = params.get('encoded');
        if (encodedData) {
            try {
                let jsonStr = '';
                const decompressed = LZString.decompressFromEncodedURIComponent(encodedData);
                if (decompressed) jsonStr = decompressed;
                else { try { jsonStr = atob(encodedData); } catch (e) {} }
                if (jsonStr) loadData(JSON.parse(jsonStr), isTransparent);
            } catch (e) {}
        }
    }
  }, []);

  // Visual Update Only
  const handleStrokesChange = useCallback((newStrokes: Stroke[]) => {
    setCurrentStrokes(newStrokes);
  }, []);

  // Commit to History (Undo Point)
  const handleStrokeCommit = useCallback((finalStrokes: Stroke[]) => {
      // Deep copy to ensure isolation
      const safeStrokes = JSON.parse(JSON.stringify(finalStrokes));
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(safeStrokes);
      if (newHistory.length > 20) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentStrokes(safeStrokes); // Ensure sync
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };
  
  const handleReset = () => {
      // Push an empty state to history instead of resetting history
      handleStrokeCommit([]);
  };

  const handlePaletteChange = (index: number, newColor: string) => {
    const newPalette = [...state.palette];
    newPalette[index] = newColor;
    setState(s => ({ ...s, palette: newPalette }));
  };

  const handleColorPick = (slotIndex: number) => {
      setState(s => ({ ...s, activeColorSlot: slotIndex, activeTool: ToolType.BRUSH }));
  };

  const getEncodedState = useCallback(() => {
     const minStrokes = currentStrokes.map(s => ({
         p: s.points.map(pt => [Number(pt.x.toFixed(4)), Number(pt.y.toFixed(4))]),
         c: s.colorSlot,
         s: s.size,
         t: s.tool === ToolType.ERASER ? 1 : 0,
         l: s.layerId,
         fc: s.fillColorSlot,
         bm: s.blendMode,
         fbm: s.fillBlendMode
     }));

     const minData = {
         s: minStrokes,
         p: state.palette,
         c: {
             ps: state.parallaxStrength,
             pi: state.parallaxInverted ? 1 : 0,
             bg: state.canvasBackgroundColor,
             cw: state.canvasWidth,
             fl: state.focalLayerIndex,
             bs: state.blurStrength,
             fr: state.focusRange,
             sm: state.symmetryMode
         }
     };
     return JSON.stringify(minData);
  }, [currentStrokes, state]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target?.result as string);
            loadData(data, false);
            setState(s => ({ ...s, isMenuOpen: false }));
        } catch (err) { console.error("Invalid file"); }
    };
    reader.readAsText(file);
  };

  const handleTogglePlay = async () => {
    if (isMobile && !state.isPlaying) {
        if (state.useGyroscope) {
             const granted = await requestGyroPermission();
             if (!granted) setState(s => ({ ...s, useGyroscope: false }));
        }
    }
    setState(s => ({ ...s, isPlaying: !s.isPlaying }));
  };

  const getContainerStyle = () => {
      // In embed mode, if aspect ratio is defined, align center.
      // Use margins to center.
      if (state.isEmbedMode) {
          const style: React.CSSProperties = {
              maxHeight: '100%', 
              maxWidth: '100%',
              margin: 'auto'
          };
          if (state.aspectRatio) {
              style.aspectRatio = `${state.aspectRatio}/1`;
          }
          if (state.embedStyle) {
              if (state.embedStyle.borderRadius > 0) style.borderRadius = `${state.embedStyle.borderRadius}px`;
              if (state.embedStyle.borderWidth > 0) {
                  style.border = `${state.embedStyle.borderWidth}px solid ${state.embedStyle.borderColor}`;
                  style.boxSizing = 'border-box';
              }
          }
          // Full width/height for responsive if no aspect ratio locked
          if (!state.aspectRatio) {
              style.width = '100%';
              style.height = '100%';
          }
          return style;
      }

      const baseStyle: React.CSSProperties = {};
      if (state.aspectRatio === 1) {
          baseStyle.height = '85vh';
          baseStyle.aspectRatio = '1/1';
          baseStyle.width = 'auto';
      } else {
          baseStyle.width = `calc(${state.canvasWidth / 100} * (100vw - (6 * var(--spacing-x))))`;
          baseStyle.height = '85vh';
      }
      return baseStyle;
  };

  // Main background logic: transparent for transparent embed, WHITE for regular embed, theme color for app
  const getMainBackgroundClass = () => {
      if (state.isTransparentEmbed) return '';
      if (state.isEmbedMode) return 'bg-white';
      return 'bg-[var(--secondary-bg)]';
  };

  return (
    <main 
        className={`relative w-screen h-screen flex flex-col overflow-hidden transition-colors duration-300 ${getMainBackgroundClass()}`}
        style={{ backgroundColor: state.isEmbedMode && !state.isTransparentEmbed ? '#FFFFFF' : (state.isTransparentEmbed ? 'transparent' : undefined) }}
    >
      {state.isEmbedMode && showEmbedShortcuts && (
          <ShortcutsOverlay onClose={() => setShowEmbedShortcuts(false)} isEmbed={true} />
      )}

      {!state.isEmbedMode && (
        <div className="w-full h-20 flex items-end justify-center pb-4 shrink-0 z-50">
            <Toolbar 
                activeTool={state.activeTool}
                isPlaying={state.isPlaying}
                activeColorSlot={state.activeColorSlot}
                activeSecondaryColorSlot={state.activeSecondaryColorSlot}
                activeBlendMode={state.activeBlendMode}
                activeFillBlendMode={state.activeFillBlendMode}
                isFillEnabled={state.isFillEnabled}
                isColorSynced={state.isColorSynced}
                isStrokeEnabled={true}
                palette={state.palette}
                brushSize={state.brushSize}
                eraserMode={state.eraserMode}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                isEmbedMode={state.isEmbedMode}
                onTogglePlay={handleTogglePlay}
                onToolChange={(tool) => setState(s => ({ ...s, activeTool: tool }))}
                onColorSlotChange={(index, isSecondary) => {
                    if (isSecondary) setState(s => ({ ...s, activeSecondaryColorSlot: index }));
                    else setState(s => ({ ...s, activeColorSlot: index, activeSecondaryColorSlot: s.isColorSynced ? index : s.activeSecondaryColorSlot }));
                }}
                onPaletteChange={handlePaletteChange}
                onCyclePalette={handleCyclePalette}
                onBlendModeChange={(mode, isFill) => {
                    if (isFill) setState(s => ({ ...s, activeFillBlendMode: mode }));
                    else setState(s => ({ ...s, activeBlendMode: mode }));
                }}
                onToggleFill={(enabled) => setState(s => ({ ...s, isFillEnabled: enabled }))}
                onToggleColorSync={(enabled) => {
                    if (enabled) setState(s => ({ ...s, isColorSynced: true, activeSecondaryColorSlot: s.activeColorSlot }));
                    else setState(s => ({ ...s, isColorSynced: false }));
                }}
                onToggleStroke={() => {}} 
                onSizeChange={(size) => setState(s => ({ ...s, brushSize: size }))}
                onEraserModeChange={(mode) => setState(s => ({ ...s, eraserMode: mode }))}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onReset={handleReset}
                onMenuToggle={() => setState(s => ({ ...s, isMenuOpen: !s.isMenuOpen }))}
            />
        </div>
      )}

      <div className={`flex-1 w-full flex flex-col items-center justify-center pb-8 scroll-layer-area ${state.isEmbedMode ? 'p-0 pb-0' : ''}`}>
        <div 
            className={`relative transition-all duration-300 ease-in-out ${state.isEmbedMode ? '' : ''}`}
            style={getContainerStyle()}
        >
            <div className={`w-full h-full rounded-3xl border border-[var(--border-color)] overflow-hidden ${state.isEmbedMode ? 'rounded-none border-0' : ''}`}>
                <DrawingCanvas 
                    activeTool={state.activeTool}
                    activeLayer={state.activeLayer}
                    brushSize={state.brushSize}
                    activeColorSlot={state.activeColorSlot}
                    activeSecondaryColorSlot={state.activeSecondaryColorSlot}
                    activeBlendMode={state.activeBlendMode}
                    activeFillBlendMode={state.activeFillBlendMode}
                    isFillEnabled={state.isFillEnabled}
                    isStrokeEnabled={true}
                    palette={state.palette}
                    parallaxStrength={state.parallaxStrength}
                    parallaxInverted={state.parallaxInverted}
                    springConfig={state.springConfig}
                    focalLayerIndex={state.focalLayerIndex}
                    isPlaying={state.isPlaying}
                    eraserMode={state.eraserMode}
                    backgroundColor={state.canvasBackgroundColor}
                    globalLayerBlendMode={state.globalLayerBlendMode}
                    layerBlendModes={state.layerBlendModes}
                    isGridEnabled={state.isGridEnabled}
                    isSnappingEnabled={state.isSnappingEnabled}
                    gridSize={state.gridSize}
                    symmetryMode={state.symmetryMode}
                    useGyroscope={state.useGyroscope}
                    isLowPowerMode={state.isLowPowerMode}
                    isOnionSkinEnabled={state.isOnionSkinEnabled}
                    blurStrength={state.blurStrength}
                    focusRange={state.focusRange}
                    onStrokesChange={handleStrokesChange} // Visual Only
                    onStrokeCommit={handleStrokeCommit}   // Undo History
                    strokes={currentStrokes}
                    exportConfig={state.exportConfig}
                    onExportComplete={() => setState(s => ({ ...s, exportConfig: { ...s.exportConfig, isRecording: false } }))}
                    onStopPreview={() => setState(s => ({ ...s, exportConfig: { ...s.exportConfig, isActive: false, isRecording: false } }))}
                    onColorPick={handleColorPick}
                    isEmbedMode={state.isEmbedMode}
                    isMobile={isMobile}
                    onEmbedContextMenu={() => setShowEmbedShortcuts(true)}
                    layerBlurStrengths={state.layerBlurStrengths}
                    sliderTrackColor={state.uiTheme.sliderTrack}
                />
            </div>
            
            {!state.isEmbedMode && (
                <div 
                    className="absolute top-0 bottom-0 hidden md:block"
                    style={{ left: '100%', marginLeft: 'var(--spacing-x)', width: 'var(--spacing-x)' }}
                >
                     <LayerSlider 
                        activeLayer={state.activeLayer}
                        onChange={(layer) => setState(s => ({ ...s, activeLayer: layer }))}
                    />
                </div>
            )}

            <MenuOverlay 
                isOpen={state.isMenuOpen} 
                parallaxStrength={state.parallaxStrength}
                parallaxInverted={state.parallaxInverted}
                focalLayerIndex={state.focalLayerIndex}
                springConfig={state.springConfig}
                backgroundColor={state.canvasBackgroundColor}
                canvasWidth={state.canvasWidth}
                globalLayerBlendMode={state.globalLayerBlendMode}
                activeLayer={state.activeLayer}
                layerBlendModes={state.layerBlendModes}
                layerBlurStrengths={state.layerBlurStrengths}
                aspectRatio={state.aspectRatio}
                uiTheme={state.uiTheme}
                isGridEnabled={state.isGridEnabled}
                isSnappingEnabled={state.isSnappingEnabled}
                gridSize={state.gridSize}
                symmetryMode={state.symmetryMode}
                useGyroscope={state.useGyroscope}
                isLowPowerMode={state.isLowPowerMode}
                isOnionSkinEnabled={state.isOnionSkinEnabled}
                blurStrength={state.blurStrength}
                focusRange={state.focusRange}
                exportConfig={state.exportConfig}
                getEncodedState={getEncodedState}
                onClose={() => setState(s => ({ ...s, isMenuOpen: false }))}
                onImport={handleImport}
                onExport={handleExport}
                onReset={handleReset}
                onParallaxStrengthChange={(val) => setState(s => ({ ...s, parallaxStrength: val }))}
                onParallaxInvertedChange={(val) => setState(s => ({ ...s, parallaxInverted: val }))}
                onFocalLayerChange={(idx) => setState(s => ({ ...s, focalLayerIndex: idx }))}
                onSpringConfigChange={(config) => setState(s => ({ ...s, springConfig: config }))}
                onBackgroundColorChange={(c) => setState(s => ({ ...s, canvasBackgroundColor: c }))}
                onCanvasWidthChange={(w) => setState(s => ({ ...s, canvasWidth: w }))}
                onAspectRatioChange={(r) => setState(s => ({ ...s, aspectRatio: r }))}
                onGlobalLayerBlendModeChange={(mode) => setState(s => ({ ...s, globalLayerBlendMode: mode }))}
                onLayerBlendModeChange={(layerId, mode) => setState(s => ({ ...s, layerBlendModes: { ...s.layerBlendModes, [layerId]: mode } }))}
                onLayerBlurChange={(layerId, val) => setState(s => ({ ...s, layerBlurStrengths: { ...s.layerBlurStrengths, [layerId]: val } }))}
                onUIThemeChange={(theme) => setState(s => ({ ...s, uiTheme: theme }))}
                onGridEnabledChange={(val) => setState(s => ({ ...s, isGridEnabled: val }))}
                onSnappingEnabledChange={(val) => setState(s => ({ ...s, isSnappingEnabled: val }))}
                onGridSizeChange={(val) => setState(s => ({ ...s, gridSize: val }))}
                onSymmetryModeChange={(val) => setState(s => ({ ...s, symmetryMode: val }))}
                onUseGyroscopeChange={(val) => setState(s => ({ ...s, useGyroscope: val }))}
                onLowPowerModeChange={(val) => setState(s => ({ ...s, isLowPowerMode: val }))}
                onOnionSkinEnabledChange={(val) => setState(s => ({ ...s, isOnionSkinEnabled: val }))}
                onBlurStrengthChange={(val) => setState(s => ({ ...s, blurStrength: val }))}
                onFocusRangeChange={(val) => setState(s => ({ ...s, focusRange: val }))}
                onExportConfigChange={(config) => setState(s => ({ ...s, exportConfig: config }))}
            />
        </div>
      </div>
    </main>
  );
}
