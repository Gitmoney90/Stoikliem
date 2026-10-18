import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ThemeConfig } from '../types/graph';
import {
  SurfacePreset,
  SURFACE_3D_PRESETS,
  ColormapId,
  ShadingShaderId,
  SurfaceMesh3D,
  generateExplicitSurfaceMesh,
  generateImplicitSurfaceMesh,
  projectWorldToScreen3D,
  computeTangentPlane,
  getColorFromMap,
  Vec3,
} from '../math/surface3d';
import { compile3DExpression } from '../math/evaluator';
import {
  Layers,
  Sparkles,
  Camera,
  Play,
  Pause,
  Rotate3d,
  Sliders,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Scissors,
  TrendingUp,
  Sun,
  Eye,
  Maximize2,
  Minimize2,
  Grid3X3,
  Flame,
  HelpCircle,
  Undo,
} from 'lucide-react';

interface Surface3DCanvasProps {
  theme: ThemeConfig;
  onPlot2DSlice?: (sliceFormula: string) => void;
  onShowToast?: (msg: string) => void;
  onBackToStudio?: () => void;
}

export const Surface3DCanvas: React.FC<Surface3DCanvasProps> = ({
  theme,
  onPlot2DSlice,
  onShowToast,
  onBackToStudio,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Surface Type & Formula
  const [activePreset, setActivePreset] = useState<SurfacePreset>(SURFACE_3D_PRESETS[0]);
  const [surfaceType, setSurfaceType] = useState<'explicit' | 'implicit'>('explicit');
  const [rawFormula, setRawFormula] = useState<string>(SURFACE_3D_PRESETS[0].formula);
  const [formulaError, setFormulaError] = useState<string | null>(null);

  // Domain & Isovalue
  const [xMin, setXMin] = useState<number>(-2.5);
  const [xMax, setXMax] = useState<number>(2.5);
  const [yMin, setYMin] = useState<number>(-2.5);
  const [yMax, setYMax] = useState<number>(2.5);
  const [zMin, setZMin] = useState<number>(-2.5);
  const [zMax, setZMax] = useState<number>(2.5);
  const [isovalue, setIsovalue] = useState<number>(0.0);
  const [resolution, setResolution] = useState<number>(55);

  // Visual Appearance & Lighting Shaders
  const [colormap, setColormap] = useState<ColormapId>('viridis');
  const [shaderMode, setShaderMode] = useState<ShadingShaderId>('phong');
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [wireframeOpacity, setWireframeOpacity] = useState<number>(0.25);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(0.35);
  const [lightAngle, setLightAngle] = useState<number>(45); // degrees around Z
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Calculus Tangent Plane & Slicing
  const [showTangentPlane, setShowTangentPlane] = useState<boolean>(false);
  const [tangentX, setTangentX] = useState<number>(0.8);
  const [tangentY, setTangentY] = useState<number>(0.8);
  const [showSlicePlane, setShowSlicePlane] = useState<boolean>(false);
  const [sliceZ, setSliceZ] = useState<number>(0.0);

  // 3D Orbital Camera
  const [pitch, setPitch] = useState<number>(0.55);
  const [yaw, setYaw] = useState<number>(0.75);
  const [zoom, setZoom] = useState<number>(1.05);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pointer Interaction state
  const isDraggingRef = useRef(false);
  const dragButtonRef = useRef<number>(0);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.05);

  // Compile math function
  const compiledFunction = useMemo(() => {
    try {
      setFormulaError(null);
      let expr = rawFormula.trim();
      if (expr.includes('=')) {
        const parts = expr.split('=');
        if (/^z\s*$/i.test(parts[0])) {
          expr = parts[1];
        } else {
          expr = `(${parts[0]}) - (${parts[1]})`;
        }
      }
      return compile3DExpression(expr);
    } catch (err: any) {
      setFormulaError(err.message || 'Syntax error in 3D equation');
      return null;
    }
  }, [rawFormula]);

  // Compute 3D Mesh
  const meshData: SurfaceMesh3D | null = useMemo(() => {
    if (!compiledFunction) return null;

    try {
      if (surfaceType === 'explicit') {
        const fn = (x: number, y: number) => compiledFunction(x, y, 0);
        return generateExplicitSurfaceMesh(fn, { xMin, xMax, yMin, yMax }, resolution);
      } else {
        const fn = (x: number, y: number, z: number) => compiledFunction(x, y, z);
        const gridRes = Math.min(36, Math.max(18, Math.floor(resolution * 0.52)));
        return generateImplicitSurfaceMesh(
          fn,
          { xMin, xMax, yMin, yMax, zMin, zMax },
          isovalue,
          gridRes
        );
      }
    } catch (err: any) {
      console.error('Mesh generation failed:', err);
      return null;
    }
  }, [compiledFunction, surfaceType, xMin, xMax, yMin, yMax, zMin, zMax, isovalue, resolution]);

  // Tangent Plane Calculation
  const tangentData = useMemo(() => {
    if (!showTangentPlane || !compiledFunction || surfaceType !== 'explicit') return null;
    try {
      const fn = (x: number, y: number) => compiledFunction(x, y, 0);
      return computeTangentPlane(fn, tangentX, tangentY);
    } catch {
      return null;
    }
  }, [showTangentPlane, compiledFunction, surfaceType, tangentX, tangentY]);

  // Render 3D Frame
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    // Clear background
    ctx.fillStyle = theme.bgCanvas;
    ctx.fillRect(0, 0, width, height);

    // Compute dynamic directional light in world coordinates
    const lRad = (lightAngle * Math.PI) / 180;
    const lx = Math.cos(lRad) * 0.707;
    const ly = Math.sin(lRad) * 0.707;
    const lz = 0.707;

    // 1. Draw 3D Bounding Axes Box
    if (showAxes) {
      ctx.save();
      ctx.strokeStyle = theme.gridMinor;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 4]);

      const boxCorners: Vec3[] = [
        { x: xMin, y: yMin, z: zMin },
        { x: xMax, y: yMin, z: zMin },
        { x: xMax, y: yMax, z: zMin },
        { x: xMin, y: yMax, z: zMin },
        { x: xMin, y: yMin, z: zMax },
        { x: xMax, y: yMin, z: zMax },
        { x: xMax, y: yMax, z: zMax },
        { x: xMin, y: yMax, z: zMax },
      ];

      const boxProj = boxCorners.map((c) =>
        projectWorldToScreen3D(c, pitch, yaw, zoom, pan, width, height)
      );

      const boxEdges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];

      boxEdges.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(boxProj[i].sx, boxProj[i].sy);
        ctx.lineTo(boxProj[j].sx, boxProj[j].sy);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Draw Main Coordinate Axes X, Y, Z from Origin (0, 0, 0)
      const originProj = projectWorldToScreen3D({ x: 0, y: 0, z: 0 }, pitch, yaw, zoom, pan, width, height);
      const axisLen = Math.max(xMax, yMax, zMax);

      const xProj = projectWorldToScreen3D({ x: axisLen, y: 0, z: 0 }, pitch, yaw, zoom, pan, width, height);
      const yProj = projectWorldToScreen3D({ x: 0, y: axisLen, z: 0 }, pitch, yaw, zoom, pan, width, height);
      const zProj = projectWorldToScreen3D({ x: 0, y: 0, z: axisLen }, pitch, yaw, zoom, pan, width, height);

      // X Axis: Crimson Red
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(originProj.sx, originProj.sy);
      ctx.lineTo(xProj.sx, xProj.sy);
      ctx.stroke();

      // Y Axis: Emerald Green
      ctx.strokeStyle = '#10B981';
      ctx.beginPath();
      ctx.moveTo(originProj.sx, originProj.sy);
      ctx.lineTo(yProj.sx, yProj.sy);
      ctx.stroke();

      // Z Axis: Royal Blue
      ctx.strokeStyle = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(originProj.sx, originProj.sy);
      ctx.lineTo(zProj.sx, zProj.sy);
      ctx.stroke();

      // Axis Labels
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#EF4444';
      ctx.fillText('+X', xProj.sx + 4, xProj.sy);
      ctx.fillStyle = '#10B981';
      ctx.fillText('+Y', yProj.sx + 4, yProj.sy);
      ctx.fillStyle = '#3B82F6';
      ctx.fillText('+Z', zProj.sx + 4, zProj.sy);

      ctx.restore();
    }

    // 2. Render Surface Mesh (Depth Sorted via Painter's Algorithm)
    if (meshData && meshData.triangles.length > 0) {
      const { triangles, minVal, maxVal } = meshData;
      const valSpan = Math.max(1e-4, maxVal - minVal);

      interface ProjectedTri {
        p0: { sx: number; sy: number; depth: number };
        p1: { sx: number; sy: number; depth: number };
        p2: { sx: number; sy: number; depth: number };
        avgDepth: number;
        color: [number, number, number];
        shade: number;
        contourFactor: number;
      }

      const projectedTris: ProjectedTri[] = [];

      triangles.forEach((tri) => {
        const s0 = projectWorldToScreen3D(tri.p0, pitch, yaw, zoom, pan, width, height);
        const s1 = projectWorldToScreen3D(tri.p1, pitch, yaw, zoom, pan, width, height);
        const s2 = projectWorldToScreen3D(tri.p2, pitch, yaw, zoom, pan, width, height);

        const avgDepth = (s0.depth + s1.depth + s2.depth) / 3.0;

        // Normal lighting calculation
        const avgNx = (tri.n0.x + tri.n1.x + tri.n2.x) / 3.0;
        const avgNy = (tri.n0.y + tri.n1.y + tri.n2.y) / 3.0;
        const avgNz = (tri.n0.z + tri.n1.z + tri.n2.z) / 3.0;
        const nLen = Math.hypot(avgNx, avgNy, avgNz) || 1;
        const nx = avgNx / nLen;
        const ny = avgNy / nLen;
        const nz = avgNz / nLen;

        const dot = nx * lx + ny * ly + nz * lz;
        let shade = 1.0;
        let contourFactor = 1.0;

        // Shading Modes
        if (shaderMode === 'phong') {
          // Blinn-Phong Metallic lighting
          const diffuse = Math.max(0.18, Math.abs(dot) * 0.82);
          const specular = Math.pow(Math.max(0, dot), 22) * 0.35;
          shade = Math.min(1.0, diffuse + specular);
        } else if (shaderMode === 'iridescent') {
          // Iridescent normal map MatCap style
          const fresnel = 1.0 - Math.abs(nz);
          shade = 0.5 + 0.5 * Math.abs(dot) + 0.3 * Math.pow(fresnel, 2);
        } else if (shaderMode === 'contour_stripes') {
          // Zebra contour striations
          const diffuse = Math.max(0.2, Math.abs(dot) * 0.8);
          const avgZ = (tri.val0 + tri.val1 + tri.val2) / 3.0;
          const bandFrac = Math.abs((avgZ * 3.5) % 1.0);
          contourFactor = bandFrac < 0.12 ? 0.45 : 1.0;
          shade = diffuse * contourFactor;
        } else if (shaderMode === 'curvature') {
          // Curvature / slope highlight
          const slope = Math.hypot(nx, ny);
          shade = 0.3 + 0.7 * Math.min(1.0, slope * 1.5);
        }

        // Height-map colormap lookup
        const avgVal = (tri.val0 + tri.val1 + tri.val2) / 3.0;
        const tNorm = (avgVal - minVal) / valSpan;
        const rgb = getColorFromMap(tNorm, colormap);

        projectedTris.push({
          p0: s0,
          p1: s1,
          p2: s2,
          avgDepth,
          color: rgb,
          shade,
          contourFactor,
        });
      });

      // Sort from back to front
      projectedTris.sort((a, b) => a.avgDepth - b.avgDepth);

      ctx.save();
      projectedTris.forEach((tri) => {
        const r = Math.floor(Math.min(255, tri.color[0] * tri.shade * 255));
        const g = Math.floor(Math.min(255, tri.color[1] * tri.shade * 255));
        const b = Math.floor(Math.min(255, tri.color[2] * tri.shade * 255));

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.moveTo(tri.p0.sx, tri.p0.sy);
        ctx.lineTo(tri.p1.sx, tri.p1.sy);
        ctx.lineTo(tri.p2.sx, tri.p2.sy);
        ctx.closePath();
        ctx.fill();

        if (showWireframe) {
          ctx.strokeStyle = `rgba(0, 0, 0, ${wireframeOpacity})`;
          ctx.lineWidth = 0.45;
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // 3. Render 3D Slicing Plane & Highlight
    if (showSlicePlane) {
      ctx.save();
      const pSliceCorners: Vec3[] = [
        { x: xMin, y: yMin, z: sliceZ },
        { x: xMax, y: yMin, z: sliceZ },
        { x: xMax, y: yMax, z: sliceZ },
        { x: xMin, y: yMax, z: sliceZ },
      ];
      const projSlice = pSliceCorners.map((c) =>
        projectWorldToScreen3D(c, pitch, yaw, zoom, pan, width, height)
      );

      ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.moveTo(projSlice[0].sx, projSlice[0].sy);
      ctx.lineTo(projSlice[1].sx, projSlice[1].sy);
      ctx.lineTo(projSlice[2].sx, projSlice[2].sy);
      ctx.lineTo(projSlice[3].sx, projSlice[3].sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10B981';
      ctx.fillText(`Slice: z = ${sliceZ.toFixed(2)}`, projSlice[1].sx + 6, projSlice[1].sy);
      ctx.restore();
    }

    // 4. Render Tangent Plane Calculus Patch
    if (showTangentPlane && tangentData) {
      ctx.save();
      const projTangent = tangentData.points.map((p) =>
        projectWorldToScreen3D(p, pitch, yaw, zoom, pan, width, height)
      );
      const point0 = projectWorldToScreen3D(
        { x: tangentX, y: tangentY, z: tangentData.z0 },
        pitch,
        yaw,
        zoom,
        pan,
        width,
        height
      );

      // Tangent Plane Quad
      ctx.fillStyle = 'rgba(245, 158, 11, 0.32)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.moveTo(projTangent[0].sx, projTangent[0].sy);
      ctx.lineTo(projTangent[1].sx, projTangent[1].sy);
      ctx.lineTo(projTangent[2].sx, projTangent[2].sy);
      ctx.lineTo(projTangent[3].sx, projTangent[3].sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Point of tangency node
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(point0.sx, point0.sy, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillStyle = theme.textPrimary;
      ctx.fillText(
        `P(${tangentX.toFixed(1)}, ${tangentY.toFixed(1)}, ${tangentData.z0.toFixed(2)})`,
        point0.sx + 8,
        point0.sy - 8
      );
      ctx.restore();
    }

    // HUD Info Overlay
    ctx.save();
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.textSecondary;
    ctx.textAlign = 'left';
    ctx.fillText(
      `Pitch: ${(pitch * (180 / Math.PI)).toFixed(0)}°  Yaw: ${(yaw * (180 / Math.PI)).toFixed(0)}°  Zoom: ${zoom.toFixed(2)}x`,
      16,
      height - 16
    );
    ctx.restore();
  }, [
    theme,
    meshData,
    showAxes,
    showWireframe,
    wireframeOpacity,
    colormap,
    shaderMode,
    lightAngle,
    showSlicePlane,
    sliceZ,
    showTangentPlane,
    tangentData,
    tangentX,
    tangentY,
    pitch,
    yaw,
    zoom,
    pan,
    xMin,
    xMax,
    yMin,
    yMax,
    zMin,
    zMax,
  ]);

  // Resize Listener
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      renderFrame();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderFrame]);

  // Turntable Auto-Rotation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (isAutoRotating && !isDraggingRef.current) {
        setYaw((prev) => (prev + autoRotateSpeed * dt) % (2 * Math.PI));
      }

      renderFrame();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoRotating, autoRotateSpeed, renderFrame]);

  // Pointer Interaction Handlers with Touch Pinch Zoom
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragButtonRef.current = e.button;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (e.shiftKey || dragButtonRef.current === 2) {
      // Pan translation
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else {
      // 3D Orbital rotation
      setYaw((prev) => prev + dx * 0.008);
      setPitch((prev) => Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, prev - dy * 0.008)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    setZoom((prev) => Math.max(0.3, Math.min(4.0, prev + zoomDelta)));
  };

  // Touch handlers for mobile pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / touchStartDistRef.current;
      setZoom(Math.max(0.3, Math.min(4.0, initialZoomRef.current * scale)));
    }
  };

  // Preset Selection
  const handleSelectPreset = (p: SurfacePreset) => {
    setActivePreset(p);
    setSurfaceType(p.type);
    setRawFormula(p.formula);
    setXMin(p.defaultDomain.xMin);
    setXMax(p.defaultDomain.xMax);
    setYMin(p.defaultDomain.yMin);
    setYMax(p.defaultDomain.yMax);
    if (p.defaultDomain.zMin !== undefined) setZMin(p.defaultDomain.zMin);
    if (p.defaultDomain.zMax !== undefined) setZMax(p.defaultDomain.zMax);
    if (p.isovalue !== undefined) setIsovalue(p.isovalue);
    setColormap(p.defaultColormap);
    if (p.defaultShader) setShaderMode(p.defaultShader);
    onShowToast?.(`Loaded 3D Preset: ${p.name}`);
  };

  // Snapshot PNG Export
  const handleTakeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `stoikliem_3d_surface_${Date.now()}.png`;
      a.click();
      onShowToast?.('Exported High-Resolution 3D Surface PNG');
    } catch {
      onShowToast?.('Failed to capture snapshot');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative select-none">
      {/* Main 3D Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative h-full w-full overflow-hidden touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Top Floating Controls Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10 flex-wrap">
          {/* Surface Type Mode Switcher */}
          <div
            className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-xl border shadow-xl backdrop-blur-md"
            style={{
              backgroundColor: theme.bgCard + 'ee',
              borderColor: theme.border,
            }}
          >
            <button
              onClick={() => {
                setSurfaceType('explicit');
                if (surfaceType !== 'explicit') {
                  setRawFormula('x^2 - y^2');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                surfaceType === 'explicit'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/40 shadow-xs'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
              }`}
            >
              <Rotate3d className="w-3.5 h-3.5 text-amber-500" />
              <span>Explicit Surface z = f(x, y)</span>
            </button>

            <button
              onClick={() => {
                setSurfaceType('implicit');
                if (surfaceType !== 'implicit') {
                  setRawFormula('x^2 + y^2 - z^2 - 1 = 0');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                surfaceType === 'implicit'
                  ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-500/40 shadow-xs'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Implicit Contour F(x, y, z) = 0</span>
            </button>
          </div>

          {/* Quick Actions (Play/Pause, Snapshot, Sidebar Toggle, Back to Studio) */}
          <div
            className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-xl border shadow-xl backdrop-blur-md"
            style={{
              backgroundColor: theme.bgCard + 'ee',
              borderColor: theme.border,
            }}
          >
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              title={isAutoRotating ? 'Pause Turntable' : 'Resume Turntable'}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs flex items-center gap-1 font-medium"
              style={{ color: theme.textPrimary }}
            >
              {isAutoRotating ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
            </button>

            <button
              onClick={handleTakeSnapshot}
              title="Export High-Resolution 3D Surface (PNG)"
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs"
              style={{ color: theme.textPrimary }}
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? 'Hide Parameters Panel' : 'Show Parameters Panel'}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs"
              style={{ color: theme.textPrimary }}
            >
              <Sliders className="w-4 h-4" />
            </button>

            {onBackToStudio && (
              <button
                onClick={onBackToStudio}
                title="Return to 2D Graph Studio"
                className="px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs font-semibold border border-transparent hover:border-black/10 dark:hover:border-white/10"
                style={{ color: theme.textSecondary }}
              >
                2D Studio
              </button>
            )}
          </div>
        </div>

        {/* Bottom Floating Presets Bar */}
        <div className="absolute bottom-9 left-3 right-3 flex items-center justify-center gap-1.5 overflow-x-auto pointer-events-none z-10 pb-1">
          <div
            className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl border shadow-2xl backdrop-blur-md max-w-full overflow-x-auto no-scrollbar"
            style={{
              backgroundColor: theme.bgCard + 'fa',
              borderColor: theme.border,
            }}
          >
            <span
              className="text-3xs font-mono font-bold uppercase tracking-wider px-2 opacity-60 shrink-0"
              style={{ color: theme.textSecondary }}
            >
              Presets:
            </span>

            {SURFACE_3D_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`px-2.5 py-1 text-2xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  activePreset.id === preset.id
                    ? 'font-bold bg-amber-500 text-stone-900 shadow-xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                }`}
                style={{ color: activePreset.id === preset.id ? undefined : theme.textPrimary }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Floating Hint */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-3xs font-mono opacity-50 px-3 py-0.5 rounded-full"
          style={{ color: theme.textSecondary, backgroundColor: theme.bgCard + '88' }}
        >
          Drag: Orbit • Shift+Drag: Pan • Pinch/Scroll: Zoom
        </div>
      </div>

      {/* Right Multivariable Controls Sidebar */}
      {isSidebarOpen && (
        <div
          className="w-full md:w-80 lg:w-96 border-l flex flex-col shrink-0 overflow-y-auto max-h-[48vh] md:max-h-full transition-all"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
            color: theme.textPrimary,
          }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm tracking-tight" style={{ fontFamily: '"Cinzel", serif' }}>
                3D Surface Parameters
              </h3>
            </div>
            <button
              onClick={() => {
                setPitch(0.55);
                setYaw(0.75);
                setZoom(1.05);
                setPan({ x: 0, y: 0 });
              }}
              className="text-2xs font-mono underline opacity-70 hover:opacity-100 flex items-center gap-1"
            >
              <Undo className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="p-4 flex flex-col gap-5 text-xs">
            {/* Equation Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider opacity-70" style={{ color: theme.textSecondary }}>
                <span>{surfaceType === 'explicit' ? 'Surface Equation z = f(x, y)' : 'Implicit Field F(x, y, z) = 0'}</span>
              </div>
              <div
                className="p-2.5 rounded-xl border flex items-center gap-2 font-mono shadow-xs"
                style={{ backgroundColor: theme.bgCard, borderColor: formulaError ? '#EF4444' : theme.border }}
              >
                <span className="font-serif italic font-bold opacity-60">
                  {surfaceType === 'explicit' ? 'z =' : 'F ='}
                </span>
                <input
                  type="text"
                  value={rawFormula}
                  onChange={(e) => setRawFormula(e.target.value)}
                  placeholder={surfaceType === 'explicit' ? 'x^2 - y^2' : 'x^2 + y^2 - z^2 - 1 = 0'}
                  className="w-full bg-transparent border-0 outline-none text-xs font-mono font-medium focus:ring-0"
                  style={{ color: theme.textPrimary }}
                />
              </div>
              {formulaError ? (
                <span className="text-3xs text-rose-500 font-mono">{formulaError}</span>
              ) : (
                <p className="text-3xs opacity-60 font-sans leading-relaxed">
                  {activePreset.description}
                </p>
              )}
            </div>

            {/* Implicit Level-Set Slider (When Implicit Mode) */}
            {surfaceType === 'implicit' && (
              <div className="p-3 rounded-xl border flex flex-col gap-2 bg-indigo-500/5 border-indigo-500/30">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">
                    Level Set Isovalue (c):
                  </span>
                  <span className="font-mono font-bold text-xs">{isovalue.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.05"
                  value={isovalue}
                  onChange={(e) => setIsovalue(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="text-3xs opacity-60 font-mono">
                  Extracts 3D isosurface F(x, y, z) = {isovalue.toFixed(2)} via Kuhn 6-Tetrahedra.
                </span>
              </div>
            )}

            {/* Lighting Shaders */}
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-2xs uppercase tracking-wider opacity-70" style={{ color: theme.textSecondary }}>
                Lighting & Shading Shader
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'phong', label: 'Blinn-Phong Metallic' },
                  { id: 'iridescent', label: 'Iridescent Curvature' },
                  { id: 'contour_stripes', label: 'Zebra Contour Rings' },
                  { id: 'curvature', label: 'Slope Contrast' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setShaderMode(s.id as ShadingShaderId)}
                    className={`p-2 rounded-lg border text-center transition-all text-2xs ${
                      shaderMode === s.id
                        ? 'font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-xs'
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Light Angle Slider */}
              <div className="flex items-center justify-between text-3xs font-mono pt-1">
                <span className="flex items-center gap-1 opacity-70">
                  <Sun className="w-3 h-3 text-amber-500" /> Light Azimuth:
                </span>
                <span>{lightAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={lightAngle}
                onChange={(e) => setLightAngle(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Height-Map Colormap Selector */}
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-2xs uppercase tracking-wider opacity-70" style={{ color: theme.textSecondary }}>
                Height-Map Colormap
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'viridis', label: 'Viridis' },
                  { id: 'spectral', label: 'Spectral' },
                  { id: 'magma', label: 'Magma' },
                  { id: 'coolwarm', label: 'Coolwarm' },
                  { id: 'academic', label: 'Academic' },
                  { id: 'ocean', label: 'Ocean' },
                  { id: 'topographic', label: 'Topographic' },
                  { id: 'plasma', label: 'Plasma' },
                  { id: 'neon', label: 'Neon' },
                ].map((map) => (
                  <button
                    key={map.id}
                    onClick={() => setColormap(map.id as ColormapId)}
                    className={`p-1.5 rounded-lg border text-center transition-all text-3xs ${
                      colormap === map.id
                        ? 'font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-xs'
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                    }`}
                  >
                    {map.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Domain & Resolution */}
            <div className="flex flex-col gap-2.5">
              <span className="font-semibold text-2xs uppercase tracking-wider opacity-70" style={{ color: theme.textSecondary }}>
                Domain & Resolution
              </span>
              <div className="grid grid-cols-2 gap-2 text-2xs font-mono">
                <div className="flex flex-col gap-1">
                  <span className="opacity-70">X Domain:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={xMin}
                      onChange={(e) => setXMin(parseFloat(e.target.value))}
                      className="w-16 px-1.5 py-0.5 rounded border bg-transparent text-right"
                      style={{ borderColor: theme.border }}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={xMax}
                      onChange={(e) => setXMax(parseFloat(e.target.value))}
                      className="w-16 px-1.5 py-0.5 rounded border bg-transparent text-right"
                      style={{ borderColor: theme.border }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="opacity-70">Y Domain:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={yMin}
                      onChange={(e) => setYMin(parseFloat(e.target.value))}
                      className="w-16 px-1.5 py-0.5 rounded border bg-transparent text-right"
                      style={{ borderColor: theme.border }}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={yMax}
                      onChange={(e) => setYMax(parseFloat(e.target.value))}
                      className="w-16 px-1.5 py-0.5 rounded border bg-transparent text-right"
                      style={{ borderColor: theme.border }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-1 font-mono text-3xs">
                <div className="flex justify-between">
                  <span>Mesh Grid Density</span>
                  <span>{resolution} × {resolution}</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="85"
                  step="5"
                  value={resolution}
                  onChange={(e) => setResolution(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* Calculus Tangent Plane Tool (Explicit Surfaces) */}
            {surfaceType === 'explicit' && (
              <div className="p-3 rounded-xl border flex flex-col gap-2.5 bg-amber-500/5 border-amber-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Tangent Plane Calculus</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showTangentPlane}
                    onChange={(e) => setShowTangentPlane(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                </div>

                {showTangentPlane && tangentData && (
                  <div className="flex flex-col gap-2 text-2xs font-mono">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-70 text-3xs">Point X:</span>
                        <input
                          type="range"
                          min={xMin}
                          max={xMax}
                          step="0.1"
                          value={tangentX}
                          onChange={(e) => setTangentX(parseFloat(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>
                      <div>
                        <span className="opacity-70 text-3xs">Point Y:</span>
                        <input
                          type="range"
                          min={yMin}
                          max={yMax}
                          step="0.1"
                          value={tangentY}
                          onChange={(e) => setTangentY(parseFloat(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/5 dark:bg-white/5 space-y-1">
                      <div>∂f/∂x = {tangentData.dfdx.toFixed(3)}</div>
                      <div>∂f/∂y = {tangentData.dfdy.toFixed(3)}</div>
                      <div className="text-3xs text-amber-600 dark:text-amber-400 font-bold truncate">
                        {tangentData.planeEquation}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2D Slicing Plane Tool */}
            <div className="p-3 rounded-xl border flex flex-col gap-2.5 bg-emerald-500/5 border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>2D Slicing Plane (z = c)</span>
                </div>
                <input
                  type="checkbox"
                  checked={showSlicePlane}
                  onChange={(e) => setShowSlicePlane(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
              </div>

              {showSlicePlane && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-2xs font-mono">
                    <span>Cutting Height (z):</span>
                    <span>{sliceZ.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={zMin}
                    max={zMax}
                    step="0.05"
                    value={sliceZ}
                    onChange={(e) => setSliceZ(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />

                  {onPlot2DSlice && (
                    <button
                      onClick={() => {
                        const sliceFormula =
                          surfaceType === 'explicit'
                            ? `(${rawFormula}) - (${sliceZ.toFixed(2)}) = 0`
                            : rawFormula.replace(/\bz\b/g, `(${sliceZ.toFixed(2)})`);
                        onPlot2DSlice(sliceFormula);
                        onShowToast?.(`Sent 2D contour slice '${sliceFormula}' to Graph Studio!`);
                        onBackToStudio?.();
                      }}
                      className="mt-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-2xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Send 2D Slice to Graph Studio</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Display Toggles */}
            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: theme.border }}>
              <span className="font-semibold text-2xs uppercase tracking-wider opacity-70" style={{ color: theme.textSecondary }}>
                Display Toggles
              </span>
              <div className="flex items-center justify-between text-2xs">
                <span>Show Wireframe Grid</span>
                <input
                  type="checkbox"
                  checked={showWireframe}
                  onChange={(e) => setShowWireframe(e.target.checked)}
                  className="accent-amber-500 rounded"
                />
              </div>
              {showWireframe && (
                <div className="flex items-center justify-between text-3xs font-mono">
                  <span>Wireframe Opacity</span>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={wireframeOpacity}
                    onChange={(e) => setWireframeOpacity(parseFloat(e.target.value))}
                    className="w-24 accent-amber-500"
                  />
                </div>
              )}
              <div className="flex items-center justify-between text-2xs">
                <span>Show 3D Coordinate Axes</span>
                <input
                  type="checkbox"
                  checked={showAxes}
                  onChange={(e) => setShowAxes(e.target.checked)}
                  className="accent-amber-500 rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
