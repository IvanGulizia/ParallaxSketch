
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { ToolType, EraserMode } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  isPlaying: boolean;
  activeColorSlot: number;
  activeSecondaryColorSlot: number;
  activeBlendMode: 'normal' | 'multiply';
  activeFillBlendMode: 'normal' | 'multiply';
  isFillEnabled: boolean;
  palette: string[];
  brushSize: number;
  eraserMode: EraserMode;
  canUndo: boolean;
  canRedo: boolean;
  isEmbedMode: boolean;
  onTogglePlay: () => void;
  onToolChange: (tool: ToolType) => void;
  onColorSlotChange: (index: number, isSecondary?: boolean) => void;
  onPaletteChange: (index: number, newColor: string) => void;
  onRandomizePalette: () => void;
  onBlendModeChange: (mode: 'normal' | 'multiply', isFill?: boolean) => void;
  onToggleFill: (enabled: boolean) => void;
  onSizeChange: (size: number) => void;
  onEraserModeChange: (mode: EraserMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onMenuToggle: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  isPlaying,
  activeColorSlot,
  activeSecondaryColorSlot,
  activeBlendMode,
  activeFillBlendMode,
  isFillEnabled,
  palette,
  brushSize,
  eraserMode,
  canUndo,
  canRedo,
  isEmbedMode,
  onTogglePlay,
  onToolChange,
  onColorSlotChange,
  onPaletteChange,
  onRandomizePalette,
  onBlendModeChange,
  onToggleFill,
  onSizeChange,
  onEraserModeChange,
  onUndo,
  onRedo,
  onMenuToggle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showEraserPicker, setShowEraserPicker] = useState(false);
  
  const [isEditingFill, setIsEditingFill] = useState(false);

  // Close all popups when playing
  useEffect(() => {
    if (isPlaying) {
        setShowColorPicker(false);
        setShowSizePicker(false);
        setShowEraserPicker(false);
    }
  }, [isPlaying]);

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setShowColorPicker(false);
            setShowSizePicker(false);
            setShowEraserPicker(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If embed mode, we might hide the entire toolbar or just parts
  if (isEmbedMode) return null;

  const btnClass = (isActive: boolean) => `
    w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
    transition-all duration-300 ease-in-out flex-shrink-0 shadow-sm
    ${isActive 
      ? 'bg-[var(--active-color)] text-white scale-110 shadow-md' 
      : 'bg-[var(--tool-bg)] text-[var(--text-color)] hover:bg-[var(--accent-color)]'}
  `;

  const popupClass = "absolute top-full mt-4 left-1/2 -translate-x-1/2 backdrop-blur-md bg-white/80 flex gap-3 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200 items-center justify-center ring-1 ring-white/50";

  return (
    <div ref={containerRef} className="flex items-center justify-center gap-2 md:gap-3 pointer-events-auto relative">
        
        {/* Play/Pause */}
        <button 
          className={btnClass(isPlaying)}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Icons.Pause size={20} /> : <Icons.Play size={20} />}
        </button>

        {/* Separator */}
        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Color Picker (Controls both Stroke and Fill) */}
        <div className="relative">
            <button 
            className={btnClass(showColorPicker)}
            style={{ 
                color: (activeTool === ToolType.BRUSH) ? palette[activeColorSlot] : undefined 
            }}
            onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowSizePicker(false);
                setShowEraserPicker(false);
                // Default to Stroke tab unless we want to remember state
                setIsEditingFill(false);
            }}
            >
            <Icons.Droplet size={20} />
            </button>
            
            {showColorPicker && (
                <div className={`${popupClass} rounded-3xl p-4 flex-col gap-3 w-72`}>
                    
                    {/* Tabs: Stroke | Fill */}
                    <div className="flex bg-gray-100/50 rounded-full p-1 w-full mb-1">
                        <button 
                            onClick={() => setIsEditingFill(false)}
                            className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${!isEditingFill ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Stroke
                        </button>
                        <button 
                            onClick={() => setIsEditingFill(true)}
                            className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${isEditingFill ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Fill {isFillEnabled ? '(On)' : '(Off)'}
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="w-full flex flex-col gap-3">
                        
                        {/* If Fill Tab: Enable/Disable Toggle */}
                        {isEditingFill && (
                             <div className="flex items-center justify-between w-full px-2">
                                <span className="text-xs font-medium text-gray-600">Enable Fill</span>
                                <button 
                                    onClick={() => onToggleFill(!isFillEnabled)}
                                    className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 ${isFillEnabled ? 'bg-[var(--active-color)]' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isFillEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        )}

                        {/* Color Palette (Only show if Stroke, or if Fill is Enabled) */}
                        {(!isEditingFill || isFillEnabled) && (
                            <>
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {palette.map((color, index) => {
                                        const isActive = isEditingFill 
                                            ? activeSecondaryColorSlot === index 
                                            : activeColorSlot === index;
                                        
                                        return (
                                            <div key={index} className="relative group">
                                                <button
                                                    onClick={() => {
                                                        onColorSlotChange(index, isEditingFill);
                                                        if (activeTool !== ToolType.BRUSH) {
                                                            onToolChange(ToolType.BRUSH);
                                                        }
                                                    }}
                                                    className={`w-8 h-8 rounded-full border-2 transition-transform ${isActive ? 'border-[var(--text-color)] scale-110' : 'border-transparent hover:scale-110'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                                {isActive && (
                                                    <div className="absolute -bottom-2 -right-1 w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-200 overflow-hidden hover:scale-125 transition-transform cursor-pointer">
                                                        <input 
                                                            type="color" 
                                                            value={color}
                                                            onChange={(e) => onPaletteChange(index, e.target.value)}
                                                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                        />
                                                        <div className="w-2 h-2 rounded-full bg-gray-400 pointer-events-none" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Tools Row: Shuffle & Blend Mode */}
                                <div className="flex items-center justify-between w-full pt-2 border-t border-gray-100">
                                     <button 
                                        onClick={onRandomizePalette}
                                        className="text-xs text-gray-500 hover:text-[var(--active-color)] flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        <Icons.Shuffle size={12} /> Randomize
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600 font-medium">Multiply</span>
                                        <button 
                                            onClick={() => {
                                                const current = isEditingFill ? activeFillBlendMode : activeBlendMode;
                                                onBlendModeChange(current === 'normal' ? 'multiply' : 'normal', isEditingFill);
                                            }}
                                            className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${
                                                (isEditingFill ? activeFillBlendMode : activeBlendMode) === 'multiply' 
                                                ? 'bg-[var(--active-color)]' 
                                                : 'bg-gray-300'
                                            }`}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${
                                                (isEditingFill ? activeFillBlendMode : activeBlendMode) === 'multiply' 
                                                ? 'translate-x-4' 
                                                : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                        
                        {isEditingFill && !isFillEnabled && (
                            <div className="text-center py-2 text-xs text-gray-400 italic">
                                Fill is disabled.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Brush Tool */}
        <div className="relative">
            <button 
            className={btnClass(activeTool === ToolType.BRUSH)}
            onClick={() => {
                if (activeTool === ToolType.BRUSH) {
                    setShowSizePicker(!showSizePicker);
                    setShowColorPicker(false);
                    setShowEraserPicker(false);
                } else {
                    onToolChange(ToolType.BRUSH);
                    setShowSizePicker(false); 
                    setShowColorPicker(false);
                    setShowEraserPicker(false);
                }
            }}
            >
                <div className="relative">
                    <Icons.Brush size={20} />
                    {isFillEnabled && activeTool === ToolType.BRUSH && (
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[var(--accent-color)] rounded-full border border-white" />
                    )}
                </div>
            </button>
             {showSizePicker && activeTool === ToolType.BRUSH && (
                <div className={`${popupClass} rounded-full p-4 flex-row items-end gap-4`}>
                    {[5, 15, 30].map((size, i) => (
                        <button
                            key={size}
                            onClick={() => {
                                onSizeChange(size);
                                setShowSizePicker(false);
                            }}
                            className={`rounded-full bg-[var(--text-color)] transition-all hover:opacity-80 ${brushSize === size ? 'ring-2 ring-offset-2 ring-[var(--active-color)]' : ''}`}
                            style={{ width: 16 + (i * 12), height: 16 + (i * 12) }}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Eraser */}
        <div className="relative">
            <button 
            className={btnClass(activeTool === ToolType.ERASER)}
            onClick={() => {
                if (activeTool === ToolType.ERASER) {
                    setShowEraserPicker(!showEraserPicker);
                    setShowSizePicker(false);
                    setShowColorPicker(false);
                } else {
                    onToolChange(ToolType.ERASER);
                    setShowEraserPicker(false);
                    setShowSizePicker(false);
                    setShowColorPicker(false);
                }
            }}
            >
            <Icons.Eraser size={20} />
            </button>

             {showEraserPicker && activeTool === ToolType.ERASER && (
                <div className={`${popupClass} rounded-full p-3 px-5 flex-row gap-4`}>
                    <div className="flex items-center gap-3">
                        {[10, 30, 50].map(size => (
                            <button
                                key={size}
                                onClick={() => {
                                    onEraserModeChange(EraserMode.STANDARD);
                                    onSizeChange(size);
                                    setShowEraserPicker(false);
                                }}
                                className={`rounded-full border border-gray-300 transition-all ${eraserMode === EraserMode.STANDARD && brushSize === size ? 'bg-[var(--active-color)] border-transparent' : 'bg-transparent hover:bg-gray-100'}`}
                                style={{ width: size/2 + 6, height: size/2 + 6 }}
                            />
                        ))}
                    </div>
                    <div className="w-px h-6 bg-gray-200" />
                    <button
                        onClick={() => {
                            onEraserModeChange(EraserMode.STROKE);
                            setShowEraserPicker(false);
                        }}
                        className={`p-2 rounded-full transition-all ${eraserMode === EraserMode.STROKE ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-gray-50'}`}
                        title="Erase Whole Stroke"
                    >
                        <Icons.Trash size={18} />
                    </button>
                </div>
            )}
        </div>

        {/* Select */}
        <button 
          className={btnClass(activeTool === ToolType.SELECT)}
          onClick={() => {
              onToolChange(ToolType.SELECT);
              setShowColorPicker(false);
              setShowSizePicker(false);
              setShowEraserPicker(false);
          }}
        >
          <Icons.Select size={20} />
        </button>

        {/* Separator */}
        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Menu */}
        <button 
          className={`${btnClass(false)}`}
          onClick={onMenuToggle}
        >
          <Icons.Menu size={20} />
        </button>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 ml-1 bg-[var(--tool-bg)] p-1 rounded-full shadow-sm border border-gray-100">
             <button 
                className={`${btnClass(false)} !w-8 !h-8 md:!w-9 md:!h-9 shadow-none disabled:opacity-30`}
                onClick={onUndo}
                disabled={!canUndo}
            >
                <Icons.Undo size={16} />
            </button>
            <button 
                className={`${btnClass(false)} !w-8 !h-8 md:!w-9 md:!h-9 shadow-none disabled:opacity-30`}
                onClick={onRedo}
                disabled={!canRedo}
            >
                <Icons.Redo size={16} />
            </button>
        </div>

    </div>
  );
};
