
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolType, Point, Stroke, EraserMode, SpringConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface DrawingCanvasProps {
  activeTool: ToolType;
  activeLayer: number;
  brushSize: number;
  activeColorSlot: number;
  activeSecondaryColorSlot: number;
  activeBlendMode: 'normal' | 'multiply';
  activeFillBlendMode: 'normal' | 'multiply';
  isFillEnabled: boolean;
  palette: string[];
  parallaxStrength: number;
  springConfig: SpringConfig;
  focalLayerIndex: number;
  isPlaying: boolean;
  eraserMode: EraserMode;
  backgroundColor: string;
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
  palette,
  parallaxStrength,
  springConfig,
  focalLayerIndex,
  isPlaying,
  eraserMode,
  backgroundColor,
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
  // We normalize against the VIEWABLE area.
  const normalizePoint = (x: number, y: number, width: number, height: number): Point => ({
      x: x / width,
      y: y / height
  });

  // When denormalizing to draw on the offscreen canvas, we add the OVERSCAN_MARGIN offset
  // so (0,0) in normalized coords lands at (Margin, Margin) on the canvas.
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

        ctx.beginPath();
        const start = denormalizePoint(stroke.points[0], dimensions.width, dimensions.height);
        ctx.moveTo(start.x, start.y);

        for (let i = 1; i < stroke.points.length; i++) {
            const p = denormalizePoint(stroke.points[i], dimensions.width, dimensions.height);
            ctx.lineTo(p.x, p.y);
        }

        // 1. Fill Pass
        if (stroke.fillColorSlot !== undefined && stroke.fillColorSlot !== -1) {
             ctx.closePath(); 
             ctx.fillStyle = palette[stroke.fillColorSlot] || 'transparent';
             ctx.globalCompositeOperation = stroke.fillBlendMode === 'multiply' ? 'multiply' : 'source-over';
             ctx.fill();
             
             ctx.beginPath();
             ctx.moveTo(start.x, start.y);
             for (let i = 1; i < stroke.points.length; i++) {
                const p = denormalizePoint(stroke.points[i], dimensions.width, dimensions.height);
                ctx.lineTo(p.x, p.y);
             }
        }

        // 2. Stroke Pass
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.size;
        
        if (stroke.tool === ToolType.ERASER) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.stroke();
        } else {
            ctx.globalCompositeOperation = stroke.blendMode === 'multiply' ? 'multiply' : 'source-over';
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
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
    });
  }, [strokes, selectedStrokeId, dimensions, palette]);

  useEffect(() => {
    [0, 1, 2, 3, 4].forEach(renderLayer);
  }, [strokes, renderLayer, selectedStrokeId, dimensions, palette]);


  // --- Physics Loop (Spring System) ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { width, height, left, top } = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 2 - 1;
      const y = ((e.clientY - top) / height) * 2 - 1;
      targetOffset.current = { x, y };
    };

    if (isPlaying) {
      window.addEventListener('mousemove', handleMouseMove);
    } else {
        targetOffset.current = { x: 0, y: 0 };
    }
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPlaying]);

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

    const maxPx = (parallaxStrength / 100) * OVERSCAN_MARGIN;
    const layers = containerRef.current?.querySelectorAll('.layer-canvas');
    
    layers?.forEach((layer, i) => {
        const relativeDepth = (i - focalLayerIndex) * 0.5;
        const x = -currentOffset.current.x * maxPx * relativeDepth;
        const y = -currentOffset.current.y * maxPx * relativeDepth;
        (layer as HTMLElement).style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    });

    requestRef.current = requestAnimationFrame(animationLoop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animationLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [parallaxStrength, focalLayerIndex, springConfig]); 


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
    const offsetX = -currentOffset.current.x * maxPx * relativeDepth;
    const offsetY = -currentOffset.current.y * maxPx * relativeDepth;

    const x = (clientX - rect.left) - offsetX;
    const y = (clientY - rect.top) - offsetY;

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
    currentStrokePoints.current.push(pt);
    
    // Live render on active canvas (Primitive preview)
    const ctx = offscreenCanvases.current[activeLayer]?.getContext('2d');
    if (ctx) {
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
            ctx.globalCompositeOperation = activeBlendMode === 'multiply' ? 'multiply' : 'source-over';
            ctx.strokeStyle = palette[activeColorSlot];
        }
        ctx.stroke();
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
            fillBlendMode: activeFillBlendMode
        };
        onStrokesChange([...strokes, newStroke]);
    }
    currentStrokePoints.current = [];
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full rounded-3xl overflow-hidden cursor-crosshair touch-none isolate shadow-inner"
      style={{ backgroundColor }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <CanvasLayer 
            key={index} 
            index={index} 
            source={offscreenCanvases.current[index]} 
            isActive={activeLayer === index}
            isPlaying={isPlaying}
            overscan={OVERSCAN_MARGIN}
        />
      ))}
    </div>
  );
};

const CanvasLayer: React.FC<{ 
    index: number, 
    source: HTMLCanvasElement | null, 
    isActive: boolean, 
    isPlaying: boolean,
    overscan: number
}> = ({ source, isActive, isPlaying }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const render = () => {
            if (!ref.current || !source) return;
            if (ref.current.width !== source.width) ref.current.width = source.width;
            if (ref.current.height !== source.height) ref.current.height = source.height;

            const ctx = ref.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, ref.current.width, ref.current.height);
                ctx.drawImage(source, 0, 0);
            }
            requestAnimationFrame(render);
        };
        const req = requestAnimationFrame(render);
        return () => cancelAnimationFrame(req);
    }, [source]);

    return (
        <canvas
            ref={ref}
            style={{ 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)' 
            }}
            className={`layer-canvas absolute w-auto h-auto pointer-events-none transition-opacity duration-500 ease-in-out ${isPlaying || isActive ? 'opacity-100' : 'opacity-30'}`}
        />
    );
};
