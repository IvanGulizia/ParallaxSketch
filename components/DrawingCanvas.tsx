





import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolType, Point, Stroke, EraserMode, SpringConfig, BlendMode } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface DrawingCanvasProps {
  activeTool: ToolType;
  activeLayer: number;
  brushSize: number;
  activeColorSlot: number;
  activeSecondaryColorSlot: number;
  activeBlendMode: BlendMode;
  activeFillBlendMode: BlendMode;
  isFillEnabled: boolean;
  isStrokeEnabled: boolean;
  palette: string[];
  parallaxStrength: number;
  parallaxInverted: boolean;
  springConfig: SpringConfig;
  focalLayerIndex: number;
  isPlaying: boolean;
  eraserMode: EraserMode;
  backgroundColor: string;
  globalLayerBlendMode: BlendMode;
  layerBlendModes: Record<number, BlendMode>;
  isGridEnabled: boolean;
  isSnappingEnabled: boolean;
  gridSize: number;
  useGyroscope: boolean;
  isLowPowerMode: boolean;
  isOnionSkinEnabled: boolean; // New prop
  onStrokesChange: (strokes: Stroke[]) => void;
  strokes: Stroke[];
}

// Overscan amount in pixels (added to all sides) to prevent hard edges during parallax
const OVERSCAN_MARGIN = 150;

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  activeTool,
  activeLayer,
  brushSize,
  activeColorSlot,
  activeSecondaryColorSlot,
  activeBlendMode,
  activeFillBlendMode,
  isFillEnabled,
  isStrokeEnabled,
  palette,
  parallaxStrength,
  parallaxInverted,
  springConfig,
  focalLayerIndex,
  isPlaying,
  eraserMode,
  backgroundColor,
  globalLayerBlendMode,
  layerBlendModes,
  isGridEnabled,
  isSnappingEnabled,
  gridSize,
  useGyroscope,
  isLowPowerMode,
  isOnionSkinEnabled,
  onStrokesChange,
  strokes
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Offscreen canvases (sized: width + 2*margin, height + 2*margin)
  const offscreenCanvases = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null, null]);
  
  // Physics State
  const targetOffset = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const requestRef = useRef<number>(0);
  
  // Interaction
  const isDrawing = useRef(false);
  const currentStrokePoints = useRef<Point[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const isDraggingSelection = useRef(false);
  const dragStartPos = useRef<Point>({ x: 0, y: 0 });

  // Version counter to trigger CanvasLayer updates without a loop in Low Power Mode
  const [renderVersion, setRenderVersion] = useState(0);

  // Init Offscreens
  useEffect(() => {
    offscreenCanvases.current = offscreenCanvases.current.map((_, i) => {
        return offscreenCanvases.current[i] || document.createElement('canvas');
    });
  }, []);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            setDimensions({ width, height });
        }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Helpers
  const normalizePoint = (x: number, y: number, width: number, height: number): Point => ({
      x: x / width,
      y: y / height
  });

  const denormalizePoint = (p: Point, width: number, height: number): Point => ({
      x: (p.x * width) + OVERSCAN_MARGIN,
      y: (p.y * height) + OVERSCAN_MARGIN
  });

  // --- Rendering ---
  const renderLayer = useCallback((layerIndex: number) => {
    const canvas = offscreenCanvases.current[layerIndex];
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;
    
    const fullWidth = dimensions.width + (OVERSCAN_MARGIN * 2);
    const fullHeight = dimensions.height + (OVERSCAN_MARGIN * 2);

    if (canvas.width !== fullWidth || canvas.height !== fullHeight) {
        canvas.width = fullWidth;
        canvas.height = fullHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const layerStrokes = strokes.filter(s => s.layerId === layerIndex);

    layerStrokes.forEach(stroke => {
        if (stroke.points.length < 2) return;

        const start = denormalizePoint(stroke.points[0], dimensions.width, dimensions.height);
        
        // 1. Fill Pass
        if (stroke.fillColorSlot !== undefined && stroke.fillColorSlot !== -1) {
             ctx.beginPath();
             ctx.moveTo(start.x, start.y);
             for (let i = 1; i < stroke.points.length; i++) {
                const p = denormalizePoint(stroke.points[i], dimensions.width, dimensions.height);
                ctx.lineTo(p.x, p.y);
             }
             ctx.closePath(); 
             ctx.fillStyle = palette[stroke.fillColorSlot] || 'transparent';
             
             // Map custom blend modes to canvas composite operations
             let compositeOp: GlobalCompositeOperation = 'source-over';
             if (stroke.fillBlendMode === 'multiply') compositeOp = 'multiply';
             else if (stroke.fillBlendMode === 'overlay') compositeOp = 'overlay';
             else if (stroke.fillBlendMode === 'difference') compositeOp = 'difference';

             ctx.globalCompositeOperation = compositeOp;
             ctx.fill();
        }

        // 2. Stroke Pass (Only if enabled or if it's eraser)
        if (stroke.isStrokeEnabled !== false || stroke.tool === ToolType.ERASER) {
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            for (let i = 1; i < stroke.points.length; i++) {
                const p = denormalizePoint(stroke.points[i], dimensions.width, dimensions.height);
                ctx.lineTo(p.x, p.y);
            }

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = stroke.size;
            
            if (stroke.tool === ToolType.ERASER) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.stroke();
            } else {
                let compositeOp: GlobalCompositeOperation = 'source-over';
                if (stroke.blendMode === 'multiply') compositeOp = 'multiply';
                else if (stroke.blendMode === 'overlay') compositeOp = 'overlay';
                else if (stroke.blendMode === 'difference') compositeOp = 'difference';

                ctx.globalCompositeOperation = compositeOp;
                ctx.strokeStyle = palette[stroke.colorSlot] || '#000000';
                
                if (stroke.id === selectedStrokeId) {
                    ctx.shadowColor = '#000000';
                    ctx.shadowBlur = 10;
                } else {
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                }
                ctx.stroke();
            }
        }
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
    });
    
    // In low power mode, we need to notify CanvasLayer that a render happened
    if (isLowPowerMode) {
        setRenderVersion(v => v + 1);
    }
  }, [strokes, selectedStrokeId, dimensions, palette, isLowPowerMode]);

  useEffect(() => {
    [0, 1, 2, 3, 4].forEach(renderLayer);
  }, [strokes, renderLayer, selectedStrokeId, dimensions, palette]);

  // Apply Transform Helper
  const applyParallaxTransforms = (offsetX: number, offsetY: number) => {
    const maxPx = (parallaxStrength / 100) * OVERSCAN_MARGIN;
    const direction = parallaxInverted ? -1 : 1;
    
    const layers = containerRef.current?.querySelectorAll('.layer-canvas');
    layers?.forEach((layer, i) => {
        const relativeDepth = (i - focalLayerIndex) * 0.5;
        const x = -offsetX * maxPx * relativeDepth * direction;
        const y = -offsetY * maxPx * relativeDepth * direction;
        (layer as HTMLElement).style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    });
  };

  // --- Physics Loop (Spring System) ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // If using gyroscope and playing, ignore mouse for parallax
      if (isPlaying && useGyroscope) return; 

      if (!containerRef.current) return;
      const { width, height, left, top } = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 2 - 1;
      const y = ((e.clientY - top) / height) * 2 - 1;
      
      if (isLowPowerMode) {
          // Direct application, no springs
          currentOffset.current = { x, y };
          applyParallaxTransforms(x, y);
      } else {
          targetOffset.current = { x, y };
      }
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
        if (!isPlaying || !useGyroscope) return;
        
        let x = (e.gamma || 0) / 45; 
        let y = (e.beta || 0) / 45;
        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));
        
        if (isLowPowerMode) {
            currentOffset.current = { x, y };
            applyParallaxTransforms(x, y);
        } else {
            targetOffset.current = { x, y };
        }
    }

    if (isPlaying) {
      window.addEventListener('mousemove', handleMouseMove);
      if (useGyroscope) {
          window.addEventListener('deviceorientation', handleOrientation);
      }
    } else {
        // Reset or recenter if needed, or just stop
        if (!isLowPowerMode) targetOffset.current = { x: 0, y: 0 };
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, [isPlaying, useGyroscope, isLowPowerMode, parallaxStrength, focalLayerIndex, parallaxInverted]);

  const animationLoop = () => {
    // Spring Physics: F = -kx - cv
    const stiffness = springConfig.stiffness; 
    const damping = springConfig.damping;

    const forceX = (targetOffset.current.x - currentOffset.current.x) * stiffness;
    const forceY = (targetOffset.current.y - currentOffset.current.y) * stiffness;

    velocity.current.x = (velocity.current.x + forceX) * damping;
    velocity.current.y = (velocity.current.y + forceY) * damping;

    currentOffset.current.x += velocity.current.x;
    currentOffset.current.y += velocity.current.y;

    applyParallaxTransforms(currentOffset.current.x, currentOffset.current.y);
    
    if (!isLowPowerMode) {
        requestRef.current = requestAnimationFrame(animationLoop);
    }
  };

  useEffect(() => {
    if (!isLowPowerMode) {
        requestRef.current = requestAnimationFrame(animationLoop);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [parallaxStrength, focalLayerIndex, springConfig, parallaxInverted, isLowPowerMode]); 


  // --- Interaction ---
  const getNormalizedLocalPoint = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    // Parallax Correction
    const maxPx = (parallaxStrength / 100) * OVERSCAN_MARGIN;
    const relativeDepth = (activeLayer - focalLayerIndex) * 0.5;
    const direction = parallaxInverted ? -1 : 1;
    const offsetX = -currentOffset.current.x * maxPx * relativeDepth * direction;
    const offsetY = -currentOffset.current.y * maxPx * relativeDepth * direction;

    let x = (clientX - rect.left) - offsetX;
    let y = (clientY - rect.top) - offsetY;
    
    // Snapping Logic
    if (isGridEnabled && isSnappingEnabled) {
        const snap = (val: number) => Math.round(val / gridSize) * gridSize;
        x = snap(x);
        y = snap(y);
    }

    return normalizePoint(x, y, rect.width, rect.height);
  };

  const hitTest = (pt: Point) => {
      const pxPt = denormalizePoint(pt, dimensions.width, dimensions.height);
      const layerStrokes = strokes.filter(s => s.layerId === activeLayer).reverse();
      
      for (const stroke of layerStrokes) {
          for (let i = 0; i < stroke.points.length - 1; i++) {
               const p1 = denormalizePoint(stroke.points[i], dimensions.width, dimensions.height);
               const p2 = denormalizePoint(stroke.points[i+1], dimensions.width, dimensions.height);
               
               const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
               let t = ((pxPt.x - p1.x) * (p2.x - p1.x) + (pxPt.y - p1.y) * (p2.y - p1.y)) / (l2 || 1);
               t = Math.max(0, Math.min(1, t));
               const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y, 2) };
               const d = Math.sqrt(Math.pow(pxPt.x - proj.x, 2) + Math.pow(pxPt.y - proj.y, 2));

               if (d < stroke.size + 5) return stroke.id;
          }
      }
      return null;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getNormalizedLocalPoint(e);

    if (activeTool === ToolType.SELECT) {
        const id = hitTest(pt);
        setSelectedStrokeId(id);
        if (id) {
            isDraggingSelection.current = true;
            dragStartPos.current = pt;
        }
        return;
    }

    if (activeTool === ToolType.ERASER && eraserMode === EraserMode.STROKE) {
        const id = hitTest(pt);
        if (id) {
            onStrokesChange(strokes.filter(s => s.id !== id));
        }
        return;
    }

    isDrawing.current = true;
    currentStrokePoints.current = [pt];
    setSelectedStrokeId(null);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getNormalizedLocalPoint(e);

    if (activeTool === ToolType.SELECT && isDraggingSelection.current && selectedStrokeId) {
        const dx = pt.x - dragStartPos.current.x;
        const dy = pt.y - dragStartPos.current.y;
        
        const newStrokes = strokes.map(s => {
            if (s.id === selectedStrokeId) {
                return { ...s, points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
            }
            return s;
        });
        dragStartPos.current = pt;
        onStrokesChange(newStrokes);
        return;
    }

    if (!isDrawing.current) return;
    
    // Only add point if it's different enough (helps with snapping duplication)
    const lastPt = currentStrokePoints.current[currentStrokePoints.current.length - 1];
    if (lastPt.x === pt.x && lastPt.y === pt.y) return;

    currentStrokePoints.current.push(pt);
    
    // Live render on active canvas (Primitive preview)
    const ctx = offscreenCanvases.current[activeLayer]?.getContext('2d');
    if (ctx && (isStrokeEnabled || activeTool === ToolType.ERASER)) {
        ctx.beginPath();
        const prev = denormalizePoint(currentStrokePoints.current[currentStrokePoints.current.length - 2], dimensions.width, dimensions.height);
        const curr = denormalizePoint(pt, dimensions.width, dimensions.height);
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;
        
        if (activeTool === ToolType.ERASER) {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            let compositeOp: GlobalCompositeOperation = 'source-over';
            if (activeBlendMode === 'multiply') compositeOp = 'multiply';
            else if (activeBlendMode === 'overlay') compositeOp = 'overlay';
            else if (activeBlendMode === 'difference') compositeOp = 'difference';
            
            ctx.globalCompositeOperation = compositeOp;
            ctx.strokeStyle = palette[activeColorSlot];
        }
        ctx.stroke();

        // In Low Power Mode, we need to manually trigger the display canvas update during drawing
        // because we disabled the infinite loop.
        if (isLowPowerMode) {
             setRenderVersion(v => v + 1);
        }
    }
  };

  const handlePointerUp = () => {
    isDraggingSelection.current = false;
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentStrokePoints.current.length > 0) {
        const newStroke: Stroke = {
            id: uuidv4(),
            points: [...currentStrokePoints.current],
            colorSlot: activeColorSlot,
            fillColorSlot: isFillEnabled ? activeSecondaryColorSlot : undefined,
            size: brushSize,
            tool: activeTool,
            layerId: activeLayer,
            isEraser: activeTool === ToolType.ERASER,
            blendMode: activeBlendMode,
            fillBlendMode: activeFillBlendMode,
            isStrokeEnabled: activeTool === ToolType.ERASER ? true : isStrokeEnabled
        };
        onStrokesChange([...strokes, newStroke]);
    }
    currentStrokePoints.current = [];
  };

  // Grid Style
  const gridStyle: React.CSSProperties = isGridEnabled ? {
    backgroundImage: `
        linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize}px ${gridSize}px`
  } : {};

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full rounded-3xl overflow-hidden cursor-crosshair touch-none isolate transition-colors duration-500"
      style={{ backgroundColor }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      {/* Grid Overlay - Rendered behind layers but on top of background color */}
      {isGridEnabled && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-50 z-0" 
            style={gridStyle} 
          />
      )}

      {[0, 1, 2, 3, 4].map((index) => (
        <CanvasLayer 
            key={index} 
            index={index} 
            activeLayerIndex={activeLayer}
            source={offscreenCanvases.current[index]} 
            isActive={activeLayer === index}
            isPlaying={isPlaying}
            globalBlendMode={globalLayerBlendMode}
            layerBlendMode={layerBlendModes[index]}
            isLowPowerMode={isLowPowerMode}
            renderVersion={renderVersion}
            isOnionSkinEnabled={isOnionSkinEnabled}
        />
      ))}
    </div>
  );
};

const CanvasLayer: React.FC<{ 
    index: number, 
    activeLayerIndex: number,
    source: HTMLCanvasElement | null, 
    isActive: boolean, 
    isPlaying: boolean,
    globalBlendMode: BlendMode,
    layerBlendMode: BlendMode,
    isLowPowerMode: boolean,
    renderVersion: number,
    isOnionSkinEnabled: boolean
}> = ({ index, activeLayerIndex, source, isActive, isPlaying, globalBlendMode, layerBlendMode, isLowPowerMode, renderVersion, isOnionSkinEnabled }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    
    // The render function itself
    const draw = () => {
        if (!ref.current || !source) return;
        if (ref.current.width !== source.width) ref.current.width = source.width;
        if (ref.current.height !== source.height) ref.current.height = source.height;

        const ctx = ref.current.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, ref.current.width, ref.current.height);
            ctx.drawImage(source, 0, 0);
        }
    };

    // Low Power Mode: Only draw when renderVersion changes
    useEffect(() => {
        if (isLowPowerMode) {
            draw();
        }
    }, [isLowPowerMode, renderVersion, source]);

    // High Performance Mode: Infinite Loop for maximum smoothness
    useEffect(() => {
        if (isLowPowerMode) return; 

        const render = () => {
            draw();
            requestAnimationFrame(render);
        };
        const req = requestAnimationFrame(render);
        return () => cancelAnimationFrame(req);
    }, [source, isLowPowerMode]);

    let mixBlend = 'normal';
    const modeToUse = layerBlendMode !== 'normal' ? layerBlendMode : globalBlendMode;

    if (modeToUse === 'multiply') mixBlend = 'multiply';
    else if (modeToUse === 'overlay') mixBlend = 'overlay';
    else if (modeToUse === 'difference') mixBlend = 'difference';

    // Opacity Logic
    let opacity = 0.3; // Default inactive
    
    if (isPlaying) {
        opacity = 1; // Always visible during playback
    } else if (isActive) {
        opacity = 1; // Active layer always fully visible
    } else if (isOnionSkinEnabled) {
        // Calculate opacity based on distance from active layer
        const dist = Math.abs(index - activeLayerIndex);
        // Map distance: 1 -> 0.7, 2 -> 0.4, 3 -> 0.2, 4 -> 0.1
        opacity = Math.max(0.1, 1 - (dist * 0.25)); 
    } else {
        opacity = 0.3; // Flat dim if onion skin is disabled
    }

    return (
        <canvas
            ref={ref}
            style={{ 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                mixBlendMode: mixBlend as any,
                opacity: opacity
            }}
            className={`layer-canvas absolute w-auto h-auto pointer-events-none transition-opacity duration-300 ease-in-out`}
        />
    );
};
