import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  AlgebraicManifold,
  ALGEBRAIC_MANIFOLDS,
  RAYMARCH_VERTEX_SHADER,
  buildRaymarchFragmentShader,
} from '../math/raymarching';
import { ThemeConfig, GraphExpression } from '../types/graph';
import {
  RotateCcw,
  Layers,
  Scissors,
  Maximize2,
  Minimize2,
  Info,
  ChevronRight,
  Sliders,
  Sparkles,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { MathView } from './MathView';

interface RaymarchingCanvasProps {
  theme: ThemeConfig;
  onPlot2DSlice?: (sliceFormula: string, manifoldName: string, sliceZ: number) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const RaymarchingCanvas: React.FC<RaymarchingCanvasProps> = ({
  theme,
  onPlot2DSlice,
  onClose,
  isEmbedded = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Manifold selection & shader state
  const [selectedManifold, setSelectedManifold] = useState<AlgebraicManifold>(ALGEBRAIC_MANIFOLDS[0]);
  const [sliceZ, setSliceZ] = useState<number>(selectedManifold.defaultSlice);
  const [isSliceActive, setIsSliceActive] = useState<boolean>(true);
  const [isSliceClip, setIsSliceClip] = useState<boolean>(false);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  // Camera Orbit State
  const [yaw, setYaw] = useState<number>(0.6);
  const [pitch, setPitch] = useState<number>(0.35);
  const [zoom, setZoom] = useState<number>(selectedManifold.defaultZoom);
  const [pan, setPan] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  const isDraggingRef = useRef(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Uniform locations cache
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});

  // Initialize WebGL context and shaders
  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
    if (!gl) {
      console.error('WebGL is not supported on this device');
      return;
    }
    glRef.current = gl;

    // Compile Vertex Shader
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, RAYMARCH_VERTEX_SHADER);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Raymarch Vertex Shader error:', gl.getShaderInfoLog(vs));
      return;
    }

    // Compile Fragment Shader
    const fsSource = buildRaymarchFragmentShader(selectedManifold, theme.id);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Raymarch Fragment Shader error:', gl.getShaderInfoLog(fs));
      return;
    }

    // Link Program
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Raymarch Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;
    gl.useProgram(program);

    // Setup Quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const quadVertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Cache Uniform Locations
    uniformsRef.current = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      yaw: gl.getUniformLocation(program, 'u_yaw'),
      pitch: gl.getUniformLocation(program, 'u_pitch'),
      zoom: gl.getUniformLocation(program, 'u_zoom'),
      sliceZ: gl.getUniformLocation(program, 'u_sliceZ'),
      sliceActive: gl.getUniformLocation(program, 'u_sliceActive'),
      sliceClip: gl.getUniformLocation(program, 'u_sliceClip'),
      pan: gl.getUniformLocation(program, 'u_pan'),
    };
  }, [selectedManifold, theme.id]);

  useEffect(() => {
    initWebGL();
  }, [initWebGL]);

  // Main Render Loop
  useEffect(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    if (!gl || !canvas) return;

    let startTime = performance.now();

    const render = () => {
      const now = performance.now();
      const elapsed = (now - startTime) * 0.001;

      // Handle resize
      const width = canvas.clientWidth || 300;
      const height = canvas.clientHeight || 300;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      if (programRef.current) {
        gl.useProgram(programRef.current);

        const uniforms = uniformsRef.current;
        if (uniforms.resolution) gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
        if (uniforms.time) gl.uniform1f(uniforms.time, elapsed);

        // Auto-rotation when not dragging
        const effectiveYaw = isAutoRotating ? yaw + elapsed * 0.25 : yaw;
        if (uniforms.yaw) gl.uniform1f(uniforms.yaw, effectiveYaw);
        if (uniforms.pitch) gl.uniform1f(uniforms.pitch, pitch);
        if (uniforms.zoom) gl.uniform1f(uniforms.zoom, zoom);
        if (uniforms.sliceZ) gl.uniform1f(uniforms.sliceZ, sliceZ);
        if (uniforms.sliceActive) gl.uniform1f(uniforms.sliceActive, isSliceActive ? 1.0 : 0.0);
        if (uniforms.sliceClip) gl.uniform1f(uniforms.sliceClip, isSliceClip ? 1.0 : 0.0);
        if (uniforms.pan) gl.uniform3f(uniforms.pan, pan.x, pan.y, pan.z);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [yaw, pitch, zoom, sliceZ, isSliceActive, isSliceClip, isAutoRotating, pan]);

  // Mouse / Touch Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    setIsAutoRotating(false);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setYaw((prev) => prev + dx * 0.008);
    setPitch((prev) => Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, prev + dy * 0.008)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.8, Math.min(10.0, prev + e.deltaY * 0.003)));
  };

  const handleResetCamera = () => {
    setYaw(0.6);
    setPitch(0.35);
    setZoom(selectedManifold.defaultZoom);
    setPan({ x: 0, y: 0, z: 0 });
    setIsAutoRotating(true);
  };

  const handleSelectManifold = (m: AlgebraicManifold) => {
    setSelectedManifold(m);
    setSliceZ(m.defaultSlice);
    setZoom(m.defaultZoom);
  };

  const handlePlotSlice = () => {
    if (!onPlot2DSlice) return;
    const formula = selectedManifold.getSlice2DFormula(sliceZ);
    onPlot2DSlice(formula, selectedManifold.name, sliceZ);
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col overflow-hidden select-none ${
        isEmbedded ? 'rounded-xl border shadow-lg' : ''
      }`}
      style={{
        backgroundColor: theme.bgCanvas,
        color: theme.textPrimary,
        borderColor: theme.border,
      }}
    >
      {/* Top Header & Slicer Bar */}
      <div
        className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 z-20 shrink-0"
        style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="w-4 h-4 text-amber-500 shrink-0 animate-spin-slow" />
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm truncate" style={{ fontFamily: '"Cinzel", serif' }}>
              GPU Manifold Raymarcher: {selectedManifold.name}
            </h3>
            <p className="text-3xs opacity-70 truncate font-mono">
              Degree {selectedManifold.degree} · 60 FPS WebGL Fragment Shader Slicing
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          {onPlot2DSlice && (
            <button
              onClick={handlePlotSlice}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-2xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              title="Project and plot current 2D cross-section directly into Cartesian Plane"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Plot 2D Slice in Canvas</span>
            </button>
          )}

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2.5 py-1.5 rounded-lg border text-2xs font-semibold flex items-center gap-1 transition-colors ${
              isAutoRotating ? 'bg-amber-500/15 border-amber-500/40 text-amber-600' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ borderColor: isAutoRotating ? undefined : theme.border }}
            title="Toggle Orbital Auto-Rotation"
          >
            <RotateCcw className={`w-3 h-3 ${isAutoRotating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Orbit</span>
          </button>

          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
            style={{ borderColor: theme.border }}
            title="Reset Camera Viewport"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowFormulaDetails(!showFormulaDetails)}
            className={`p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
              showFormulaDetails ? 'bg-amber-500/15 text-amber-600' : 'opacity-70'
            }`}
            style={{ borderColor: theme.border }}
            title="View Algebraic Formula & Invariant Context"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 text-rose-500"
              style={{ borderColor: theme.border }}
              title="Close Slicer Panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Interactive Manifold Selector Bar */}
      <div
        className="px-4 py-1.5 border-b flex items-center gap-1.5 overflow-x-auto text-2xs z-20 shrink-0 scrollbar-none"
        style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
      >
        <span className="text-3xs uppercase font-bold tracking-wider opacity-60 mr-1 shrink-0">
          Algebraic Manifold:
        </span>
        {ALGEBRAIC_MANIFOLDS.map((m) => {
          const isSelected = selectedManifold.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleSelectManifold(m)}
              className={`px-2.5 py-1 rounded-md border font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border-amber-500/40 shadow-2xs'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
              }`}
              style={{ borderColor: isSelected ? undefined : theme.border }}
            >
              {m.name}
            </button>
          );
        })}
      </div>

      {/* Main Raymarching Viewport */}
      <div className="flex-1 relative overflow-hidden flex">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />

        {/* Formula & Historical Context Overlay Card */}
        {showFormulaDetails && (
          <div
            className="absolute top-3 left-3 max-w-sm p-4 rounded-xl border shadow-xl z-30 backdrop-blur-md animate-in fade-in duration-150 text-xs space-y-2"
            style={{
              backgroundColor: theme.bgSidebar + 'E6',
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
          >
            <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: theme.border }}>
              <span className="font-bold">{selectedManifold.name}</span>
              <span className="text-3xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                Degree {selectedManifold.degree}
              </span>
            </div>
            <p className="text-2xs opacity-80 leading-relaxed">{selectedManifold.description}</p>
            <div className="p-2 rounded bg-black/5 dark:bg-white/5 font-serif text-center overflow-x-auto text-3xs">
              <MathView math={selectedManifold.formulaLatex} displayMode={true} />
            </div>
            <div className="text-3xs opacity-60 font-mono">
              2D Slice: z = {sliceZ.toFixed(2)} generates an affine Cartesian locus.
            </div>
          </div>
        )}

        {/* Real-Time Slicing Dock (Floating at Bottom of Viewport) */}
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-xl p-3 rounded-2xl border shadow-2xl z-30 backdrop-blur-md flex flex-col gap-2"
          style={{
            backgroundColor: theme.bgSidebar + 'F0',
            borderColor: theme.border,
            color: theme.textPrimary,
          }}
        >
          <div className="flex items-center justify-between text-2xs">
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-bold">Real-Time Slicing Plane:</span>
              <span className="font-mono font-semibold px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-amber-600">
                z = {sliceZ >= 0 ? `+${sliceZ.toFixed(2)}` : sliceZ.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-3xs font-medium">
                <input
                  type="checkbox"
                  checked={isSliceClip}
                  onChange={(e) => setIsSliceClip(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-600 rounded"
                />
                <span>Clip Half</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-3xs font-medium">
                <input
                  type="checkbox"
                  checked={isSliceActive}
                  onChange={(e) => setIsSliceActive(e.target.checked)}
                  className="w-3.5 h-3.5 accent-rose-600 rounded"
                />
                <span>Glow Contour</span>
              </label>
            </div>
          </div>

          {/* Slicing Slider with instant feedback */}
          <div className="flex items-center gap-3">
            <span className="text-3xs font-mono opacity-60">{selectedManifold.sliceRange[0]}</span>
            <input
              type="range"
              min={selectedManifold.sliceRange[0]}
              max={selectedManifold.sliceRange[1]}
              step={0.01}
              value={sliceZ}
              onChange={(e) => {
                setSliceZ(parseFloat(e.target.value));
                setIsAutoRotating(false);
              }}
              className="flex-1 accent-rose-500 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg"
            />
            <span className="text-3xs font-mono opacity-60">{selectedManifold.sliceRange[1]}</span>
          </div>

          {/* 2D Slice Locus Preview & Transfer */}
          <div className="flex items-center justify-between pt-1 border-t text-3xs" style={{ borderColor: theme.border }}>
            <span className="opacity-70 truncate font-mono max-w-[65%]">
              f(x, y, {sliceZ.toFixed(2)}) = 0
            </span>
            {onPlot2DSlice && (
              <button
                onClick={handlePlotSlice}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
              >
                <span>Plot Slice Contour</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
