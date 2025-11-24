
import React, { useState, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { LayerSlider } from './components/LayerSlider';
import { DrawingCanvas } from './components/DrawingCanvas';
import { MenuOverlay } from './components/MenuOverlay';
import { ToolType, AppState, Stroke, EraserMode, BlendMode, TrajectoryType } from './types';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import LZString from 'lz-string';

// Extended Harmonious Palettes
const PRESET_PALETTES = [
    ['#E0BBE4', '#957DAD', '#D291BC', '#FEC8D8', '#FFDFD3'], // Pastel Sunset
    ['#F4F1DE', '#E07A5F', '#3D405B', '#81B29A', '#F2CC8F'], // Terra
    ['#CCD5AE', '#E9EDC9', '#FEFAE0', '#FAEDCD', '#D4A373'], // Nature
    ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'], // Vivid
    ['#4A4A4A', '#8C8C80', '#D8D4C5', '#EFEDE6', '#FDFCF8'], // Monochrome
    ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff'], // Rainbow Pastel
    ['#a0c4ff', '#bdb2ff', '#ffc6ff', '#fffffc', '#d4d4d4'], // Soft Cool
    ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'], // Retro Pop
    ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'], // Earthy Green
    ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'], // Americano
    ['#fff100', '#ff8c00', '#e81123', '#ec008c', '#68217a'], // CMYK Vibes
    ['#dad7cd', '#a3b18a', '#588157', '#3a5a40', '#344e41'], // Forest
    ['#000000', '#14213d', '#fca311', '#e5e5e5', '#ffffff'], // High Contrast
    ['#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff'], // Cotton Candy
    ['#7400b8', '#6930c3', '#5e60ce', '#5390d9', '#4ea8de'], // Deep Purple Blue
    ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557'], // Americana
    ['#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd'], // Grays
    ['#ffe5ec', '#ffc2d1', '#ffb3c6', '#ff8fab', '#fb6f92'], // Pink Love
    ['#d8e2dc', '#ffe5d9', '#ffcad4', '#f4acb7', '#9d8189'], // Muted Rose
    ['#03045e', '#023e8a', '#0077b6', '#0096c7', '#00b4d8']  // Ocean
];

export default function App() {
  // Detect Mobile for default settings
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const [state, setState] = useState<AppState>({
    activeTool: ToolType.BRUSH,
    activeLayer: 2, 
    brushSize: 10,
    activeColorSlot: 0,
    activeSecondaryColorSlot: 1,
    activeBlendMode: 'normal',
    activeFillBlendMode: 'normal',
    isFillEnabled: false,
    isColorSynced: false, 
    isStrokeEnabled: true,
    palette: PRESET_PALETTES[0], 
    parallaxStrength: 10, // Default 10%
    parallaxInverted: false,
    springConfig: { stiffness: 0.2, damping: 0.2 }, // Default 20/20
    focalLayerIndex: 2, 
    isPlaying: false,
    useGyroscope: isMobile, // Default to true on mobile
    isLowPowerMode: true, // Eco Mode by default
    eraserMode: EraserMode.STROKE, 
    isMenuOpen: false,
    canvasBackgroundColor: '#FFFFFF', // Ensures white by default
    canvasWidth: 100, // Default to 100% to show the 3x layout
    aspectRatio: null, // null = flexible
    
    // Grid
    isGridEnabled: false,
    isSnappingEnabled: true,
    gridSize: 40,
    
    // Visual
    isOnionSkinEnabled: true,
    blurStrength: 0,
    focusRange: 0,

    globalLayerBlendMode: 'normal',
    layerBlendModes: { 0: 'normal', 1: 'normal', 2: 'normal', 3: 'normal', 4: 'normal' },
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
        sliderTrack: "#d3cdba", // Updated color request
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

  const [history, setHistory] = useState<Stroke[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const currentStrokes = history[historyIndex];

  // Request Gyro Permission helper
  const requestGyroPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
            const response = await (DeviceOrientationEvent as any).requestPermission();
            if (response === 'granted') {
                return true;
            }
        } catch (e) {
            console.error("Gyro permission error", e);
        }
        return false;
    }
    return true; // No permission needed on Android/Desktop usually
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

      // Inject Scrollbar Styles
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

  // Handle Scroll to Switch Layers
  useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
          if (state.isEmbedMode) return;
          
          // Allow scrolling only if NOT hovering the menu
          if ((e.target as HTMLElement).closest('.menu-overlay-container')) return;

          // Check if target is inside main area or general body
          e.preventDefault();
          if (Math.abs(e.deltaY) > 10) {
              setState(s => {
                  const dir = e.deltaY > 0 ? -1 : 1;
                  const next = Math.max(0, Math.min(4, s.activeLayer + dir));
                  if (next === s.activeLayer) return s;
                  return { ...s, activeLayer: next };
              });
          }
      };

      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => window.removeEventListener('wheel', handleWheel);
  }, [state.isMenuOpen, state.isEmbedMode]);

  // Load Data Helper
  const loadData = (data: any, isTransparent: boolean) => {
      if (!data) return;

      // Check if it's the minified format (from cloud or lz-string)
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
              isStrokeEnabled: true // Default
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
              focusRange: data.c.fr ?? s.focusRange
              }));
          }
      } 
      // Legacy Format support
      else if (data.strokes) {
          setHistory([data.strokes]);
          setHistoryIndex(0);
          setState(s => ({
              ...s,
              palette: data.palette || s.palette,
              focalLayerIndex: data.config?.focalLayerIndex ?? s.focalLayerIndex,
              globalLayerBlendMode: data.config?.globalLayerBlendMode ?? s.globalLayerBlendMode,
              layerBlendModes: data.config?.layerBlendModes ?? s.layerBlendModes,
              canvasWidth: data.config?.canvasWidth ?? s.canvasWidth
          }));
      }
  };

  // Initialize based on URL params (Embed Mode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'embed') {
        const isTransparent = params.get('bg') === 'transparent';
        const gyroParam = params.get('gyro');
        
        // Initial Embed State
        setState(s => ({
            ...s,
            isEmbedMode: true,
            isTransparentEmbed: isTransparent,
            isPlaying: true, // Auto play for physics
            parallaxStrength: parseInt(params.get('strength') || '50'),
            parallaxInverted: params.get('inverted') === 'true',
            springConfig: {
                stiffness: parseFloat(params.get('stiffness') || '0.05'),
                damping: parseFloat(params.get('damping') || '0.92')
            },
            canvasBackgroundColor: isTransparent ? 'transparent' : (params.get('bg') ? '#' + params.get('bg') : '#FFFFFF'),
            useGyroscope: gyroParam === 'true',
            isLowPowerMode: false
        }));

        // 0. Check for Direct External URL (e.g. Gist)
        const externalUrl = params.get('url');
        if (externalUrl) {
            // Decode potential URI encoding
            const decodedUrl = decodeURIComponent(externalUrl);
            fetch(decodedUrl)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch external JSON");
                    return res.json();
                })
                .then(data => loadData(data, isTransparent))
                .catch(err => console.error("External fetch error:", err));
            return;
        }

        // 1. Check for Supabase
        const provider = params.get('provider');
        const id = params.get('id');
        const sbUrl = params.get('sbUrl');
        const sbKey = params.get('sbKey');

        if (provider === 'supabase' && id && sbUrl && sbKey) {
            fetch(`${sbUrl}/rest/v1/sketches?id=eq.${id}&select=data`, {
                headers: {
                    'apikey': sbKey,
                    'Authorization': `Bearer ${sbKey}`
                }
            })
            .then(res => {
                if (!res.ok) throw new Error("Supabase fetch failed");
                return res.json();
            })
            .then(data => {
                if (data && data[0] && data[0].data) {
                    loadData(data[0].data, isTransparent);
                }
            })
            .catch(err => console.error(err));
            return;
        }

        // 2. Check for JSONBlob ID (Short Link)
        const blobId = params.get('blob');
        if (blobId) {
            fetch(`https://jsonblob.com/api/jsonBlob/${blobId}`)
                .then(res => {
                    if (!res.ok) throw new Error("Blob not found");
                    return res.json();
                })
                .then(data => loadData(data, isTransparent))
                .catch(err => {
                    console.error("Failed to load blob:", err);
                    // Silent fail for now, maybe show a toast in future
                });
            return; // Skip other methods
        }

        // 3. Check for Encoded Data (Fallback)
        const encodedData = params.get('encoded');
        if (encodedData) {
            try {
                let jsonStr = '';
                const decompressed = LZString.decompressFromEncodedURIComponent(encodedData);
                if (decompressed) {
                    jsonStr = decompressed;
                } else {
                    try { jsonStr = atob(encodedData); } catch (e) {}
                }

                if (jsonStr) {
                    loadData(JSON.parse(jsonStr), isTransparent);
                }
            } catch (e) {
                console.error("Failed to decode embed data", e);
            }
        }
    }
  }, []);

  const handleStrokesChange = useCallback((newStrokes: Stroke[]) => {
    // Deep copy current strokes to ensure history immutability
    // This fixes the undo/redo bug where reference mutation corrupted previous states
    const safeStrokes = JSON.parse(JSON.stringify(newStrokes));

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(safeStrokes);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };
  
  const handleReset = () => {
      // Don't close menu immediately if open, just reset data
      setHistory([[]]);
      setHistoryIndex(0);
  };

  const handlePaletteChange = (index: number, newColor: string) => {
    const newPalette = [...state.palette];
    newPalette[index] = newColor;
    setState(s => ({ ...s, palette: newPalette }));
  };

  const handleRandomizePalette = () => {
      // Ensure we get a different one
      let newPalette;
      do {
          newPalette = PRESET_PALETTES[Math.floor(Math.random() * PRESET_PALETTES.length)];
      } while (newPalette === state.palette);
      setState(s => ({ ...s, palette: newPalette }));
  };

  const handleColorPick = (slotIndex: number) => {
      setState(s => ({ 
          ...s, 
          activeColorSlot: slotIndex, 
          activeTool: ToolType.BRUSH // Auto switch to brush for convenience
      }));
  };

  // Import / Export Logic
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
            blurStrength: state.blurStrength,
            focusRange: state.focusRange
        }
    });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zen-sketch.json';
    a.click();
  };

  // Helper to encode state
  const getEncodedState = useCallback(() => {
     // Minify data structure to save URL space
     const minStrokes = currentStrokes.map(s => ({
         p: s.points.map(pt => [Number(pt.x.toFixed(4)), Number(pt.y.toFixed(4))]), // Round coordinates
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
             fr: state.focusRange
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
        } catch (err) {
            console.error("Invalid file");
        }
    };
    reader.readAsText(file);
  };

  const handleTogglePlay = async () => {
    // On first play on Mobile, ask for Gyro permission
    if (isMobile && !state.isPlaying) {
        if (state.useGyroscope) {
             const granted = await requestGyroPermission();
             if (!granted) {
                 setState(s => ({ ...s, useGyroscope: false }));
             }
        }
    }
    setState(s => ({ ...s, isPlaying: !s.isPlaying }));
  };

  // Layout Style Logic
  const getContainerStyle = () => {
      if (state.isEmbedMode) return { width: '100%', height: '100%' };
      
      const baseStyle: React.CSSProperties = {};
      
      if (state.aspectRatio === 1) {
          // Square Mode: Prioritize height fit, let width be determined by aspect ratio
          baseStyle.height = '85vh';
          baseStyle.aspectRatio = '1/1';
          baseStyle.width = 'auto'; // Let aspect ratio drive width
      } else {
          // Custom Width Mode: Prioritize width, let height be determined by container
          baseStyle.width = `calc(${state.canvasWidth / 100} * (100vw - (6 * var(--spacing-x))))`;
          baseStyle.height = '85vh';
      }
      
      return baseStyle;
  };

  return (
    <main 
        className={`relative w-screen h-screen flex flex-col overflow-hidden transition-colors duration-300 ${state.isTransparentEmbed ? '' : 'bg-[var(--secondary-bg)]'}`}
        style={{ backgroundColor: state.isTransparentEmbed ? 'transparent' : undefined }}
    >
      
      {/* Top Toolbar Area */}
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
                    if (isSecondary) {
                         setState(s => ({ ...s, activeSecondaryColorSlot: index }));
                    } else {
                         // If linking is on, update both
                         setState(s => ({ 
                             ...s, 
                             activeColorSlot: index,
                             activeSecondaryColorSlot: s.isColorSynced ? index : s.activeSecondaryColorSlot
                         }));
                    }
                }}
                onPaletteChange={handlePaletteChange}
                onRandomizePalette={handleRandomizePalette}
                onBlendModeChange={(mode, isFill) => {
                    if (isFill) setState(s => ({ ...s, activeFillBlendMode: mode }));
                    else setState(s => ({ ...s, activeBlendMode: mode }));
                }}
                onToggleFill={(enabled) => setState(s => ({ ...s, isFillEnabled: enabled }))}
                onToggleColorSync={(enabled) => {
                    // If enabling sync, immediately sync fill to current stroke color
                    if (enabled) {
                        setState(s => ({ 
                            ...s, 
                            isColorSynced: true,
                            activeSecondaryColorSlot: s.activeColorSlot
                        }));
                    } else {
                        setState(s => ({ ...s, isColorSynced: false }));
                    }
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

      {/* Main Content - Centered Layout with Strict Spacing */}
      <div className={`flex-1 w-full flex flex-col items-center justify-center pb-8 scroll-layer-area ${state.isEmbedMode ? 'p-0 pb-0' : ''}`}>
        
        <div 
            className={`relative transition-all duration-300 ease-in-out ${state.isEmbedMode ? 'w-full h-full' : ''}`}
            style={getContainerStyle()}
        >
            {/* Canvas */}
            <div className={`w-full h-full rounded-3xl overflow-hidden ${state.isEmbedMode ? '!rounded-none' : 'border border-[var(--border-color)]'}`}>
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
                    useGyroscope={state.useGyroscope}
                    isLowPowerMode={state.isLowPowerMode}
                    isOnionSkinEnabled={state.isOnionSkinEnabled}
                    blurStrength={state.blurStrength}
                    focusRange={state.focusRange}
                    onStrokesChange={handleStrokesChange}
                    strokes={currentStrokes}
                    exportConfig={state.exportConfig}
                    onExportComplete={() => setState(s => ({ ...s, exportConfig: { ...s.exportConfig, isRecording: false } }))}
                    onStopPreview={() => setState(s => ({ ...s, exportConfig: { ...s.exportConfig, isActive: false, isRecording: false } }))}
                    onColorPick={handleColorPick}
                />
            </div>
            
            {/* Layer Slider (Absolute Positioned to strict 'x' spacing) */}
            {!state.isEmbedMode && (
                <div 
                    className="absolute top-0 bottom-0 hidden md:block"
                    style={{ 
                        left: '100%', 
                        marginLeft: 'var(--spacing-x)', 
                        width: 'var(--spacing-x)' 
                    }}
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
                aspectRatio={state.aspectRatio}
                uiTheme={state.uiTheme}
                isGridEnabled={state.isGridEnabled}
                isSnappingEnabled={state.isSnappingEnabled}
                gridSize={state.gridSize}
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
                onUIThemeChange={(theme) => setState(s => ({ ...s, uiTheme: theme }))}
                onGridEnabledChange={(val) => setState(s => ({ ...s, isGridEnabled: val }))}
                onSnappingEnabledChange={(val) => setState(s => ({ ...s, isSnappingEnabled: val }))}
                onGridSizeChange={(val) => setState(s => ({ ...s, gridSize: val }))}
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
