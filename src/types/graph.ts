export type EquationType =
  | 'explicit'
  | 'parametric'
  | 'polar'
  | 'implicit'
  | 'slider'
  | 'point'
  | 'complex_vector'
  | 'fractal'
  | 'system';

export type InequalityType = 'none' | '<' | '<=' | '>' | '>=';

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  width: number;
  height: number;
}

export interface GraphExpression {
  id: string;
  rawText: string;
  color: string;
  visible: boolean;
  type: EquationType;
  // For parametric equations
  xParametric?: string;
  yParametric?: string;
  tMin?: number;
  tMax?: number;
  tStep?: number;
  // For polar equations
  thetaMin?: number;
  thetaMax?: number;
  // For sliders / variables
  variableName?: string;
  sliderValue?: number;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  isPlaying?: boolean;
  playSpeed?: number; // multiplier
  playDirection?: 1 | -1;
  // For points
  pointX?: number;
  pointY?: number;
  pointLabel?: string;
  // Complex Vector Fields
  vectorU?: string;
  vectorV?: string;
  isPolya?: boolean;
  vectorDensity?: number;
  // Fractals (Mandelbrot, Julia, Newton)
  fractalType?: 'mandelbrot' | 'julia' | 'newton';
  juliaCr?: number;
  juliaCi?: number;
  maxIterations?: number;
  // Calculus overlay toggles
  showDerivative?: boolean;
  showSecondDerivative?: boolean;
  showTangent?: boolean;
  tangentX?: number;
  showIntegral?: boolean;
  integralA?: number;
  integralB?: number;
  riemannMode?: 'none' | 'left' | 'right' | 'mid' | 'trapezoid';
  riemannPartitions?: number;
  // Cached compiled function or error
  error?: string | null;
}

export interface DetectedPoint {
  type: 'root' | 'minimum' | 'maximum' | 'inflection' | 'intersection';
  x: number;
  y: number;
  label: string;
  expressionId: string;
}

export type GridMode = 'cartesian' | 'polar' | 'trig' | 'complex' | 'complex_vector' | 'raymarch_3d';

export type ThemeId = 'parchment' | 'slate' | 'cartographer' | 'engraving';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  bgCanvas: string;
  bgSidebar: string;
  bgCard: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gridMajor: string;
  gridMinor: string;
  gridAxis: string;
  axisText: string;
  accent: string;
  curvePalette: string[];
}
