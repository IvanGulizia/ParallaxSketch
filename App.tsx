
import React, { useState, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { LayerSlider } from './components/LayerSlider';
import { DrawingCanvas } from './components/DrawingCanvas';
import { MenuOverlay } from './components/MenuOverlay';
import { ToolType, AppState, Stroke, EraserMode } from './types';

// Harmonious Pastel Palettes
const PRESET_PALETTES = [
    ['#E0BBE4', '#957DAD', '#D291BC', '#FEC8D8', '#FFDFD3'], // Pastel Sunset
    ['#F4F1DE', '#E07A5F', '#3D405B', '#81B29A', '#F2CC8F'], // Terra
    ['#CCD5AE', '#E9EDC9', '#FEFAE0', '#FAEDCD', '#D4A373'], // Nature
    ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'], // Vivid
    ['#4A4A4A', '#8C8C80', '#D8D4C5', '#EFEDE6', '#FDFCF8']  // Monochrome
];

export default function App() {
  const [state, setState] = useState<AppState>({
    activeTool: ToolType.BRUSH,
    activeLayer: 2, 
    brushSize: 10,
    activeColorSlot: 0,
    activeSecondaryColorSlot: 1,
    activeBlendMode: 'normal',
    activeFillBlendMode: 'normal',
    isFillEnabled: false, 
    palette: PRESET_PALETTES[0], 
    parallaxStrength: 50,
    springConfig: { stiffness: 0.05, damping: 0.92 },
    focalLayerIndex: 2, 
    isPlaying: false,
    eraserMode: EraserMode.STROKE, 
    isMenuOpen: false,
    canvasBackgroundColor: '#FFFFFF',
    isEmbedMode: false
  });

  // Initialize based on URL params (Embed Mode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'embed') {
        setState(s => ({
            ...s,
            isEmbedMode: true,
            isPlaying: true, // Auto play
            parallaxStrength: parseInt(params.get('strength') || '50'),
            springConfig: {
                stiffness: parseFloat(params.get('stiffness') || '0.05'),
                damping: parseFloat(params.get('damping') || '0.92')
            },
            canvasBackgroundColor: params.get('bg') ? '#' + params.get('bg') : '#FFFFFF'
        }));
    }
  }, []);

  const [history, setHistory] = useState<Stroke[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const currentStrokes = history[historyIndex];

  const handleStrokesChange = useCallback((newStrokes: Stroke[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newStrokes);
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
      if (confirm("Are you sure you want to clear the canvas?")) {
          setHistory([[]]);
          setHistoryIndex(0);
          setState(s => ({ ...s, isMenuOpen: false }));
      }
  };

  const handlePaletteChange = (index: number, newColor: string) => {
    const newPalette = [...state.palette];
    newPalette[index] = newColor;
    setState(s => ({ ...s, palette: newPalette }));
  };

  const handleRandomizePalette = () => {
      const randomPalette = PRESET_PALETTES[Math.floor(Math.random() * PRESET_PALETTES.length)];
      setState(s => ({ ...s, palette: randomPalette }));
  };

  // Import / Export Logic
  const handleExport = () => {
    const data = JSON.stringify({ 
        version: 4,
        palette: state.palette,
        strokes: currentStrokes,
        config: {
            parallaxStrength: state.parallaxStrength,
            focalLayerIndex: state.focalLayerIndex,
            springConfig: state.springConfig,
            backgroundColor: state.canvasBackgroundColor
        }
    });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zen-sketch.json';
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target?.result as string);
            if (data.strokes && data.palette) {
                setHistory([data.strokes]);
                setHistoryIndex(0);
                setState(s => ({ 
                    ...s, 
                    palette: data.palette, 
                    isMenuOpen: false,
                    parallaxStrength: data.config?.parallaxStrength ?? 50,
                    focalLayerIndex: data.config?.focalLayerIndex ?? 2,
                    springConfig: data.config?.springConfig ?? { stiffness: 0.05, damping: 0.92 },
                    canvasBackgroundColor: data.config?.backgroundColor ?? '#FFFFFF'
                }));
            }
        } catch (err) {
            console.error("Invalid file");
        }
    };
    reader.readAsText(file);
  };

  return (
    <main className="relative w-screen h-screen bg-[var(--secondary-bg)] flex flex-col overflow-hidden">
      
      {/* Top Toolbar Area - Hidden in Embed Mode */}
      {!state.isEmbedMode && (
        <div className="w-full h-20 flex items-end justify-center pb-2 shrink-0 z-50">
            <Toolbar 
                activeTool={state.activeTool}
                isPlaying={state.isPlaying}
                activeColorSlot={state.activeColorSlot}
                activeSecondaryColorSlot={state.activeSecondaryColorSlot}
                activeBlendMode={state.activeBlendMode}
                activeFillBlendMode={state.activeFillBlendMode}
                isFillEnabled={state.isFillEnabled}
                palette={state.palette}
                brushSize={state.brushSize}
                eraserMode={state.eraserMode}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                isEmbedMode={state.isEmbedMode}
                onTogglePlay={() => setState(s => ({ ...s, isPlaying: !s.isPlaying }))}
                onToolChange={(tool) => setState(s => ({ ...s, activeTool: tool }))}
                onColorSlotChange={(index, isSecondary) => {
                    if (isSecondary) setState(s => ({ ...s, activeSecondaryColorSlot: index }));
                    else setState(s => ({ ...s, activeColorSlot: index }));
                }}
                onPaletteChange={handlePaletteChange}
                onRandomizePalette={handleRandomizePalette}
                onBlendModeChange={(mode, isFill) => {
                    if (isFill) setState(s => ({ ...s, activeFillBlendMode: mode }));
                    else setState(s => ({ ...s, activeBlendMode: mode }));
                }}
                onToggleFill={(enabled) => setState(s => ({ ...s, isFillEnabled: enabled }))}
                onSizeChange={(size) => setState(s => ({ ...s, brushSize: size }))}
                onEraserModeChange={(mode) => setState(s => ({ ...s, eraserMode: mode }))}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onMenuToggle={() => setState(s => ({ ...s, isMenuOpen: !s.isMenuOpen }))}
            />
        </div>
      )}

      {/* Main Content Row: Canvas + Layers */}
      <div className={`flex-1 w-full flex flex-row px-4 pb-6 gap-4 ${state.isEmbedMode ? '!p-0' : ''}`}>
        
        {/* Canvas Container */}
        <div className={`flex-1 relative h-full rounded-3xl shadow-sm overflow-hidden ${state.isEmbedMode ? '!rounded-none !shadow-none' : 'border border-gray-200'}`}>
            <DrawingCanvas 
                activeTool={state.activeTool}
                activeLayer={state.activeLayer}
                brushSize={state.brushSize}
                activeColorSlot={state.activeColorSlot}
                activeSecondaryColorSlot={state.activeSecondaryColorSlot}
                activeBlendMode={state.activeBlendMode}
                activeFillBlendMode={state.activeFillBlendMode}
                isFillEnabled={state.isFillEnabled}
                palette={state.palette}
                parallaxStrength={state.parallaxStrength}
                springConfig={state.springConfig}
                focalLayerIndex={state.focalLayerIndex}
                isPlaying={state.isPlaying}
                eraserMode={state.eraserMode}
                backgroundColor={state.canvasBackgroundColor}
                onStrokesChange={handleStrokesChange}
                strokes={currentStrokes}
            />
            
            <MenuOverlay 
                isOpen={state.isMenuOpen} 
                parallaxStrength={state.parallaxStrength}
                focalLayerIndex={state.focalLayerIndex}
                springConfig={state.springConfig}
                backgroundColor={state.canvasBackgroundColor}
                onClose={() => setState(s => ({ ...s, isMenuOpen: false }))}
                onImport={handleImport}
                onExport={handleExport}
                onReset={handleReset}
                onParallaxStrengthChange={(val) => setState(s => ({ ...s, parallaxStrength: val }))}
                onFocalLayerChange={(idx) => setState(s => ({ ...s, focalLayerIndex: idx }))}
                onSpringConfigChange={(config) => setState(s => ({ ...s, springConfig: config }))}
                onBackgroundColorChange={(c) => setState(s => ({ ...s, canvasBackgroundColor: c }))}
            />
        </div>

        {/* Layer Slider - Hidden in Embed Mode */}
        {!state.isEmbedMode && (
            <div className="w-12 md:w-16 h-full flex-shrink-0 flex items-center justify-center">
                <LayerSlider 
                    activeLayer={state.activeLayer}
                    onChange={(layer) => setState(s => ({ ...s, activeLayer: layer }))}
                />
            </div>
        )}

      </div>
    </main>
  );
}
