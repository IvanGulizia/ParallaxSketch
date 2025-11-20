
export enum ToolType {
  BRUSH = 'BRUSH',
  ERASER = 'ERASER',
  SELECT = 'SELECT',
}

export enum EraserMode {
  STANDARD = 'STANDARD',
  STROKE = 'STROKE' // Erase whole stroke
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  colorSlot: number; // Reference to the palette index (0-4)
  fillColorSlot?: number; // If undefined, no fill
  size: number;
  tool: ToolType; 
  layerId: number;
  isEraser?: boolean;
  blendMode?: 'normal' | 'multiply';
  fillBlendMode?: 'normal' | 'multiply';
}

export interface SpringConfig {
  stiffness: number; // 0.01 to 0.5
  damping: number;   // 0.5 to 0.99
}

export interface AppState {
  activeTool: ToolType;
  activeLayer: number; // 0 to 4
  brushSize: number;
  activeColorSlot: number; // 0 to 4
  activeSecondaryColorSlot: number; // 0 to 4 (Fill color)
  activeBlendMode: 'normal' | 'multiply';
  activeFillBlendMode: 'normal' | 'multiply';
  isFillEnabled: boolean;
  palette: string[]; // Array of 5 hex codes
  parallaxStrength: number;
  springConfig: SpringConfig;
  focalLayerIndex: number; // The layer that stays still (0-4)
  isPlaying: boolean;
  eraserMode: EraserMode;
  isMenuOpen: boolean;
  canvasBackgroundColor: string;
  isEmbedMode: boolean;
}
