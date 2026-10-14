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
import { RotateCcw, ZoomIn, ZoomOut, Maximize2, Compass, Target, Camera, Check, Sparkles } from 'lucide-react';

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

    // 2. Draw Coordinates Grid (Cartesian or Polar)
    if (gridMode === 'polar') {
      drawPolarGrid(ctx, viewport, theme);
    } else {
      drawCartesianGrid(ctx, viewport, theme, gridMode === 'trig', showMinorGrid);
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
        if (parsed.evalY) {
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
        } else if (parsed.evalX) {
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
        if (parsed.evalImplicit) {
          // Use coarser step while dragging for fluid 60fps interaction, finer when stationary
          const cellSize = isDragging ? 4.5 : 2.0;
          const contour = computeImplicitContour(parsed.evalImplicit, viewport, scope, cellSize);
          renderContourSegments(ctx, contour.segments, expr.color, lineWidth);
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
      if (activeParsed && activeExpr && activeParsed.type === 'explicit' && activeParsed.evalY) {
        const fn = (x: number) => activeParsed.evalY!(x, 0, 0, 0, scope);
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
      }
    }

    // 7. Draw Intersections between visible explicit functions
    const explicitFns: { id: string; fn: (x: number) => number }[] = [];
    expressions.forEach((e) => {
      if (!e.visible) return;
      const p = parsedEquations.get(e.id);
      if (p && p.type === 'explicit' && p.evalY) {
        explicitFns.push({ id: e.id, fn: (x: number) => p.evalY!(x, 0, 0, 0, scope) });
      }
    });

    if (explicitFns.length >= 2) {
      for (let i = 0; i < explicitFns.length; i++) {
        for (let j = i + 1; j < explicitFns.length; j++) {
          const inters = findIntersections(explicitFns[i].fn, explicitFns[j].fn, viewport.xMin, viewport.xMax, 200);
          inters.forEach((pt) => {
            const s = worldToScreen(pt.x, pt.y, viewport);
            if (s.x >= 0 && s.x <= viewport.width && s.y >= 0 && s.y <= viewport.height) {
              drawCalculusNode(ctx, s.x, s.y, 'intersection', `(${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})`, theme);
            }
          });
        }
      }
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

    // Proximity search for active curve tracing
    if (!isDragging) {
      let nearestDist = 18; // screen pixels threshold
      let foundTrace: typeof tracedPoint = null;

      expressions.forEach((expr) => {
        if (!expr.visible) return;
        const parsed = parsedEquations.get(expr.id);
        if (!parsed) return;

        if (parsed.type === 'explicit' && parsed.evalY) {
          const curY = parsed.evalY(world.x, 0, 0, 0, scope);
          if (!isNaN(curY) && isFinite(curY)) {
            const screenPt = worldToScreen(world.x, curY, viewport);
            const dist = Math.hypot(screenPt.x - sx, screenPt.y - sy);
            if (dist < nearestDist) {
              nearestDist = dist;
              const slope = numericalDerivative((x) => parsed.evalY!(x, 0, 0, 0, scope), world.x);
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
        }
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
        a.download = `principia_graph_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setSnapshotStatus('downloaded');
        setTimeout(() => setSnapshotStatus(null), 2000);
      });
    } catch {
      // ignore
    }
  };

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

      {/* Floating Top Convenient Viewport Presets Strip */}
      <div className="absolute top-3 left-3 sm:left-4 z-20 flex items-center gap-1 p-1 bg-stone-900/80 hover:bg-stone-900/90 backdrop-blur-md rounded-xl border border-stone-700/60 shadow-lg text-stone-300 text-3xs sm:text-2xs font-medium transition-all">
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
      </div>

      {/* Floating Canvas Navigation Toolbar */}
      <div className="absolute right-3 sm:right-5 bottom-20 md:bottom-6 flex flex-col gap-1.5 p-1 bg-stone-900/85 backdrop-blur-md rounded-xl border border-stone-700/60 shadow-xl z-20 select-none">
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
          title={snapshotStatus === 'copied' ? 'Copied image!' : 'Copy or Download Graph Snapshot'}
          className="w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] sm:min-w-[36px] min-h-[40px] sm:min-h-[36px] flex items-center justify-center p-2 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-90 rounded-lg transition-all"
          aria-label="Snapshot Graph"
        >
          {snapshotStatus ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Camera className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>

      {/* Real-time Cursor Coordinates Readout */}
      {hoverCoord && (
        <div className="absolute left-3 sm:left-4 bottom-20 md:bottom-4 pointer-events-none px-2.5 py-1 bg-stone-900/85 backdrop-blur-md rounded-md border border-stone-700/60 shadow-sm text-2xs sm:text-xs font-mono tabular-nums text-stone-300 flex items-center gap-2 sm:gap-3 z-10">
          <span>X: {hoverCoord.x.toFixed(3)}</span>
          <span className="text-stone-600">|</span>
          <span>Y: {hoverCoord.y.toFixed(3)}</span>
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
