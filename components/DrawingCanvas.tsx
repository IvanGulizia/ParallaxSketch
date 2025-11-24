import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { ToolType, Point, Stroke, EraserMode, SpringConfig, BlendMode, ExportConfig, TrajectoryType } from '../types';
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
  isOnionSkinEnabled: boolean;
  blurStrength: number;
  focusRange: number; 
  exportConfig?: ExportConfig;
  onStrokesChange: (strokes: Stroke[]) => void;
  onExportComplete?: () => void;
  onStopPreview?: () => void;
  onColorPick?: (colorSlot: number) => void;
  onEmbedContextMenu?: () => void;
  strokes: Stroke[];
  isEmbedMode?: boolean;
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
  blurStrength,
  focusRange,
  exportConfig,
  onStrokesChange,
  onExportComplete,
  onStopPreview,
  onColorPick,
  onEmbedContextMenu,
  strokes,
  isEmbedMode
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
  const isDraggingView = useRef(false); // For embed mode Look around
  const currentStrokePoints = useRef<Point[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const isDraggingSelection = useRef(false);
  const dragStartPos = useRef<Point>({ x: 0, y: 0 });

  // Version counter to trigger CanvasLayer updates
  const [renderVersion, setRenderVersion] = useState(0);

  // Recording Ref
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordingCanvas = useRef<HTMLCanvasElement | null>(null);
  const recordingStartTime = useRef<number>(0);

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
                
                // If active color slot is -1, it means "Default White" for embed mode or similar overrides
                if (stroke.colorSlot === -1) {
                    ctx.strokeStyle = '#FFFFFF';
                } else {
                    ctx.strokeStyle = palette[stroke.colorSlot] || '#000000';
                }
                
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
    
    // Notify render
    setRenderVersion(v => v + 1);
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

  // Force initial layout to avoid jump
  useLayoutEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
        applyParallaxTransforms(currentOffset.current.x, currentOffset.current.y);
    }
  }, [dimensions, focalLayerIndex, parallaxStrength, parallaxInverted]);

  // --- Recorder Setup ---
  useEffect(() => {
      if (exportConfig?.isRecording && !recorderRef.current) {
          // Setup recording canvas
          if (!recordingCanvas.current) {
              recordingCanvas.current = document.createElement('canvas');
          }
          recordingCanvas.current.width = dimensions.width;
          recordingCanvas.current.height = dimensions.height;
          
          const stream = recordingCanvas.current.captureStream(60); // 60 FPS
          
          let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 5000000 };
          
          // Fallback logic for MP4 or Safari
          if (exportConfig.format === 'mp4') {
             // Try native MP4 if supported (Safari 14.1+)
             if (MediaRecorder.isTypeSupported('video/mp4')) {
                options = { mimeType: 'video/mp4', videoBitsPerSecond: 5000000 };
             } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                 // Chrome H264
                 options = { mimeType: 'video/webm;codecs=h264', videoBitsPerSecond: 5000000 };
             }
          } else {
              // WebM preference
              if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                  options = { mimeType: 'video/webm', videoBitsPerSecond: 5000000 };
              }
          }
          
          try {
            recorderRef.current = new MediaRecorder(stream, options);
          } catch (e) {
            console.warn("Preferred mimeType failed, falling back", e);
             recorderRef.current = new MediaRecorder(stream);
          }

          recordedChunks.current = [];
          recorderRef.current.ondataavailable = (e) => {
              if (e.data.size > 0) recordedChunks.current.push(e.data);
          };
          
          recorderRef.current.onstop = () => {
             const type = recorderRef.current?.mimeType || 'video/webm';
             const blob = new Blob(recordedChunks.current, { type });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             
             // FORCE extension based on user selection
             let ext = 'webm';
             if (exportConfig.format === 'mp4') {
                 ext = 'mp4'; 
             }
             
             a.download = `zen-parallax-${Date.now()}.${ext}`;
             a.click();
             onExportComplete?.();
          };

          recorderRef.current.start();
          recordingStartTime.current = Date.now();
      } else if (!exportConfig?.isRecording && recorderRef.current) {
          if (recorderRef.current.state !== 'inactive') {
              recorderRef.current.stop();
          }
          recorderRef.current = null;
      }
  }, [exportConfig?.isRecording, exportConfig?.format, dimensions, onExportComplete]);

  // --- Physics Loop (Spring System & Auto Animation) ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // If using gyroscope, auto-export, or playing, ignore mouse for parallax
      // UNLESS we are in embed mode and manually dragging view, handled separately
      if ((isPlaying && useGyroscope) || exportConfig?.isActive) return; 

      if (!containerRef.current) return;
      const { width, height, left, top } = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 2 - 1;
      const y = ((e.clientY - top) / height) * 2 - 1;
      
      // Update target, always. Smoothing happens in the loop.
      if (!isDraggingView.current) {
         targetOffset.current = { x, y };
      }
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
        if (!isPlaying || !useGyroscope || exportConfig?.isActive) return;
        
        let angle = 0;
        if (window.screen?.orientation?.angle !== undefined) {
             angle = window.screen.orientation.angle;
        } else if (typeof window.orientation !== 'undefined') {
             angle = window.orientation as number;
        }

        const gamma = (e.gamma || 0); 
        const beta = (e.beta || 0);

        let x = 0;
        let y = 0;

        if (angle === 0) {
            x = gamma; y = beta;
        } else if (angle === 90) {
            x = beta; y = gamma; 
        } else if (angle === -90 || angle === 270) {
            x = -beta; y = -gamma;
        } else if (angle === 180) {
            x = -gamma; y = -beta;
        }

        x = x / 30; 
        y = y / 30;
        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));
        
        targetOffset.current = { x, y };
    }

    if (isPlaying || exportConfig?.isActive) {
      window.addEventListener('mousemove', handleMouseMove);
      if (useGyroscope) {
          window.addEventListener('deviceorientation', handleOrientation);
      }
    } else {
        // Reset to center if not interacting
        if (!isLowPowerMode && !isDraggingView.current) targetOffset.current = { x: 0, y: 0 };
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, [isPlaying, useGyroscope, isLowPowerMode, parallaxStrength, focalLayerIndex, parallaxInverted, exportConfig]);

  const animationLoop = () => {
    let nextX = currentOffset.current.x;
    let nextY = currentOffset.current.y;

    // --- 1. Calculate Target Position ---
    if (exportConfig?.isActive) {
        // Auto Animation Math
        const now = Date.now();
        const durationMs = exportConfig.duration * 1000;
        const elapsed = (now % durationMs) / durationMs; // 0 to 1
        const t = elapsed * Math.PI * 2; // 0 to 2PI

        let autoX = 0;
        let autoY = 0;

        switch (exportConfig.trajectory) {
            case TrajectoryType.CIRCLE:
                autoX = Math.cos(t);
                autoY = Math.sin(t);
                break;
            case TrajectoryType.FIGURE8:
                const scale = 2 / (3 - Math.cos(2 * t));
                autoX = scale * Math.cos(t);
                autoY = scale * Math.sin(2 * t) / 2;
                break;
            case TrajectoryType.SWAY_H:
                autoX = Math.sin(t);
                autoY = 0;
                break;
            case TrajectoryType.SWAY_V:
                autoX = 0;
                autoY = Math.sin(t);
                break;
        }
        
        nextX = autoX;
        nextY = autoY;
        
        targetOffset.current = { x: nextX, y: nextY };
        currentOffset.current = { x: nextX, y: nextY };
        velocity.current = { x: 0, y: 0 };

        if (exportConfig.isRecording && recordingStartTime.current > 0) {
            if (Date.now() - recordingStartTime.current >= durationMs) {
                 if (recorderRef.current && recorderRef.current.state === 'recording') {
                    recorderRef.current.stop();
                    recorderRef.current = null;
                 }
            }
        }

    } else {
        if (!isLowPowerMode) {
            // Full Spring Physics
            const stiffness = springConfig.stiffness; 
            const damping = springConfig.damping;

            const forceX = (targetOffset.current.x - currentOffset.current.x) * stiffness;
            const forceY = (targetOffset.current.y - currentOffset.current.y) * stiffness;

            velocity.current.x = (velocity.current.x + forceX) * damping;
            velocity.current.y = (velocity.current.y + forceY) * damping;

            nextX += velocity.current.x;
            nextY += velocity.current.y;
        } else {
            // "Slight Damping" via simple Lerp for Eco Mode
            // This answers the user request for slight smoothing without full physics
            const lerpFactor = 0.15;
            nextX += (targetOffset.current.x - nextX) * lerpFactor;
            nextY += (targetOffset.current.y - nextY) * lerpFactor;
        }
        
        currentOffset.current.x = nextX;
        currentOffset.current.y = nextY;
    }

    // --- 2. Apply Visual Transforms (CSS) ---
    applyParallaxTransforms(nextX, nextY);
    
    // --- 3. Render Composite Frame for Recorder (If Recording) ---
    if (exportConfig?.isRecording && recordingCanvas.current && recorderRef.current?.state === 'recording') {
        const ctx = recordingCanvas.current.getContext('2d');
        if (ctx) {
            // Draw Background
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);

            // Draw Layers with calculated offset
            const maxPx = (parallaxStrength / 100) * OVERSCAN_MARGIN;
            const direction = parallaxInverted ? -1 : 1;

            [0, 1, 2, 3, 4].forEach(index => {
                const source = offscreenCanvases.current[index];
                if (!source) return;

                const relativeDepth = (index - focalLayerIndex) * 0.5;
                const offX = -nextX * maxPx * relativeDepth * direction;
                const offY = -nextY * maxPx * relativeDepth * direction;

                // Center logic
                const drawX = (dimensions.width - source.width) / 2 + offX;
                const drawY = (dimensions.height - source.height) / 2 + offY;

                const dist = Math.abs(index - focalLayerIndex);
                const effectiveBlur = Math.max(0, dist - focusRange) * blurStrength;

                ctx.save();
                if (effectiveBlur > 0) {
                    ctx.filter = `blur(${effectiveBlur}px)`;
                }

                let mixBlend = 'normal';
                const modeToUse = layerBlendModes[index] !== 'normal' ? layerBlendModes[index] : globalLayerBlendMode;
                if (modeToUse === 'multiply') mixBlend = 'multiply';
                else if (modeToUse === 'overlay') mixBlend = 'overlay';
                else if (modeToUse === 'difference') mixBlend = 'difference';
                
                ctx.globalCompositeOperation = mixBlend as GlobalCompositeOperation;
                ctx.drawImage(source, drawX, drawY);
                
                ctx.restore(); 
            });
        }
    }

    // Always run loop now to support the "Slight Damping" lerp in Eco Mode
    requestRef.current = requestAnimationFrame(animationLoop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animationLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [parallaxStrength, focalLayerIndex, springConfig, parallaxInverted, isLowPowerMode, exportConfig, blurStrength, focusRange]); 


  // --- Interaction ---
  const getNormalizedLocalPoint = (e: React.MouseEvent | React.TouchEvent, overrideLayerId?: number) => {
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
    const layerToUse = overrideLayerId ?? activeLayer;
    const maxPx = (parallaxStrength / 100) * OVERSCAN_MARGIN;
    const relativeDepth = (layerToUse - focalLayerIndex) * 0.5;
    const direction = parallaxInverted ? -1 : 1;
    const offsetX = -currentOffset.current.x * maxPx * relativeDepth * direction;
    const offsetY = -currentOffset.current.y * maxPx * relativeDepth * direction;

    let x = (clientX - rect.left) - offsetX;
    let y = (clientY - rect.top) - offsetY;
    
    // Snapping Logic (only if not overriding layer for global hit test)
    if (overrideLayerId === undefined && isGridEnabled && isSnappingEnabled) {
        const snap = (val: number) => Math.round(val / gridSize) * gridSize;
        x = snap(x);
        y = snap(y);
    }

    return normalizePoint(x, y, rect.width, rect.height);
  };

  const hitTest = (pt: Point, layerId: number) => {
      const pxPt = denormalizePoint(pt, dimensions.width, dimensions.height);
      const layerStrokes = strokes.filter(s => s.layerId === layerId).reverse();
      
      for (const stroke of layerStrokes) {
          for (let i = 0; i < stroke.points.length - 1; i++) {
               const p1 = denormalizePoint(stroke.points[i], dimensions.width, dimensions.height);
               const p2 = denormalizePoint(stroke.points[i+1], dimensions.width, dimensions.height);
               
               const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
               let t = ((pxPt.x - p1.x) * (p2.x - p1.x) + (pxPt.y - p1.y) * (p2.y - p1.y)) / (l2 || 1);
               t = Math.max(0, Math.min(1, t));
               const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y, 2) };
               const d = Math.sqrt(Math.pow(pxPt.x - proj.x, 2) + Math.pow(pxPt.y - proj.y, 2));

               if (d < stroke.size + 5) return stroke;
          }
      }
      return null;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();

      if (exportConfig?.isActive) return;

      // Always perform global color pick on right click, regardless of mode
      for (const layerId of [4, 3, 2, 1, 0]) {
          const pt = getNormalizedLocalPoint(e, layerId);
          const hitStroke = hitTest(pt, layerId);
          if (hitStroke && onColorPick) {
              onColorPick(hitStroke.colorSlot);
              return;
          }
      }
      // If we didn't pick a color and in embed mode, show custom menu
      if (isEmbedMode && onEmbedContextMenu) {
          onEmbedContextMenu();
      }
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    // If previewing/exporting, a click stops the preview
    if (exportConfig?.isActive) {
        onStopPreview?.();
        return; 
    }
    
    // In Embed Mode, disable drawing and enable "View Dragging"
    if (isEmbedMode) {
        isDraggingView.current = true;
        return;
    }

    const pt = getNormalizedLocalPoint(e);

    if (activeTool === ToolType.SELECT) {
        const hit = hitTest(pt, activeLayer);
        setSelectedStrokeId(hit ? hit.id : null);
        if (hit) {
            isDraggingSelection.current = true;
            dragStartPos.current = pt;
        }
        return;
    }

    if (activeTool === ToolType.ERASER && eraserMode === EraserMode.STROKE) {
        const hit = hitTest(pt, activeLayer);
        if (hit) {
            onStrokesChange(strokes.filter(s => s.id !== hit.id));
        }
        return;
    }

    isDrawing.current = true;
    currentStrokePoints.current = [pt];
    setSelectedStrokeId(null);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    // Mobile/Embed Parallax Simulation logic
    if (isEmbedMode && containerRef.current) {
         let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        const { width, height, left, top } = containerRef.current.getBoundingClientRect();
        
        // If we are dragging (or just moving if desktop embed), update view
        // On mobile, we require drag (isDraggingView) to avoid conflict with potential other gestures, 
        // though strictly 'pointermove' implies drag if using Pointer Events, here we use Touch/Mouse.
        // The simplified logic requested: "Remove drawing with click" -> 1 finger drag looks around.
        
        if (isDraggingView.current || !('touches' in e)) { 
            const x = ((clientX - left) / width) * 2 - 1;
            const y = ((clientY - top) / height) * 2 - 1;
            targetOffset.current = { x, y };
        }
        
        // If it's a touch move, don't do drawing logic below
        if ('touches' in e) return;
    }

    if (exportConfig?.isActive) return;

    // Stop if we are just looking around
    if (isEmbedMode) return;

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
    // Real-time update for smoothness
    const currentStroke: Stroke = {
      id: 'current',
      points: currentStrokePoints.current,
      colorSlot: activeColorSlot,
      fillColorSlot: isFillEnabled ? activeSecondaryColorSlot : undefined,
      size: brushSize,
      tool: activeTool,
      layerId: activeLayer,
      isEraser: activeTool === ToolType.ERASER,
      blendMode: activeBlendMode,
      fillBlendMode: activeFillBlendMode,
      isStrokeEnabled: isStrokeEnabled
    };
    onStrokesChange([...strokes.filter(s => s.id !== 'current'), currentStroke]);
  };

  const handlePointerUp = () => {
    if (isDraggingView.current) {
        isDraggingView.current = false;
        return;
    }

    if (exportConfig?.isActive || isEmbedMode) return;

    if (activeTool === ToolType.SELECT) {
        isDraggingSelection.current = false;
        return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    // Finalize stroke
    const finalStroke: Stroke = {
      id: uuidv4(),
      points: currentStrokePoints.current,
      colorSlot: activeColorSlot,
      fillColorSlot: isFillEnabled ? activeSecondaryColorSlot : undefined,
      size: brushSize,
      tool: activeTool,
      layerId: activeLayer,
      isEraser: activeTool === ToolType.ERASER,
      blendMode: activeBlendMode,
      fillBlendMode: activeFillBlendMode,
      isStrokeEnabled: isStrokeEnabled
    };
    
    onStrokesChange([...strokes.filter(s => s.id !== 'current'), finalStroke]);
    currentStrokePoints.current = [];
  };

  return (
    <div 
        ref={containerRef}
        className="relative w-full h-full cursor-crosshair overflow-hidden"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onContextMenu={handleContextMenu}
        style={{
             touchAction: 'none',
             backgroundColor: backgroundColor 
        }}
    >
       {/* 5 Layers of Offscreen Rendered Canvas, manipulated by CSS Transforms */}
       {[0, 1, 2, 3, 4].map(layerIndex => {
           // Calculate Blur
           const dist = Math.abs(layerIndex - focalLayerIndex);
           const effectiveBlur = Math.max(0, dist - focusRange) * blurStrength;
           
           // Check if onion skin should be active (not during play/export)
           const showOnion = isOnionSkinEnabled && !isPlaying && !exportConfig?.isActive;

           return (
            <div
                key={layerIndex}
                className="layer-canvas absolute left-1/2 top-1/2 w-full h-full pointer-events-none will-change-transform"
                style={{ 
                    zIndex: layerIndex,
                    // Onion skin opacity OR 1 if disabled
                    opacity: showOnion ? (layerIndex === activeLayer ? 1 : 0.6) : 1,
                    // Apply blur here
                    filter: `blur(${effectiveBlur}px) ${showOnion && layerIndex !== activeLayer ? 'grayscale(30%)' : ''}`,
                    transition: 'opacity 0.2s, filter 0.2s',
                    mixBlendMode: layerBlendModes[layerIndex] !== 'normal' 
                        ? layerBlendModes[layerIndex] 
                        : globalLayerBlendMode
                }}
            >
                <canvas 
                    ref={el => offscreenCanvases.current[layerIndex] = el}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                />
            </div>
           );
       })}
    </div>
  );
};