import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Viewport, GraphExpression, GridMode, ThemeConfig, DetectedPoint } from '../types/graph';
import { ParsedEquationInfo, EvalScope } from '../math/evaluator';
import { computeImplicitContour, renderContourSegments, renderImplicitShading } from '../math/marchingSquares';
import {
  numericalDerivative,
  numericalSecondDerivative,
  computeRiemannSum,
  findRootsInInterval,
  findExtremaInInterval,
  findIntersections,
} from '../math/calculus';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  Target,
  Camera,
  Check,
  Sparkles,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sliders,
} from 'lucide-react';
import {
  computeComplexVectorGrid,
  phaseToColor,
  renderMandelbrotToContext,
  renderJuliaToContext,
  renderNewtonToContext,
  formatComplex,
} from '../math/complex';
import { CurvePreset, CLASSIC_PRESETS } from '../math/presets';
import { RaymarchingCanvas } from './RaymarchingCanvas';

interface GraphCanvasProps {
  viewport: Viewport;
  onViewportChange: (newVp: Viewport) => void;
  expressions: GraphExpression[];
  parsedEquations: Map<string, ParsedEquationInfo>;
  scope: EvalScope;
  theme: ThemeConfig;
  gridMode: GridMode;
  showMinorGrid: boolean;
  angleUnit: 'rad' | 'deg';
  activeExpressionId: string | null;
  onSelectExpression: (id: string) => void;
  onSelectGridMode?: (mode: GridMode) => void;
  onLoadPreset?: (preset: CurvePreset) => void;
  onOpenPresets?: () => void;
  onPlot2DSlice?: (sliceFormula: string, manifoldName: string, sliceZ: number) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  viewport,
  onViewportChange,
  expressions,
  parsedEquations,
  scope,
  theme,
  gridMode,
  showMinorGrid,
  angleUnit,
  activeExpressionId,
  onSelectExpression,
  onSelectGridMode,
  onLoadPreset,
  onOpenPresets,
  onPlot2DSlice,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Plane selector & Unique graphs menu state
  const [isPlaneMenuOpen, setIsPlaneMenuOpen] = useState(false);
  const [isUniqueGraphsMenuOpen, setIsUniqueGraphsMenuOpen] = useState(false);
  const [isRaymarchSlicerOpen, setIsRaymarchSlicerOpen] = useState(false);

  // Interaction states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const [tracedPoint, setTracedPoint] = useState<{
    x: number;
    y: number;
    sx: number;
    sy: number;
    slope?: number;
    label?: string;
    color: string;
  } | null>(null);

  const [pinnedPoints, setPinnedPoints] = useState<
    { x: number; y: number; label: string; color: string }[]
  >([]);

  // Multi-touch tracking for Android pinch-to-zoom and gestures
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchViewportRef = useRef<Viewport | null>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('.plane-menu-container')) {
        setIsPlaneMenuOpen(false);
      }
      if (target && !target.closest('.unique-graphs-menu-container')) {
        setIsUniqueGraphsMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleDocumentClick);
    return () => document.removeEventListener('pointerdown', handleDocumentClick);
  }, []);

  // Coordinate transforms
  const worldToScreen = useCallback(
    (x: number, y: number, vp: Viewport) => {
      const sx = ((x - vp.xMin) / (vp.xMax - vp.xMin)) * vp.width;
      const sy = ((vp.yMax - y) / (vp.yMax - vp.yMin)) * vp.height;
      return { x: sx, y: sy };
    },
    []
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number, vp: Viewport) => {
      const x = vp.xMin + (sx / vp.width) * (vp.xMax - vp.xMin);
      const y = vp.yMax - (sy / vp.height) * (vp.yMax - vp.yMin);
      return { x, y };
    },
    []
  );

  // Resize observer to keep viewport dimensions synced with DOM container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(100, Math.floor(rect.width));
      const h = Math.max(100, Math.floor(rect.height));

      if (w !== viewport.width || h !== viewport.height) {
        // Maintain center and scale according to new aspect ratio
        const currentCenterX = (viewport.xMin + viewport.xMax) / 2;
        const currentCenterY = (viewport.yMin + viewport.yMax) / 2;
        const currentSpanX = viewport.xMax - viewport.xMin;
        const currentSpanY = viewport.yMax - viewport.yMin;

        // If initial height was 0 or invalid, compute standard aspect
        const newSpanY = viewport.height > 0 ? (currentSpanX * h) / w : currentSpanY;

        onViewportChange({
          ...viewport,
          width: w,
          height: h,
          xMin: currentCenterX - currentSpanX / 2,
          xMax: currentCenterX + currentSpanX / 2,
          yMin: currentCenterY - newSpanY / 2,
          yMax: currentCenterY + newSpanY / 2,
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [viewport.width, viewport.height, onViewportChange]);

  // Main canvas rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewport.width <= 0 || viewport.height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Draw Canvas Background
    ctx.fillStyle = theme.bgCanvas;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // 1b. Render Fractals (Mandelbrot, Julia, Newton) if any visible fractal expression exists
    expressions.forEach((expr) => {
      if (!expr.visible) return;
      const parsed = parsedEquations.get(expr.id);
      if (!parsed || parsed.type !== 'fractal') return;

      const maxIter = expr.maxIterations || (isDragging ? 35 : 75);
      const downsample = isDragging ? 3 : 1;

      if (parsed.fractalType === 'mandelbrot') {
        renderMandelbrotToContext(ctx, viewport, theme, maxIter, downsample);
      } else if (parsed.fractalType === 'julia') {
        const cr = scope['cr'] ?? expr.juliaCr ?? -0.123;
        const ci = scope['ci'] ?? expr.juliaCi ?? 0.745;
        renderJuliaToContext(ctx, viewport, theme, cr, ci, maxIter, downsample);
      } else if (parsed.fractalType === 'newton') {
        renderNewtonToContext(ctx, viewport, theme, 35, downsample);
      }
    });

    // 2. Draw Coordinates Grid (Cartesian, Polar, Complex Argand)
    if (gridMode === 'polar') {
      drawPolarGrid(ctx, viewport, theme);
    } else if (gridMode === 'complex' || gridMode === 'complex_vector') {
      drawComplexGrid(ctx, viewport, theme, showMinorGrid);
    } else {
      drawCartesianGrid(ctx, viewport, theme, gridMode === 'trig', showMinorGrid);
    }

    // 2b. Render Complex Vector Field if in vector mode or any vector expression exists
    const hasVectorField =
      gridMode === 'complex_vector' ||
      expressions.some((e) => e.visible && parsedEquations.get(e.id)?.type === 'complex_vector');
    if (hasVectorField) {
      drawComplexVectorField(ctx, viewport, theme, expressions, parsedEquations, scope, isDragging);
    }

    // 3. Render Shaded Regions & Inequalities first (underneath curve lines)
    expressions.forEach((expr) => {
      if (!expr.visible) return;
      const parsed = parsedEquations.get(expr.id);
      if (!parsed) return;

      if (parsed.type === 'explicit' && parsed.evalY && parsed.inequality !== 'none') {
        drawExplicitInequality(ctx, parsed.evalY, parsed.inequality, viewport, scope, expr.color);
      } else if (parsed.type === 'implicit' && parsed.evalImplicit && parsed.inequality !== 'none') {
        const rgba = hexToRgba(expr.color, 0.22);
        renderImplicitShading(ctx, parsed.evalImplicit, parsed.inequality, viewport, scope, rgba, isDragging ? 5 : 2.5);
      }
    });

    // 4. Render Calculus Riemann sums & Definite integrals
    expressions.forEach((expr) => {
      if (!expr.visible) return;
      const parsed = parsedEquations.get(expr.id);
      if (!parsed || parsed.type !== 'explicit' || !parsed.evalY) return;

      const fn = (x: number) => parsed.evalY!(x, 0, 0, 0, scope);

      if (expr.showIntegral && expr.integralA !== undefined && expr.integralB !== undefined) {
        drawDefiniteIntegralArea(ctx, fn, expr.integralA, expr.integralB, viewport, expr.color);
      }

      if (expr.riemannMode && expr.riemannMode !== 'none' && expr.integralA !== undefined && expr.integralB !== undefined) {
        const partitions = expr.riemannPartitions || 12;
        drawRiemannRectangles(ctx, fn, expr.integralA, expr.integralB, partitions, expr.riemannMode, viewport, expr.color);
      }
    });

    // 5. Render Curve Traces
    expressions.forEach((expr) => {
      if (!expr.visible) return;
      const parsed = parsedEquations.get(expr.id);
      if (!parsed) return;

      const isCurrentActive = expr.id === activeExpressionId;
      const lineWidth = isCurrentActive ? 3.0 : 2.2;

      if (parsed.type === 'explicit') {
        // Render all Y branches (e.g. y = ±x or y = ±sqrt(x))
        if (parsed.branchesY && parsed.branchesY.length > 0) {
          parsed.branchesY.forEach((branchFn) => {
            const fn = (x: number) => branchFn(x, 0, 0, 0, scope);
            drawExplicitCurveY(ctx, fn, viewport, expr.color, lineWidth);

            if (expr.showDerivative) {
              const d1 = (x: number) => numericalDerivative(fn, x);
              drawDerivativeCurve(ctx, d1, viewport, expr.color, true);
            }
            if (expr.showSecondDerivative) {
              const d2 = (x: number) => numericalSecondDerivative(fn, x);
              drawDerivativeCurve(ctx, d2, viewport, expr.color, false);
            }
            if (expr.showTangent && expr.tangentX !== undefined) {
              drawTangentLine(ctx, fn, expr.tangentX, viewport, expr.color, theme);
            }
          });
        } else if (parsed.evalY) {
          const fn = (x: number) => parsed.evalY!(x, 0, 0, 0, scope);
          drawExplicitCurveY(ctx, fn, viewport, expr.color, lineWidth);

          // Render derivatives if enabled
          if (expr.showDerivative) {
            const d1 = (x: number) => numericalDerivative(fn, x);
            drawDerivativeCurve(ctx, d1, viewport, expr.color, true);
          }
          if (expr.showSecondDerivative) {
            const d2 = (x: number) => numericalSecondDerivative(fn, x);
            drawDerivativeCurve(ctx, d2, viewport, expr.color, false);
          }

          // Render interactive Tangent line
          if (expr.showTangent && expr.tangentX !== undefined) {
            drawTangentLine(ctx, fn, expr.tangentX, viewport, expr.color, theme);
          }
        }

        // Render all X branches (e.g. x = ±2 or vertical lines)
        if (parsed.branchesX && parsed.branchesX.length > 0) {
          parsed.branchesX.forEach((branchFn) => {
            const fn = (y: number) => branchFn(0, y, 0, 0, scope);
            drawExplicitCurveX(ctx, fn, viewport, expr.color, lineWidth);
          });
        } else if (parsed.evalX && (!parsed.branchesY || parsed.branchesY.length === 0)) {
          const fn = (y: number) => parsed.evalX!(0, y, 0, 0, scope);
          drawExplicitCurveX(ctx, fn, viewport, expr.color, lineWidth);
        }
      } else if (parsed.type === 'parametric') {
        if (parsed.evalParametricX && parsed.evalParametricY) {
          const fnX = (t: number) => parsed.evalParametricX!(0, 0, t, 0, scope);
          const fnY = (t: number) => parsed.evalParametricY!(0, 0, t, 0, scope);
          const tMin = expr.tMin ?? 0;
          const tMax = expr.tMax ?? 2 * Math.PI;
          drawParametricCurve(ctx, fnX, fnY, tMin, tMax, viewport, expr.color, lineWidth);
        }
      } else if (parsed.type === 'polar') {
        if (parsed.evalR) {
          const fnR = (th: number) => parsed.evalR!(0, 0, 0, th, scope);
          const thMin = expr.thetaMin ?? 0;
          const thMax = expr.thetaMax ?? 2 * Math.PI;
          drawPolarCurve(ctx, fnR, thMin, thMax, viewport, expr.color, lineWidth);
        }
      } else if (parsed.type === 'implicit') {
        // If exact symbolic branches exist (e.g. x² = y², y² = 4, etc.), render them cleanly!
        let hasRenderedBranches = false;
        if (parsed.inequality === 'none') {
          if (parsed.branchesY && parsed.branchesY.length > 0) {
            parsed.branchesY.forEach((branchFn) => {
              const fn = (x: number) => branchFn(x, 0, 0, 0, scope);
              drawExplicitCurveY(ctx, fn, viewport, expr.color, lineWidth);
            });
            hasRenderedBranches = true;
          }
          if (parsed.branchesX && parsed.branchesX.length > 0) {
            parsed.branchesX.forEach((branchFn) => {
              const fn = (y: number) => branchFn(0, y, 0, 0, scope);
              drawExplicitCurveX(ctx, fn, viewport, expr.color, lineWidth);
            });
            hasRenderedBranches = true;
          }
        }

        // If no explicit branches exist (or general non-algebraic implicit equation), use Marching Squares
        if (!hasRenderedBranches && parsed.evalImplicit) {
          const cellSize = isDragging ? 4.5 : 2.0;
          const contour = computeImplicitContour(parsed.evalImplicit, viewport, scope, cellSize);
          renderContourSegments(ctx, contour.segments, expr.color, lineWidth);
        }
      } else if (parsed.type === 'system') {
        // Render all sub-equations in the system
        if (parsed.subEquations) {
          parsed.subEquations.forEach((subP) => {
            if (subP.type === 'explicit') {
              if (subP.branchesY && subP.branchesY.length > 0) {
                subP.branchesY.forEach((branchFn) => {
                  const fn = (x: number) => branchFn(x, 0, 0, 0, scope);
                  drawExplicitCurveY(ctx, fn, viewport, expr.color, lineWidth);
                });
              } else if (subP.evalY) {
                const fn = (x: number) => subP.evalY!(x, 0, 0, 0, scope);
                drawExplicitCurveY(ctx, fn, viewport, expr.color, lineWidth);
              }
              if (subP.branchesX && subP.branchesX.length > 0) {
                subP.branchesX.forEach((branchFn) => {
                  const fn = (y: number) => branchFn(0, y, 0, 0, scope);
                  drawExplicitCurveX(ctx, fn, viewport, expr.color, lineWidth);
                });
              } else if (subP.evalX) {
                const fn = (y: number) => subP.evalX!(0, y, 0, 0, scope);
                drawExplicitCurveX(ctx, fn, viewport, expr.color, lineWidth);
              }
            } else if (subP.evalImplicit) {
              const cellSize = isDragging ? 4.5 : 2.0;
              const contour = computeImplicitContour(subP.evalImplicit, viewport, scope, cellSize);
              renderContourSegments(ctx, contour.segments, expr.color, lineWidth);
            }
          });
        }
        // Draw system solution intersection points with glowing nodes
        if (parsed.systemSolutions && parsed.systemSolutions.length > 0) {
          parsed.systemSolutions.forEach((sol) => {
            const s = worldToScreen(sol.x, sol.y, viewport);
            if (s.x >= -30 && s.x <= viewport.width + 30 && s.y >= -30 && s.y <= viewport.height + 30) {
              drawCalculusNode(ctx, s.x, s.y, 'intersection', `Sol: ${sol.label}`, theme);
            }
          });
        }
      } else if (parsed.type === 'point') {
        if (expr.pointX !== undefined && expr.pointY !== undefined) {
          drawPoint(ctx, expr.pointX, expr.pointY, expr.pointLabel || `(${expr.pointX}, ${expr.pointY})`, expr.color, viewport, theme);
        }
      }
    });

    // 6. Draw Auto-detected Roots & Extrema for the currently active function
    if (activeExpressionId) {
      const activeParsed = parsedEquations.get(activeExpressionId);
      const activeExpr = expressions.find((e) => e.id === activeExpressionId);
      if (activeParsed && activeExpr) {
        const activeYFns: ((x: number) => number)[] = [];
        if (activeParsed.branchesY && activeParsed.branchesY.length > 0) {
          activeParsed.branchesY.forEach((bfn) => activeYFns.push((x) => bfn(x, 0, 0, 0, scope)));
        } else if (activeParsed.evalY) {
          activeYFns.push((x) => activeParsed.evalY!(x, 0, 0, 0, scope));
        }

        activeYFns.forEach((fn) => {
          const roots = findRootsInInterval(fn, viewport.xMin, viewport.xMax, 300);
          roots.forEach((rx) => {
            const s = worldToScreen(rx, 0, viewport);
            if (s.x >= 0 && s.x <= viewport.width && s.y >= 0 && s.y <= viewport.height) {
              drawCalculusNode(ctx, s.x, s.y, 'root', `(${rx.toFixed(3)}, 0)`, theme);
            }
          });

          const extrema = findExtremaInInterval(fn, viewport.xMin, viewport.xMax, 250);
          extrema.forEach((pt) => {
            const s = worldToScreen(pt.x, pt.y, viewport);
            if (s.x >= 0 && s.x <= viewport.width && s.y >= 0 && s.y <= viewport.height) {
              drawCalculusNode(ctx, s.x, s.y, pt.type, `(${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})`, theme);
            }
          });
        });
      }
    }

    // 7. Draw Intersections between visible explicit functions, branches, and vertical lines
    const explicitFns: { id: string; fn: (x: number) => number }[] = [];
    const verticalLines: { id: string; xVal: number }[] = [];

    const addParsedBranches = (idPrefix: string, p: ParsedEquationInfo) => {
      if (p.type === 'explicit') {
        if (p.branchesY && p.branchesY.length > 0) {
          p.branchesY.forEach((bfn, idx) => {
            explicitFns.push({ id: `${idPrefix}_by${idx}`, fn: (x: number) => bfn(x, 0, 0, 0, scope) });
          });
        } else if (p.evalY) {
          explicitFns.push({ id: `${idPrefix}_y`, fn: (x: number) => p.evalY!(x, 0, 0, 0, scope) });
        }
        if (p.branchesX && p.branchesX.length > 0) {
          p.branchesX.forEach((bfn, idx) => {
            const sample = bfn(0, 0, 0, 0, scope);
            if (!isNaN(sample) && isFinite(sample)) {
              verticalLines.push({ id: `${idPrefix}_bx${idx}`, xVal: sample });
            }
          });
        } else if (p.evalX) {
          const sample = p.evalX(0, 0, 0, 0, scope);
          if (!isNaN(sample) && isFinite(sample)) {
            verticalLines.push({ id: `${idPrefix}_x`, xVal: sample });
          }
        }
      } else if (p.type === 'system' && p.subEquations) {
        p.subEquations.forEach((subP, subIdx) => {
          addParsedBranches(`${idPrefix}_sub${subIdx}`, subP);
        });
      }
    };

    expressions.forEach((e) => {
      if (!e.visible) return;
      const p = parsedEquations.get(e.id);
      if (p) {
        addParsedBranches(e.id, p);
      }
    });

    const renderedInters = new Set<string>();
    const markIntersection = (x: number, y: number) => {
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return;
      const key = `${x.toFixed(4)},${y.toFixed(4)}`;
      if (renderedInters.has(key)) return;
      renderedInters.add(key);

      const s = worldToScreen(x, y, viewport);
      if (s.x >= 0 && s.x <= viewport.width && s.y >= 0 && s.y <= viewport.height) {
        drawCalculusNode(ctx, s.x, s.y, 'intersection', `(${x.toFixed(3)}, ${y.toFixed(3)})`, theme);
      }
    };

    // Intersections between explicit functions
    if (explicitFns.length >= 2) {
      for (let i = 0; i < explicitFns.length; i++) {
        for (let j = i + 1; j < explicitFns.length; j++) {
          const inters = findIntersections(explicitFns[i].fn, explicitFns[j].fn, viewport.xMin, viewport.xMax, 200);
          inters.forEach((pt) => markIntersection(pt.x, pt.y));
        }
      }
    }

    // Intersections between vertical lines and explicit functions
    if (verticalLines.length > 0 && explicitFns.length > 0) {
      verticalLines.forEach((vl) => {
        explicitFns.forEach((ef) => {
          const y = ef.fn(vl.xVal);
          markIntersection(vl.xVal, y);
        });
      });
    }

    // 8. Draw Traced Point bead if hovering/tracing
    if (tracedPoint) {
      ctx.save();
      ctx.fillStyle = tracedPoint.color;
      ctx.beginPath();
      ctx.arc(tracedPoint.sx, tracedPoint.sy, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tooltip callout badge
      const text = tracedPoint.label || `(${tracedPoint.x.toFixed(3)}, ${tracedPoint.y.toFixed(3)})`;
      ctx.font = '12px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(text).width;
      const padX = 8;
      const padY = 4;
      const bx = Math.min(viewport.width - textWidth - padX * 2 - 8, Math.max(8, tracedPoint.sx - textWidth / 2 - padX));
      const by = Math.max(10, tracedPoint.sy - 28);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(bx, by, textWidth + padX * 2, 22, 4);
      ctx.fill();

      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(text, bx + padX, by + 15);
      ctx.restore();
    }

    // 9. Draw Pinned Points
    pinnedPoints.forEach((pt) => {
      const s = worldToScreen(pt.x, pt.y, viewport);
      drawPoint(ctx, pt.x, pt.y, pt.label, pt.color, viewport, theme);
    });

    ctx.restore();
  }, [
    viewport,
    expressions,
    parsedEquations,
    scope,
    theme,
    gridMode,
    showMinorGrid,
    isDragging,
    activeExpressionId,
    tracedPoint,
    pinnedPoints,
    worldToScreen,
  ]);

  // Mouse / Pointer Event Handlers for Panning, Zooming & Curve Tracing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture fails
    }
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activePointersRef.current.size === 2) {
      // 2 fingers down: initiate pinch zoom
      const pts = Array.from(activePointersRef.current.values());
      initialPinchDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPinchViewportRef.current = { ...viewport };
      setIsDragging(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, viewport);
    setHoverCoord({ x: world.x, y: world.y, sx, sy });

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Android / Touch multi-pointer pinch to zoom
    if (activePointersRef.current.size === 2 && initialPinchDistRef.current && initialPinchViewportRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

      if (currentDist > 5 && initialPinchDistRef.current > 5) {
        const scale = initialPinchDistRef.current / currentDist;
        const midScreenX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midScreenY = (pts[0].y + pts[1].y) / 2 - rect.top;
        const initVp = initialPinchViewportRef.current;
        const focusWorld = screenToWorld(midScreenX, midScreenY, initVp);

        const currentSpanX = initVp.xMax - initVp.xMin;
        const currentSpanY = initVp.yMax - initVp.yMin;
        const newSpanX = currentSpanX * scale;
        const newSpanY = currentSpanY * scale;

        const ratioX = (focusWorld.x - initVp.xMin) / currentSpanX;
        const ratioY = (focusWorld.y - initVp.yMin) / currentSpanY;

        onViewportChange({
          ...initVp,
          xMin: focusWorld.x - ratioX * newSpanX,
          xMax: focusWorld.x + (1 - ratioX) * newSpanX,
          yMin: focusWorld.y - ratioY * newSpanY,
          yMax: focusWorld.y + (1 - ratioY) * newSpanY,
        });
        return;
      }
    }

    // Single touch or mouse dragging
    if (isDragging && dragStart && activePointersRef.current.size <= 1) {
      const dxScreen = e.clientX - dragStart.x;
      const dyScreen = e.clientY - dragStart.y;

      const dxWorld = (dxScreen / viewport.width) * (viewport.xMax - viewport.xMin);
      const dyWorld = (dyScreen / viewport.height) * (viewport.yMax - viewport.yMin);

      onViewportChange({
        ...viewport,
        xMin: viewport.xMin - dxWorld,
        xMax: viewport.xMax - dxWorld,
        yMin: viewport.yMin + dyWorld,
        yMax: viewport.yMax + dyWorld,
      });

      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Proximity search for active curve tracing across all branches
    if (!isDragging) {
      let nearestDist = 18; // screen pixels threshold
      let foundTrace: typeof tracedPoint = null;

      expressions.forEach((expr) => {
        if (!expr.visible) return;
        const parsed = parsedEquations.get(expr.id);
        if (!parsed) return;

        // Check Y branches & functions
        const yFns: ((x: number) => number)[] = [];
        const xFns: ((y: number) => number)[] = [];

        const collectFns = (p: ParsedEquationInfo) => {
          if (p.branchesY && p.branchesY.length > 0) {
            p.branchesY.forEach((bfn) => yFns.push((x) => bfn(x, 0, 0, 0, scope)));
          } else if (p.evalY) {
            yFns.push((x) => p.evalY!(x, 0, 0, 0, scope));
          }
          if (p.branchesX && p.branchesX.length > 0) {
            p.branchesX.forEach((bfn) => xFns.push((y) => bfn(0, y, 0, 0, scope)));
          } else if (p.evalX) {
            xFns.push((y) => p.evalX!(0, y, 0, 0, scope));
          }
          if (p.type === 'system' && p.subEquations) {
            p.subEquations.forEach((subP) => collectFns(subP));
          }
        };

        collectFns(parsed);

        yFns.forEach((fn) => {
          const curY = fn(world.x);
          if (!isNaN(curY) && isFinite(curY)) {
            const screenPt = worldToScreen(world.x, curY, viewport);
            const dist = Math.hypot(screenPt.x - sx, screenPt.y - sy);
            if (dist < nearestDist) {
              nearestDist = dist;
              const slope = numericalDerivative(fn, world.x);
              foundTrace = {
                x: world.x,
                y: curY,
                sx: screenPt.x,
                sy: screenPt.y,
                slope,
                color: expr.color,
                label: `(${world.x.toFixed(3)}, ${curY.toFixed(3)})`,
              };
            }
          }
        });

        xFns.forEach((fn) => {
          const curX = fn(world.y);
          if (!isNaN(curX) && isFinite(curX)) {
            const screenPt = worldToScreen(curX, world.y, viewport);
            const dist = Math.hypot(screenPt.x - sx, screenPt.y - sy);
            if (dist < nearestDist) {
              nearestDist = dist;
              foundTrace = {
                x: curX,
                y: world.y,
                sx: screenPt.x,
                sy: screenPt.y,
                slope: Infinity,
                color: expr.color,
                label: `(${curX.toFixed(3)}, ${world.y.toFixed(3)})`,
              };
            }
          }
        });
      });

      setTracedPoint(foundTrace);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      initialPinchDistRef.current = null;
      initialPinchViewportRef.current = null;
    }
    if (activePointersRef.current.size === 0) {
      setIsDragging(false);
      setDragStart(null);
    } else if (activePointersRef.current.size === 1) {
      const [remaining] = Array.from(activePointersRef.current.values());
      setDragStart(remaining);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const focusWorld = screenToWorld(sx, sy, viewport);

    const zoomFactor = e.deltaY < 0 ? 0.88 : 1.14;

    const currentSpanX = viewport.xMax - viewport.xMin;
    const currentSpanY = viewport.yMax - viewport.yMin;

    const newSpanX = currentSpanX * zoomFactor;
    const newSpanY = currentSpanY * zoomFactor;

    const focusRatioX = (focusWorld.x - viewport.xMin) / currentSpanX;
    const focusRatioY = (focusWorld.y - viewport.yMin) / currentSpanY;

    onViewportChange({
      ...viewport,
      xMin: focusWorld.x - focusRatioX * newSpanX,
      xMax: focusWorld.x + (1 - focusRatioX) * newSpanX,
      yMin: focusWorld.y - focusRatioY * newSpanY,
      yMax: focusWorld.y + (1 - focusRatioY) * newSpanY,
    });
  };

  const animFrameRef = useRef<number | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<'copied' | 'downloaded' | null>(null);
  const [isPresetsCollapsed, setIsPresetsCollapsed] = useState<boolean>(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [isTraceModeActive, setIsTraceModeActive] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const animateToViewport = useCallback(
    (target: { xMin: number; xMax: number; yMin: number; yMax: number }, duration = 280) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const start = {
        xMin: viewport.xMin,
        xMax: viewport.xMax,
        yMin: viewport.yMin,
        yMax: viewport.yMax,
      };

      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Smooth cubic ease out
        const ease = 1 - Math.pow(1 - progress, 3);

        onViewportChange({
          ...viewport,
          xMin: start.xMin + (target.xMin - start.xMin) * ease,
          xMax: start.xMax + (target.xMax - start.xMax) * ease,
          yMin: start.yMin + (target.yMin - start.yMin) * ease,
          yMax: start.yMax + (target.yMax - start.yMax) * ease,
        });

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [viewport, onViewportChange]
  );

  // Zoom controls with smooth animation
  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 0.72 : 1.38;
    const centerX = (viewport.xMin + viewport.xMax) / 2;
    const centerY = (viewport.yMin + viewport.yMax) / 2;
    const spanX = (viewport.xMax - viewport.xMin) * factor;
    const spanY = (viewport.yMax - viewport.yMin) * factor;

    animateToViewport({
      xMin: centerX - spanX / 2,
      xMax: centerX + spanX / 2,
      yMin: centerY - spanY / 2,
      yMax: centerY + spanY / 2,
    }, 200);
  };

  const handleRecenterOrigin = () => {
    const spanX = viewport.xMax - viewport.xMin;
    const spanY = viewport.yMax - viewport.yMin;
    animateToViewport({
      xMin: -spanX / 2,
      xMax: spanX / 2,
      yMin: -spanY / 2,
      yMax: spanY / 2,
    });
  };

  const handleResetViewport = () => {
    const aspect = viewport.width / (viewport.height || 1);
    const halfY = 10;
    const halfX = 10 * aspect;
    animateToViewport({
      xMin: -halfX,
      xMax: halfX,
      yMin: -halfY,
      yMax: halfY,
    });
  };

  const handleTrigViewport = () => {
    const halfX = 2 * Math.PI;
    const aspect = viewport.width / (viewport.height || 1);
    const halfY = halfX / (aspect || 1);
    animateToViewport({
      xMin: -halfX,
      xMax: halfX,
      yMin: -halfY,
      yMax: halfY,
    });
  };

  const handleUnitCircleViewport = () => {
    const aspect = viewport.width / (viewport.height || 1);
    const halfY = 2.2;
    const halfX = 2.2 * aspect;
    animateToViewport({
      xMin: -halfX,
      xMax: halfX,
      yMin: -halfY,
      yMax: halfY,
    });
  };

  const handleSquareAspect = () => {
    const centerX = (viewport.xMin + viewport.xMax) / 2;
    const centerY = (viewport.yMin + viewport.yMax) / 2;
    const spanX = viewport.xMax - viewport.xMin;
    const desiredSpanY = (spanX * viewport.height) / (viewport.width || 1);

    animateToViewport({
      xMin: viewport.xMin,
      xMax: viewport.xMax,
      yMin: centerY - desiredSpanY / 2,
      yMax: centerY + desiredSpanY / 2,
    }, 200);
  };

  const handleSnapshotCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          if (navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setSnapshotStatus('copied');
            setTimeout(() => setSnapshotStatus(null), 2000);
            return;
          }
        } catch {
          // Fallback to direct download
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stoikliem_graph_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setSnapshotStatus('downloaded');
        setTimeout(() => setSnapshotStatus(null), 2000);
      });
    } catch {
      // ignore
    }
  };

  if (gridMode === 'raymarch_3d') {
    return (
      <div className="relative w-full h-full select-none overflow-hidden">
        <RaymarchingCanvas
          theme={theme}
          onPlot2DSlice={onPlot2DSlice}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden touch-none">
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Floating Top Convenient Viewport Presets Strip (Collapsible & Auto-fading) */}
      <div
        className={`absolute top-3 left-3 sm:left-4 z-20 transition-all duration-200 ${
          isDragging ? 'opacity-30 pointer-events-none' : 'opacity-95 hover:opacity-100'
        }`}
      >
        {isPresetsCollapsed ? (
          <button
            onClick={() => setIsPresetsCollapsed(false)}
            title="Expand Window Presets Toolbar"
            className="px-2.5 py-1.5 bg-stone-900/85 hover:bg-stone-900 text-stone-300 hover:text-white backdrop-blur-md rounded-xl border border-stone-700/60 shadow-lg text-2xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Target className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono text-3xs hidden xs:inline">Presets</span>
            <ChevronRight className="w-3 h-3 opacity-60" />
          </button>
        ) : (
          <div className="flex items-center gap-1 p-1 bg-stone-900/85 hover:bg-stone-900/95 backdrop-blur-md rounded-xl border border-stone-700/60 shadow-lg text-stone-300 text-3xs sm:text-2xs font-medium transition-all">
            {/* Plane Type Switcher Dropdown */}
            {onSelectGridMode && (
              <div className="relative plane-menu-container">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaneMenuOpen(!isPlaneMenuOpen);
                    setIsUniqueGraphsMenuOpen(false);
                  }}
                  title="Switch Plane Type: Cartesian, Complex Plane, Vector Field, Polar, Trig"
                  className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95 font-semibold ${
                    gridMode === 'complex' || gridMode === 'complex_vector'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'hover:text-white hover:bg-stone-800 text-stone-200'
                  }`}
                >
                  <Compass className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>
                    {gridMode === 'complex'
                      ? 'ℂ Complex'
                      : gridMode === 'complex_vector'
                      ? '𝔉 Vector Field'
                      : (gridMode as GridMode) === 'raymarch_3d'
                      ? '🧊 3D Raymarch'
                      : gridMode === 'polar'
                      ? '◎ Polar'
                      : gridMode === 'trig'
                      ? '∿ Trig'
                      : '☩ Cartesian'}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {/* Dropdown Menu for Plane Types */}
                {isPlaneMenuOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-52 p-1.5 bg-stone-900/95 backdrop-blur-md rounded-xl border border-stone-700/70 shadow-2xl z-50 flex flex-col gap-0.5 text-xs text-stone-200 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-3xs uppercase tracking-wider font-bold text-stone-400 border-b border-stone-800">
                      Coordinate Plane Type
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectGridMode('cartesian');
                        setIsPlaneMenuOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors ${
                        gridMode === 'cartesian' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>☩ Cartesian Plane</span>
                        <span className="text-3xs text-stone-400">(x, y) Standard Axes</span>
                      </div>
                      {gridMode === 'cartesian' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectGridMode('complex');
                        setIsPlaneMenuOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors ${
                        gridMode === 'complex' ? 'bg-amber-500/20 text-amber-400 font-semibold ring-1 ring-amber-400/30' : 'hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-amber-300">ℂ Complex Plane</span>
                        <span className="text-3xs text-stone-400">Re(z) & Im(z) Argand diagram</span>
                      </div>
                      {gridMode === 'complex' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectGridMode('complex_vector');
                        setIsPlaneMenuOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors ${
                        gridMode === 'complex_vector' ? 'bg-cyan-500/20 text-cyan-400 font-semibold ring-1 ring-cyan-400/30' : 'hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-cyan-300">𝔉 Complex Vector Field</span>
                        <span className="text-3xs text-stone-400">Polya flow & phase needles</span>
                      </div>
                      {gridMode === 'complex_vector' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectGridMode('polar');
                        setIsPlaneMenuOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors ${
                        gridMode === 'polar' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>◎ Polar Coordinates</span>
                        <span className="text-3xs text-stone-400">(r, θ) Concentric Circles</span>
                      </div>
                      {gridMode === 'polar' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectGridMode('trig');
                        setIsPlaneMenuOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors ${
                        gridMode === 'trig' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>∿ Trigonometric Grid</span>
                        <span className="text-3xs text-stone-400">Multiples of π</span>
                      </div>
                      {gridMode === 'trig' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectGridMode('raymarch_3d');
                        setIsPlaneMenuOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors ${
                        (gridMode as GridMode) === 'raymarch_3d' ? 'bg-indigo-500/20 text-indigo-400 font-semibold ring-1 ring-indigo-400/30' : 'hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-indigo-300">🧊 3D Manifolds & Raymarching</span>
                        <span className="text-3xs text-stone-400">GPU raymarcher & real-time slicing</span>
                      </div>
                      {(gridMode as GridMode) === 'raymarch_3d' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Button for Preloaded Unique Graphs & Fractals */}
            {onLoadPreset && (
              <div className="relative unique-graphs-menu-container">
                <button
                  type="button"
                  onClick={() => {
                    setIsUniqueGraphsMenuOpen(!isUniqueGraphsMenuOpen);
                    setIsPlaneMenuOpen(false);
                  }}
                  title="Load Unique Graphs: Mandelbrot, Julia Curves & Vector Fields"
                  className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95 font-medium ${
                    gridMode === 'complex' || gridMode === 'complex_vector'
                      ? 'bg-amber-500/25 text-amber-300 hover:bg-amber-500/35 border border-amber-500/40 font-semibold shadow-xs'
                      : 'hover:text-white hover:bg-stone-800 text-stone-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Unique Graphs</span>
                  <span className="sm:hidden">Graphs</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {isUniqueGraphsMenuOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-64 p-1.5 bg-stone-900/95 backdrop-blur-md rounded-xl border border-stone-700/70 shadow-2xl z-50 flex flex-col gap-0.5 text-xs text-stone-200 animate-in fade-in zoom-in-95 duration-100 max-h-[72vh] overflow-y-auto">
                    <div className="px-2 py-1 flex items-center justify-between border-b border-stone-800 shrink-0">
                      <span className="text-3xs uppercase tracking-wider font-bold text-amber-400">
                        Unique Complex & Fractal Graphs
                      </span>
                      {onOpenPresets && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUniqueGraphsMenuOpen(false);
                            onOpenPresets();
                          }}
                          className="text-3xs text-stone-400 hover:text-white underline cursor-pointer"
                        >
                          All Presets
                        </button>
                      )}
                    </div>

                    {/* Pre-loaded unique graphs */}
                    {CLASSIC_PRESETS.filter((p) => p.category === 'Complex Plane & Fractals').map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onLoadPreset(preset);
                          setIsUniqueGraphsMenuOpen(false);
                        }}
                        className="px-2 py-1.5 rounded-lg hover:bg-stone-800 text-left transition-colors flex flex-col gap-0.5 group cursor-pointer"
                      >
                        <div className="flex items-center justify-between font-semibold group-hover:text-amber-300 text-stone-200">
                          <span className="truncate">{preset.name}</span>
                          <span className="text-3xs px-1 rounded bg-stone-800 text-stone-400 shrink-0 ml-1">
                            {preset.gridMode === 'complex_vector' ? 'Vector' : 'Argand'}
                          </span>
                        </div>
                        <div className="text-3xs text-stone-400 line-clamp-1">
                          {preset.description}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GPU 3D Manifold Raymarching & Real-time Slicer Toggle */}
            <button
              type="button"
              onClick={() => setIsRaymarchSlicerOpen(!isRaymarchSlicerOpen)}
              title="GPU-Accelerated 3D Implicit Surface Raymarching & Real-Time Slicing Dock"
              className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95 font-medium ${
                isRaymarchSlicerOpen || (gridMode as GridMode) === 'raymarch_3d'
                  ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 font-semibold shadow-xs'
                  : 'hover:text-white hover:bg-stone-800 text-stone-300'
              }`}
            >
              <Compass className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">3D Manifold Slicer</span>
              <span className="sm:hidden">3D Slicer</span>
            </button>

            <span className="w-px h-3.5 bg-stone-700/60 mx-0.5 hidden xs:inline" />

            <button
              onClick={handleRecenterOrigin}
              title="Recenter Origin (0,0)"
              className="px-2 py-1 rounded-lg hover:text-white hover:bg-stone-800 flex items-center gap-1 transition-colors active:scale-95"
            >
              <Target className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">Origin (0,0)</span>
            </button>
            <button
              onClick={handleResetViewport}
              title="Default Window [-10, 10]"
              className="px-2 py-1 rounded-lg hover:text-white hover:bg-stone-800 transition-colors active:scale-95"
            >
              [-10, 10]
            </button>
            <button
              onClick={handleTrigViewport}
              title="Trigonometric Window [-2π, 2π]"
              className="px-2 py-1 rounded-lg hover:text-white hover:bg-stone-800 transition-colors active:scale-95 font-serif italic"
            >
              [-2π, 2π]
            </button>
            <button
              onClick={handleUnitCircleViewport}
              title="Unit Geometric Window [-2, 2]"
              className="px-2 py-1 rounded-lg hover:text-white hover:bg-stone-800 transition-colors active:scale-95"
            >
              Unit [-2, 2]
            </button>
            <button
              onClick={() => setIsPresetsCollapsed(true)}
              title="Minimize Presets Toolbar"
              className="p-1 rounded-lg hover:text-white hover:bg-stone-800 text-stone-500 transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Canvas Navigation Toolbar (Collapsible & Auto-fading) */}
      <div
        className={`absolute right-3 sm:right-5 bottom-20 md:bottom-6 z-20 select-none transition-all duration-200 ${
          isDragging ? 'opacity-30 pointer-events-none' : 'opacity-95 hover:opacity-100'
        }`}
      >
        {isControlsCollapsed ? (
          <button
            onClick={() => setIsControlsCollapsed(false)}
            title="Expand Graph Navigation Controls"
            className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center p-2 bg-stone-900/85 hover:bg-stone-900 text-stone-300 hover:text-white backdrop-blur-md rounded-xl border border-stone-700/60 shadow-xl transition-all active:scale-95"
          >
            <Sliders className="w-4 h-4 text-amber-500" />
          </button>
        ) : (
          <div className="flex flex-col gap-1.5 p-1 bg-stone-900/85 backdrop-blur-md rounded-xl border border-stone-700/60 shadow-xl">
            {/* Trace Mode Toggle */}
            <button
              onClick={() => setIsTraceModeActive(!isTraceModeActive)}
              title={
                isTraceModeActive
                  ? 'Trace Mode Active (Click to disable)'
                  : 'Enable Trace Mode (Snap cursor to curve coordinates & slope)'
              }
              className={`w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] sm:min-w-[36px] min-h-[40px] sm:min-h-[36px] flex items-center justify-center p-2 rounded-lg transition-all active:scale-90 ${
                isTraceModeActive
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
              aria-label="Trace Mode"
            >
              <Activity className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleZoom('in')}
              title="Zoom In (+)"
              className="w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] sm:min-w-[36px] min-h-[40px] sm:min-h-[36px] flex items-center justify-center p-2 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-90 rounded-lg transition-all"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              title="Zoom Out (-)"
              className="w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] sm:min-w-[36px] min-h-[40px] sm:min-h-[36px] flex items-center justify-center p-2 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-90 rounded-lg transition-all"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleSquareAspect}
              title="Lock Square Aspect Ratio (1:1)"
              className="w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] sm:min-w-[36px] min-h-[40px] sm:min-h-[36px] flex items-center justify-center p-2 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-90 rounded-lg transition-all"
              aria-label="Square Aspect"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetViewport}
              title="Reset Standard Window"
              className="w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] sm:min-w-[36px] min-h-[40px] sm:min-h-[36px] flex items-center justify-center p-2 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-90 rounded-lg transition-all"
              aria-label="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleSnapshotCanvas}
              title={snapshotStatus === 'copied' ? 'Copied image to clipboard!' : 'Snapshot / Copy Graph Canvas'}
              className="w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] sm:min-w-[36px] min-h-[40px] sm:min-h-[36px] flex items-center justify-center p-2 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-90 rounded-lg transition-all"
              aria-label="Snapshot Graph"
            >
              {snapshotStatus ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Camera className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Collapse button */}
            <button
              onClick={() => setIsControlsCollapsed(true)}
              title="Minimize Controls Dock"
              className="w-10 h-7 sm:w-9 sm:h-6 flex items-center justify-center text-stone-500 hover:text-stone-300 hover:bg-stone-800 rounded-lg transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Interactive Trace Point Floating Badge */}
      {tracedPoint && (
        <div
          className="absolute z-30 pointer-events-none px-2.5 py-1.5 rounded-xl shadow-2xl border text-xs font-mono tabular-nums backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
          style={{
            left: Math.min(Math.max(tracedPoint.sx + 14, 10), (viewport.width || 400) - 170),
            top: Math.max(tracedPoint.sy - 46, 12),
            backgroundColor: 'rgba(20, 24, 33, 0.94)',
            borderColor: tracedPoint.color || '#F59E0B',
            color: '#F8FAFC',
          }}
        >
          <div className="flex items-center gap-1.5 font-bold text-3xs uppercase tracking-wider" style={{ color: tracedPoint.color }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: tracedPoint.color }} />
            <span>Exact Point Trace</span>
          </div>
          <div className="text-2xs text-stone-200 font-bold">
            ({tracedPoint.x.toFixed(4)}, {tracedPoint.y.toFixed(4)})
          </div>
          {tracedPoint.slope !== undefined && !isNaN(tracedPoint.slope) && isFinite(tracedPoint.slope) && (
            <div className="text-3xs text-stone-400 italic">
              dy/dx = {tracedPoint.slope.toFixed(4)}
            </div>
          )}
        </div>
      )}

      {/* Real-time Cursor Coordinates Readout */}
      {hoverCoord && (
        <div className="absolute left-3 sm:left-4 bottom-20 md:bottom-4 pointer-events-none px-2.5 py-1 bg-stone-900/85 backdrop-blur-md rounded-md border border-stone-700/60 shadow-sm text-2xs sm:text-xs font-mono tabular-nums text-stone-300 flex items-center gap-2 sm:gap-3 z-10">
          {gridMode === 'complex' || gridMode === 'complex_vector' ? (
            <>
              <span className="text-amber-400 font-semibold">z = {formatComplex(hoverCoord.x, hoverCoord.y)}</span>
              <span className="text-stone-600">|</span>
              <span>|z|: {Math.hypot(hoverCoord.x, hoverCoord.y).toFixed(3)}</span>
              <span className="text-stone-600">|</span>
              <span>arg: {Math.atan2(hoverCoord.y, hoverCoord.x).toFixed(3)} rad</span>
            </>
          ) : gridMode === 'polar' ? (
            <>
              <span>r: {Math.hypot(hoverCoord.x, hoverCoord.y).toFixed(3)}</span>
              <span className="text-stone-600">|</span>
              <span>θ: {Math.atan2(hoverCoord.y, hoverCoord.x).toFixed(3)} rad</span>
            </>
          ) : (
            <>
              <span>X: {hoverCoord.x.toFixed(3)}</span>
              <span className="text-stone-600">|</span>
              <span>Y: {hoverCoord.y.toFixed(3)}</span>
            </>
          )}
          {isTraceModeActive && (
            <>
              <span className="text-stone-600">|</span>
              <span className="text-emerald-400 font-semibold text-3xs">TRACE ON</span>
            </>
          )}
        </div>
      )}

      {/* Docked / PiP 3D Manifold Raymarching Slicer when enabled in 2D Cartesian Mode */}
      {isRaymarchSlicerOpen && (
        <div className="absolute top-14 right-3 sm:right-6 w-[92%] sm:w-[460px] h-[360px] z-30 animate-in fade-in zoom-in-95 duration-200">
          <RaymarchingCanvas
            theme={theme}
            isEmbedded={true}
            onClose={() => setIsRaymarchSlicerOpen(false)}
            onPlot2DSlice={onPlot2DSlice}
          />
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   CANVAS RENDERING UTILITIES
   ========================================================================= */

function calculateOptimalGridStep(span: number, targetTicks: number = 8): number {
  const roughStep = span / targetTicks;
  const powerOf10 = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / powerOf10;

  let stepMultiplier = 1;
  if (normalized > 3.5) stepMultiplier = 5;
  else if (normalized > 1.5) stepMultiplier = 2;

  return stepMultiplier * powerOf10;
}

function drawCartesianGrid(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  theme: ThemeConfig,
  isTrig: boolean,
  showMinor: boolean
) {
  const { xMin, xMax, yMin, yMax, width, height } = vp;

  // Grid steps
  let stepX = calculateOptimalGridStep(xMax - xMin, 8);
  const stepY = calculateOptimalGridStep(yMax - yMin, 8);

  // If trig mode, snap stepX to fractions of pi
  if (isTrig) {
    const roughPiRatio = (xMax - xMin) / (8 * Math.PI);
    if (roughPiRatio < 0.3) stepX = Math.PI / 4;
    else if (roughPiRatio < 0.7) stepX = Math.PI / 2;
    else if (roughPiRatio < 1.5) stepX = Math.PI;
    else stepX = 2 * Math.PI;
  }

  // Draw Minor Grid lines
  if (showMinor) {
    ctx.strokeStyle = theme.gridMinor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const minorStepX = stepX / 5;
    const startX = Math.floor(xMin / minorStepX) * minorStepX;
    for (let x = startX; x <= xMax; x += minorStepX) {
      const sx = ((x - xMin) / (xMax - xMin)) * width;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }

    const minorStepY = stepY / 5;
    const startY = Math.floor(yMin / minorStepY) * minorStepY;
    for (let y = startY; y <= yMax; y += minorStepY) {
      const sy = ((yMax - y) / (yMax - yMin)) * height;
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();
  }

  // Draw Major Grid lines
  ctx.strokeStyle = theme.gridMajor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();

  const startMajorX = Math.floor(xMin / stepX) * stepX;
  for (let x = startMajorX; x <= xMax; x += stepX) {
    const sx = ((x - xMin) / (xMax - xMin)) * width;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
  }

  const startMajorY = Math.floor(yMin / stepY) * stepY;
  for (let y = startMajorY; y <= yMax; y += stepY) {
    const sy = ((yMax - y) / (yMax - yMin)) * height;
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
  }
  ctx.stroke();

  // Draw Main X and Y Axes (x=0 and y=0)
  ctx.strokeStyle = theme.gridAxis;
  ctx.lineWidth = 2.0;
  ctx.beginPath();

  // Y-axis (where x=0)
  if (xMin <= 0 && xMax >= 0) {
    const sx0 = ((-xMin) / (xMax - xMin)) * width;
    ctx.moveTo(sx0, 0);
    ctx.lineTo(sx0, height);
  }

  // X-axis (where y=0)
  if (yMin <= 0 && yMax >= 0) {
    const sy0 = ((yMax) / (yMax - yMin)) * height;
    ctx.moveTo(0, sy0);
    ctx.lineTo(width, sy0);
  }
  ctx.stroke();

  // Draw Axis Numbers & Labels
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.axisText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const axisScreenY = Math.max(16, Math.min(height - 20, ((yMax) / (yMax - yMin)) * height));
  const axisScreenX = Math.max(24, Math.min(width - 30, ((-xMin) / (xMax - xMin)) * width));

  // Numbers along X-axis
  for (let x = startMajorX; x <= xMax; x += stepX) {
    if (Math.abs(x) < 1e-9) continue; // skip 0
    const sx = ((x - xMin) / (xMax - xMin)) * width;
    if (sx < 15 || sx > width - 15) continue;

    let label = isTrig ? formatPiFraction(x) : formatNumber(x);
    ctx.fillText(label, sx, axisScreenY + 4);
  }

  // Numbers along Y-axis
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = startMajorY; y <= yMax; y += stepY) {
    if (Math.abs(y) < 1e-9) continue; // skip 0
    const sy = ((yMax - y) / (yMax - yMin)) * height;
    if (sy < 15 || sy > height - 15) continue;

    ctx.fillText(formatNumber(y), axisScreenX - 6, sy);
  }
}

function drawPolarGrid(ctx: CanvasRenderingContext2D, vp: Viewport, theme: ThemeConfig) {
  const { width, height } = vp;
  const centerScreen = {
    x: ((-vp.xMin) / (vp.xMax - vp.xMin)) * width,
    y: ((vp.yMax) / (vp.yMax - vp.yMin)) * height,
  };

  const scaleX = width / (vp.xMax - vp.xMin);
  const maxRadiusWorld = Math.max(
    Math.hypot(vp.xMin, vp.yMin),
    Math.hypot(vp.xMax, vp.yMax),
    Math.hypot(vp.xMin, vp.yMax),
    Math.hypot(vp.xMax, vp.yMin)
  );

  const stepR = calculateOptimalGridStep(maxRadiusWorld, 6);

  // Concentric Circles
  ctx.strokeStyle = theme.gridMajor;
  ctx.lineWidth = 1.0;

  for (let r = stepR; r <= maxRadiusWorld; r += stepR) {
    const screenRadius = r * scaleX;
    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, screenRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Label for circle
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.axisText;
    ctx.textAlign = 'left';
    ctx.fillText(`r=${formatNumber(r)}`, centerScreen.x + screenRadius + 4, centerScreen.y - 2);
  }

  // Radial Spokes (every 15 or 30 degrees)
  const angles = [
    0, Math.PI / 6, Math.PI / 4, Math.PI / 3,
    Math.PI / 2, (2 * Math.PI) / 3, (3 * Math.PI) / 4, (5 * Math.PI) / 6,
    Math.PI, (7 * Math.PI) / 6, (5 * Math.PI) / 4, (4 * Math.PI) / 3,
    (3 * Math.PI) / 2, (5 * Math.PI) / 3, (7 * Math.PI) / 4, (11 * Math.PI) / 6
  ];

  ctx.strokeStyle = theme.gridMinor;
  ctx.lineWidth = 1;
  const maxScreenDist = Math.hypot(width, height);

  angles.forEach((angle) => {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(centerScreen.x, centerScreen.y);
    ctx.lineTo(centerScreen.x + cosA * maxScreenDist, centerScreen.y - sinA * maxScreenDist);
    ctx.stroke();

    // Radian Angle Label
    const textDist = Math.min(width, height) * 0.44;
    const lx = centerScreen.x + cosA * textDist;
    const ly = centerScreen.y - sinA * textDist;

    if (lx > 20 && lx < width - 20 && ly > 20 && ly < height - 20) {
      ctx.font = '11px "Source Serif 4", serif';
      ctx.fillStyle = theme.axisText;
      ctx.textAlign = 'center';
      ctx.fillText(formatRadianAngle(angle), lx, ly);
    }
  });

  // Cross axes
  ctx.strokeStyle = theme.gridAxis;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, centerScreen.y);
  ctx.lineTo(width, centerScreen.y);
  ctx.moveTo(centerScreen.x, 0);
  ctx.lineTo(centerScreen.x, height);
  ctx.stroke();
}

function drawComplexGrid(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  theme: ThemeConfig,
  showMinor: boolean
) {
  const { xMin, xMax, yMin, yMax, width, height } = vp;

  // Grid steps
  const stepX = calculateOptimalGridStep(xMax - xMin, 8);
  const stepY = calculateOptimalGridStep(yMax - yMin, 8);

  // 1. Minor Grid
  if (showMinor) {
    ctx.strokeStyle = theme.gridMinor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const minorStepX = stepX / 5;
    const startX = Math.floor(xMin / minorStepX) * minorStepX;
    for (let x = startX; x <= xMax; x += minorStepX) {
      const sx = ((x - xMin) / (xMax - xMin)) * width;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    const minorStepY = stepY / 5;
    const startY = Math.floor(yMin / minorStepY) * minorStepY;
    for (let y = startY; y <= yMax; y += minorStepY) {
      const sy = ((yMax - y) / (yMax - yMin)) * height;
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();
  }

  // 2. Major Grid Lines
  ctx.strokeStyle = theme.gridMajor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const startMajorX = Math.floor(xMin / stepX) * stepX;
  for (let x = startMajorX; x <= xMax; x += stepX) {
    const sx = ((x - xMin) / (xMax - xMin)) * width;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
  }
  const startMajorY = Math.floor(yMin / stepY) * stepY;
  for (let y = startMajorY; y <= yMax; y += stepY) {
    const sy = ((yMax - y) / (yMax - yMin)) * height;
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
  }
  ctx.stroke();

  // 3. Concentric Modulus Circles (|z| = 1, 2, 3...)
  const scaleX = width / (xMax - xMin);
  const originSx = ((-xMin) / (xMax - xMin)) * width;
  const originSy = ((yMax) / (yMax - yMin)) * height;

  ctx.save();
  const maxR = Math.max(
    Math.hypot(xMin, yMin),
    Math.hypot(xMax, yMax),
    Math.hypot(xMin, yMax),
    Math.hypot(xMax, yMin)
  );
  const ringStep = calculateOptimalGridStep(maxR, 6);

  ctx.strokeStyle =
    theme.id === 'slate' || theme.id === 'engraving'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.07)';
  ctx.setLineDash([3, 4]);
  ctx.lineWidth = 1.0;
  for (let r = ringStep; r <= maxR; r += ringStep) {
    ctx.beginPath();
    ctx.arc(originSx, originSy, r * scaleX, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Prominent Unit Circle |z| = 1
  if (scaleX > 4) {
    ctx.strokeStyle =
      theme.id === 'slate' || theme.id === 'engraving'
        ? 'rgba(245, 158, 11, 0.5)'
        : 'rgba(180, 83, 9, 0.5)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(originSx, originSy, 1.0 * scaleX, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Main Axes: Real Axis (Re) & Imaginary Axis (Im)
  ctx.strokeStyle = theme.gridAxis;
  ctx.lineWidth = 2.0;
  ctx.beginPath();

  // Imaginary axis (vertical, where Re(z) = 0)
  if (xMin <= 0 && xMax >= 0) {
    ctx.moveTo(originSx, 0);
    ctx.lineTo(originSx, height);
  }

  // Real axis (horizontal, where Im(z) = 0)
  if (yMin <= 0 && yMax >= 0) {
    ctx.moveTo(0, originSy);
    ctx.lineTo(width, originSy);
  }
  ctx.stroke();

  // 5. Axis Tick Numbers
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.axisText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const axisScreenY = Math.max(16, Math.min(height - 20, originSy));
  const axisScreenX = Math.max(32, Math.min(width - 34, originSx));

  // Numbers along Real Axis
  for (let x = startMajorX; x <= xMax; x += stepX) {
    if (Math.abs(x) < 1e-9) continue;
    const sx = ((x - xMin) / (xMax - xMin)) * width;
    if (sx < 15 || sx > width - 15) continue;
    ctx.fillText(formatNumber(x), sx, axisScreenY + 4);
  }

  // Numbers along Imaginary Axis (i, 2i, -i, -2i)
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = startMajorY; y <= yMax; y += stepY) {
    if (Math.abs(y) < 1e-9) continue;
    const sy = ((yMax - y) / (yMax - yMin)) * height;
    if (sy < 15 || sy > height - 15) continue;

    let imLabel = '';
    const roundedY = parseFloat(y.toFixed(6));
    if (roundedY === 1) imLabel = 'i';
    else if (roundedY === -1) imLabel = '-i';
    else imLabel = `${formatNumber(roundedY)}i`;

    ctx.fillText(imLabel, axisScreenX - 6, sy);
  }

  // Real Axis badge Re(z)
  ctx.save();
  ctx.font = 'bold 12px "Source Serif 4", serif';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'right';
  ctx.fillText('Re(z)', width - 12, axisScreenY - 14);

  // Imaginary Axis badge Im(z)
  ctx.textAlign = 'left';
  ctx.fillText('Im(z)', axisScreenX + 8, 14);

  // Unit circle badge |z|=1
  if (scaleX > 20 && originSx + scaleX < width - 20) {
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.fillText('|z|=1', originSx + scaleX + 4, axisScreenY - 10);
  }
  ctx.restore();
}

function drawComplexVectorField(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  theme: ThemeConfig,
  expressions: GraphExpression[],
  parsedEquations: Map<string, ParsedEquationInfo>,
  scope: EvalScope,
  isDragging: boolean
) {
  let evalU = (x: number, y: number, _s: EvalScope) => x * x - y * y - 1;
  let evalV = (x: number, y: number, _s: EvalScope) => 2 * x * y;
  let isPolya = false;

  const vectorExpr = expressions.find(
    (e) => e.visible && parsedEquations.get(e.id)?.type === 'complex_vector'
  );

  if (vectorExpr) {
    const parsed = parsedEquations.get(vectorExpr.id);
    if (parsed?.evalVectorU && parsed?.evalVectorV) {
      evalU = parsed.evalVectorU;
      evalV = parsed.evalVectorV;
      isPolya = !!vectorExpr.isPolya;
    }
  }

  const density = isDragging ? 16 : 22;
  const points = computeComplexVectorGrid(evalU, evalV, vp, scope, density, isPolya);

  const cellW = vp.width / density;
  const maxArrowLen = cellW * 0.95;

  ctx.save();
  points.forEach((pt) => {
    const mag = pt.magnitude;
    if (mag <= 1e-7) return;

    // Smooth nonlinear scaling so vectors are visible across magnitudes
    const scale = Math.tanh(mag * 0.7) * maxArrowLen;
    const len = Math.max(5, scale);

    const dirX = pt.u / mag;
    const dirY = pt.v / mag;

    const sx1 = pt.sx - (dirX * len) / 2;
    const sy1 = pt.sy + (dirY * len) / 2;
    const sx2 = pt.sx + (dirX * len) / 2;
    const sy2 = pt.sy - (dirY * len) / 2;

    const color = phaseToColor(pt.phase, theme);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.6;

    // Arrow shaft
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    // Arrow head
    const headLen = Math.min(6, len * 0.38);
    const angle = Math.atan2(sy2 - sy1, sx2 - sx1);

    ctx.beginPath();
    ctx.moveTo(sx2, sy2);
    ctx.lineTo(
      sx2 - headLen * Math.cos(angle - Math.PI / 6),
      sy2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      sx2 - headLen * Math.cos(angle + Math.PI / 6),
      sy2 - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

function drawExplicitCurveY(
  ctx: CanvasRenderingContext2D,
  fn: (x: number) => number,
  vp: Viewport,
  color: string,
  lineWidth: number
) {
  const { xMin, xMax, yMin, yMax, width, height } = vp;
  const stepPixels = 1.0;
  const numSteps = Math.ceil(width / stepPixels);
  const dx = (xMax - xMin) / numSteps;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  let isDrawing = false;
  let prevYScreen = 0;

  for (let i = 0; i <= numSteps; i++) {
    const x = xMin + i * dx;
    const y = fn(x);

    if (isNaN(y) || !isFinite(y)) {
      isDrawing = false;
      continue;
    }

    const sx = (i / numSteps) * width;
    const sy = ((yMax - y) / (yMax - yMin)) * height;

    // Detect asymptote vertical jump
    if (isDrawing) {
      const jump = Math.abs(sy - prevYScreen);
      if (jump > height * 0.8) {
        // Discontinuity: restart path
        ctx.moveTo(sx, sy);
        prevYScreen = sy;
        continue;
      }
    }

    if (!isDrawing) {
      ctx.moveTo(sx, sy);
      isDrawing = true;
    } else {
      ctx.lineTo(sx, sy);
    }
    prevYScreen = sy;
  }

  ctx.stroke();
  ctx.restore();
}

function drawExplicitCurveX(
  ctx: CanvasRenderingContext2D,
  fn: (y: number) => number,
  vp: Viewport,
  color: string,
  lineWidth: number
) {
  const { xMin, xMax, yMin, yMax, width, height } = vp;
  const stepPixels = 1.0;
  const numSteps = Math.ceil(height / stepPixels);
  const dy = (yMax - yMin) / numSteps;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  let isDrawing = false;

  for (let i = 0; i <= numSteps; i++) {
    const y = yMax - i * dy;
    const x = fn(y);

    if (isNaN(x) || !isFinite(x)) {
      isDrawing = false;
      continue;
    }

    const sx = ((x - xMin) / (xMax - xMin)) * width;
    const sy = (i / numSteps) * height;

    if (!isDrawing) {
      ctx.moveTo(sx, sy);
      isDrawing = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function drawParametricCurve(
  ctx: CanvasRenderingContext2D,
  fnX: (t: number) => number,
  fnY: (t: number) => number,
  tMin: number,
  tMax: number,
  vp: Viewport,
  color: string,
  lineWidth: number
) {
  const { xMin, xMax, yMin, yMax, width, height } = vp;
  const numSamples = 2000;
  const dt = (tMax - tMin) / numSamples;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  let isDrawing = false;

  for (let i = 0; i <= numSamples; i++) {
    const t = tMin + i * dt;
    const x = fnX(t);
    const y = fnY(t);

    if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
      isDrawing = false;
      continue;
    }

    const sx = ((x - xMin) / (xMax - xMin)) * width;
    const sy = ((yMax - y) / (yMax - yMin)) * height;

    if (!isDrawing) {
      ctx.moveTo(sx, sy);
      isDrawing = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function drawPolarCurve(
  ctx: CanvasRenderingContext2D,
  fnR: (theta: number) => number,
  thMin: number,
  thMax: number,
  vp: Viewport,
  color: string,
  lineWidth: number
) {
  const { xMin, xMax, yMin, yMax, width, height } = vp;
  const numSamples = 2000;
  const dTh = (thMax - thMin) / numSamples;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  let isDrawing = false;

  for (let i = 0; i <= numSamples; i++) {
    const th = thMin + i * dTh;
    const r = fnR(th);

    if (isNaN(r) || !isFinite(r)) {
      isDrawing = false;
      continue;
    }

    const x = r * Math.cos(th);
    const y = r * Math.sin(th);

    const sx = ((x - xMin) / (xMax - xMin)) * width;
    const sy = ((yMax - y) / (yMax - yMin)) * height;

    if (!isDrawing) {
      ctx.moveTo(sx, sy);
      isDrawing = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function drawExplicitInequality(
  ctx: CanvasRenderingContext2D,
  evalY: (x: number, y: number, t: number, th: number, scope: EvalScope) => number,
  inequality: '<' | '<=' | '>' | '>=',
  vp: Viewport,
  scope: EvalScope,
  color: string
) {
  const { xMin, xMax, yMin, yMax, width, height } = vp;
  const dx = (xMax - xMin) / width;

  ctx.save();
  ctx.fillStyle = hexToRgba(color, 0.16);

  ctx.beginPath();
  ctx.moveTo(0, inequality.startsWith('>') ? 0 : height);

  for (let i = 0; i <= width; i++) {
    const x = xMin + i * dx;
    const y = evalY(x, 0, 0, 0, scope);
    const sy = isNaN(y) ? (inequality.startsWith('>') ? 0 : height) : ((yMax - y) / (yMax - yMin)) * height;
    ctx.lineTo(i, sy);
  }

  ctx.lineTo(width, inequality.startsWith('>') ? 0 : height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDerivativeCurve(
  ctx: CanvasRenderingContext2D,
  dfn: (x: number) => number,
  vp: Viewport,
  color: string,
  isFirst: boolean
) {
  const { xMin, xMax, yMin, yMax, width, height } = vp;
  const numSteps = Math.ceil(width / 2);
  const dx = (xMax - xMin) / numSteps;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.setLineDash(isFirst ? [6, 4] : [2, 3]);
  ctx.beginPath();

  let isDrawing = false;
  for (let i = 0; i <= numSteps; i++) {
    const x = xMin + i * dx;
    const y = dfn(x);
    if (isNaN(y) || !isFinite(y)) {
      isDrawing = false;
      continue;
    }
    const sx = (i / numSteps) * width;
    const sy = ((yMax - y) / (yMax - yMin)) * height;

    if (!isDrawing) {
      ctx.moveTo(sx, sy);
      isDrawing = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function drawTangentLine(
  ctx: CanvasRenderingContext2D,
  fn: (x: number) => number,
  x0: number,
  vp: Viewport,
  color: string,
  theme: ThemeConfig
) {
  const y0 = fn(x0);
  if (isNaN(y0) || !isFinite(y0)) return;

  const m = numericalDerivative(fn, x0);
  if (isNaN(m) || !isFinite(m)) return;

  const { xMin, xMax, yMin, yMax, width, height } = vp;

  // Tangent line equation: y = y0 + m * (x - x0)
  const yAtLeft = y0 + m * (xMin - x0);
  const yAtRight = y0 + m * (xMax - x0);

  const sxLeft = 0;
  const syLeft = ((yMax - yAtLeft) / (yMax - yMin)) * height;
  const sxRight = width;
  const syRight = ((yMax - yAtRight) / (yMax - yMin)) * height;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(sxLeft, syLeft);
  ctx.lineTo(sxRight, syRight);
  ctx.stroke();

  // Contact point marker
  const ptScreen = {
    x: ((x0 - xMin) / (xMax - xMin)) * width,
    y: ((yMax - y0) / (yMax - yMin)) * height,
  };

  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(ptScreen.x, ptScreen.y, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Callout text with slope
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.textPrimary;
  ctx.fillText(`m = ${m.toFixed(3)}`, ptScreen.x + 8, ptScreen.y - 8);

  ctx.restore();
}

function drawDefiniteIntegralArea(
  ctx: CanvasRenderingContext2D,
  fn: (x: number) => number,
  a: number,
  b: number,
  vp: Viewport,
  color: string
) {
  const [xStart, xEnd] = a <= b ? [a, b] : [b, a];
  const { xMin, xMax, yMin, yMax, width, height } = vp;

  const sStart = ((xStart - xMin) / (xMax - xMin)) * width;
  const sEnd = ((xEnd - xMin) / (xMax - xMin)) * width;
  const sy0 = ((yMax) / (yMax - yMin)) * height;

  const steps = 200;
  const dx = (xEnd - xStart) / steps;

  ctx.save();
  ctx.fillStyle = hexToRgba(color, 0.22);
  ctx.beginPath();
  ctx.moveTo(sStart, sy0);

  for (let i = 0; i <= steps; i++) {
    const x = xStart + i * dx;
    const y = fn(x);
    const sy = isNaN(y) ? sy0 : ((yMax - y) / (yMax - yMin)) * height;
    const sx = sStart + (i / steps) * (sEnd - sStart);
    ctx.lineTo(sx, sy);
  }

  ctx.lineTo(sEnd, sy0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRiemannRectangles(
  ctx: CanvasRenderingContext2D,
  fn: (x: number) => number,
  a: number,
  b: number,
  n: number,
  mode: 'left' | 'right' | 'mid' | 'trapezoid',
  vp: Viewport,
  color: string
) {
  const result = computeRiemannSum(fn, a, b, n, mode);
  const { xMin, xMax, yMin, yMax, width, height } = vp;
  const sy0 = ((yMax) / (yMax - yMin)) * height;

  ctx.save();
  ctx.fillStyle = hexToRgba(color, 0.18);
  ctx.strokeStyle = hexToRgba(color, 0.7);
  ctx.lineWidth = 1;

  result.rectangles.forEach((rect) => {
    const sx = ((rect.x - xMin) / (xMax - xMin)) * width;
    const sw = (rect.width / (xMax - xMin)) * width;

    if (mode === 'trapezoid' && rect.y2 !== undefined) {
      const syLeft = ((yMax - rect.y) / (yMax - yMin)) * height;
      const syRight = ((yMax - rect.y2) / (yMax - yMin)) * height;

      ctx.beginPath();
      ctx.moveTo(sx, sy0);
      ctx.lineTo(sx, syLeft);
      ctx.lineTo(sx + sw, syRight);
      ctx.lineTo(sx + sw, sy0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const syTop = ((yMax - rect.y) / (yMax - yMin)) * height;
      const sh = Math.abs(syTop - sy0);
      const topY = Math.min(syTop, sy0);

      ctx.fillRect(sx, topY, sw, sh);
      ctx.strokeRect(sx, topY, sw, sh);
    }
  });

  ctx.restore();
}

function drawCalculusNode(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  type: string,
  label: string,
  theme: ThemeConfig
) {
  ctx.save();
  let color = '#38BDF8';
  if (type === 'root') color = '#22C55E';
  else if (type === 'minimum') color = '#F59E0B';
  else if (type === 'maximum') color = '#EC4899';
  else if (type === 'intersection') color = '#A855F7';

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy, 4.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw coordinate label
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.axisText;
  ctx.textAlign = 'center';
  ctx.fillText(label, sx, sy - 9);

  ctx.restore();
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string,
  vp: Viewport,
  theme: ThemeConfig
) {
  const sx = ((x - vp.xMin) / (vp.xMax - vp.xMin)) * vp.width;
  const sy = ((vp.yMax - y) / (vp.yMax - vp.yMin)) * vp.height;

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.textPrimary;
  ctx.textAlign = 'left';
  ctx.fillText(label, sx + 8, sy - 4);
  ctx.restore();
}

function formatNumber(num: number): string {
  if (Math.abs(num) < 1e-9) return '0';
  if (Math.abs(num) >= 10000 || (Math.abs(num) < 0.001 && Math.abs(num) > 0)) {
    return num.toExponential(1);
  }
  return parseFloat(num.toFixed(3)).toString();
}

function formatPiFraction(num: number): string {
  const ratio = num / Math.PI;
  if (Math.abs(ratio) < 1e-6) return '0';
  if (Math.abs(ratio - 1) < 1e-4) return 'π';
  if (Math.abs(ratio + 1) < 1e-4) return '-π';
  if (Math.abs(ratio - 0.5) < 1e-4) return 'π/2';
  if (Math.abs(ratio + 0.5) < 1e-4) return '-π/2';
  if (Math.abs(ratio - 0.25) < 1e-4) return 'π/4';
  if (Math.abs(ratio + 0.25) < 1e-4) return '-π/4';
  if (Math.abs(ratio - 2) < 1e-4) return '2π';
  if (Math.abs(ratio + 2) < 1e-4) return '-2π';
  return `${formatNumber(ratio)}π`;
}

function formatRadianAngle(angle: number): string {
  if (Math.abs(angle) < 1e-4) return '0';
  if (Math.abs(angle - Math.PI / 6) < 1e-4) return 'π/6';
  if (Math.abs(angle - Math.PI / 4) < 1e-4) return 'π/4';
  if (Math.abs(angle - Math.PI / 3) < 1e-4) return 'π/3';
  if (Math.abs(angle - Math.PI / 2) < 1e-4) return 'π/2';
  if (Math.abs(angle - (2 * Math.PI) / 3) < 1e-4) return '2π/3';
  if (Math.abs(angle - (3 * Math.PI) / 4) < 1e-4) return '3π/4';
  if (Math.abs(angle - (5 * Math.PI) / 6) < 1e-4) return '5π/6';
  if (Math.abs(angle - Math.PI) < 1e-4) return 'π';
  if (Math.abs(angle - (3 * Math.PI) / 2) < 1e-4) return '3π/2';
  return `${(angle * (180 / Math.PI)).toFixed(0)}°`;
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(59, 130, 246, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
