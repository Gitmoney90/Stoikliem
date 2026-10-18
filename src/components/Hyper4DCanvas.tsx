import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ThemeConfig } from '../types/graph';
import {
  Hyper4DState,
  DEFAULT_HYPER4D_STATE,
  rotate4D,
  project4Dto3D,
  project3Dto2D,
  createTesseract,
  computeHyperplaneSlice,
  computeDaliNetPositions,
  generateHopfFibration,
  generateHypersphereMeridians,
  Vec4,
  Vec3,
} from '../math/hyper4d';
import {
  Box,
  Circle,
  Rotate3d,
  Layers,
  Sparkles,
  HelpCircle,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  Undo,
  Camera,
  ChevronDown,
  ChevronUp,
  Sliders,
  Eye,
  RefreshCw,
  Share2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface Hyper4DCanvasProps {
  theme: ThemeConfig;
  onPlot2DSlice?: (rawText: string) => void;
  onShowToast?: (msg: string) => void;
  onBackToStudio?: () => void;
}

export const Hyper4DCanvas: React.FC<Hyper4DCanvasProps> = ({
  theme,
  onPlot2DSlice,
  onShowToast,
  onBackToStudio,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [state, setState] = useState<Hyper4DState>(DEFAULT_HYPER4D_STATE);
  // High-performance animation ref (60-120fps stutter-free without React re-renders)
  const animStateRef = useRef<Hyper4DState>({
    ...DEFAULT_HYPER4D_STATE,
    camZoom: 1.15,
  });

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activePreset, setActivePreset] = useState<string>('classic_tesseract');

  // Mouse drag tracking for 3D/4D orbital rotations
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'3d_orbit' | '4d_rot'>('3d_orbit');
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.15);

  // Geometry cache
  const tesseractData = useRef(createTesseract()).current;

  // Render loop
  const renderFrame = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.floor(width * dpr);
    const targetH = Math.floor(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const s = animStateRef.current;

    // Clear background
    ctx.fillStyle = theme.bgCanvas;
    ctx.fillRect(0, 0, width, height);

    // Subtle 4D ambient grid backdrop
    ctx.save();
    ctx.strokeStyle = theme.gridMinor;
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // ==========================================
    // Render Tesseract (HyperCube / 8-Cell)
    // ==========================================
    if (s.shape === 'tesseract') {
      if (s.mode === 'unfolding' && s.unfoldProgress > 0) {
        // Render Dalí Net 3D Unfolded Latin Cross
        const netCubes = computeDaliNetPositions(s.unfoldProgress);
        netCubes.forEach((cube) => {
          // Render a wireframe 3D cube at cube.center
          const size = 0.9;
          const cubeVerts: Vec3[] = [
            { x: cube.center.x - size, y: cube.center.y - size, z: cube.center.z - size },
            { x: cube.center.x + size, y: cube.center.y - size, z: cube.center.z - size },
            { x: cube.center.x + size, y: cube.center.y + size, z: cube.center.z - size },
            { x: cube.center.x - size, y: cube.center.y + size, z: cube.center.z - size },
            { x: cube.center.x - size, y: cube.center.y - size, z: cube.center.z + size },
            { x: cube.center.x + size, y: cube.center.y - size, z: cube.center.z + size },
            { x: cube.center.x + size, y: cube.center.y + size, z: cube.center.z + size },
            { x: cube.center.x - size, y: cube.center.y + size, z: cube.center.z + size },
          ];

          const cubeEdges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7],
          ];

          const proj = cubeVerts.map((v) =>
            project3Dto2D(v, s.camPitch, s.camYaw, s.camZoom * 0.7, width, height)
          );

          ctx.save();
          ctx.strokeStyle = cube.color;
          ctx.lineWidth = 1.6;
          cubeEdges.forEach(([i, j]) => {
            ctx.beginPath();
            ctx.moveTo(proj[i].sx, proj[i].sy);
            ctx.lineTo(proj[j].sx, proj[j].sy);
            ctx.stroke();
          });

          // Draw cube name tag
          const centerProj = project3Dto2D(cube.center, s.camPitch, s.camYaw, s.camZoom * 0.7, width, height);
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillStyle = cube.color;
          ctx.textAlign = 'center';
          ctx.fillText(cube.name, centerProj.sx, centerProj.sy - 8);
          ctx.restore();
        });
      } else {
        // Standard 4D rotated & projected Tesseract
        const rotated4D = tesseractData.vertices.map((v) => rotate4D(v, s));
        const projected3D = rotated4D.map((v) => project4Dto3D(v, s.projection));
        const projected2D = projected3D.map((v) =>
          project3Dto2D(v, s.camPitch, s.camYaw, s.camZoom, width, height)
        );

        // 1. Shaded 8 Hypercells
        if (s.showFaces) {
          tesseractData.cells.forEach((cell) => {
            // Find faces belonging to this cell
            // Approximate shaded fill using projected 2D coordinates
            ctx.save();
            ctx.fillStyle = cell.color;
            ctx.globalAlpha = s.cellOpacity;

            // Draw bounding polygons
            for (let fIdx = 0; fIdx < tesseractData.faces.length; fIdx += 3) {
              const face = tesseractData.faces[fIdx];
              const p0 = projected2D[face.indices[0]];
              const p1 = projected2D[face.indices[1]];
              const p2 = projected2D[face.indices[2]];
              const p3 = projected2D[face.indices[3]];

              ctx.beginPath();
              ctx.moveTo(p0.sx, p0.sy);
              ctx.lineTo(p1.sx, p1.sy);
              ctx.lineTo(p2.sx, p2.sy);
              ctx.lineTo(p3.sx, p3.sy);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          });
        }

        // 2. 32 4D Wireframe Edges with Depth Shading
        if (s.showEdges) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          tesseractData.edges.forEach((edge) => {
            const p1 = projected2D[edge.i];
            const p2 = projected2D[edge.j];
            const v1_4d = rotated4D[edge.i];
            const v2_4d = rotated4D[edge.j];

            // 4th dimension depth coloring: inner cube (w < 0) vs outer cube (w > 0)
            const avgW = (v1_4d.w + v2_4d.w) * 0.5;
            const avgDepth = (p1.depth + p2.depth) * 0.5;

            // Gradient: cyan for w < 0 (inner hyper-depth), amber/gold for w > 0 (outer hyper-depth)
            const alpha = Math.max(0.25, Math.min(1.0, 0.65 + avgDepth * 0.12));
            const isInner = avgW < -0.2;
            const isOuter = avgW > 0.2;
            const strokeColor = isInner
              ? `rgba(6, 182, 212, ${alpha})`
              : isOuter
              ? `rgba(245, 158, 11, ${alpha})`
              : `rgba(147, 51, 234, ${alpha})`;

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = s.lineWidth * (isOuter ? 1.25 : 1.0);

            ctx.beginPath();
            ctx.moveTo(p1.sx, p1.sy);
            ctx.lineTo(p2.sx, p2.sy);
            ctx.stroke();
          });
          ctx.restore();
        }

        // 3. Hyperplane Slicing Cross-Section
        if (s.mode === 'slice') {
          const sliceResult = computeHyperplaneSlice(rotated4D, tesseractData.edges, s.sliceW);
          const sliceProj = sliceResult.lines.map((l) => ({
            p1: project3Dto2D(l.p1, s.camPitch, s.camYaw, s.camZoom, width, height),
            p2: project3Dto2D(l.p2, s.camPitch, s.camYaw, s.camZoom, width, height),
          }));

          // Render Slicing Solid in Neon Emerald
          ctx.save();
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 3.2;
          ctx.shadowColor = '#10B981';
          ctx.shadowBlur = 10;

          sliceProj.forEach(({ p1, p2 }) => {
            ctx.beginPath();
            ctx.moveTo(p1.sx, p1.sy);
            ctx.lineTo(p2.sx, p2.sy);
            ctx.stroke();
          });

          // Draw slice intersection nodes
          sliceResult.intersectionPoints.forEach((pt) => {
            const p2d = project3Dto2D(pt, s.camPitch, s.camYaw, s.camZoom, width, height);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(p2d.sx, p2d.sy, 4.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });
          ctx.restore();
        }

        // 4. 16 Vertices
        if (s.showVertices) {
          ctx.save();
          projected2D.forEach((p, idx) => {
            const v4 = rotated4D[idx];
            const isInner = v4.w < 0;
            const radius = isInner ? 3.5 : 5.0;

            ctx.fillStyle = isInner ? '#06B6D4' : '#F59E0B';
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Coordinate label
            if (s.showCoordinates) {
              ctx.font = '9px "JetBrains Mono", monospace';
              ctx.fillStyle = theme.textSecondary;
              ctx.textAlign = 'left';
              const sign = (val: number) => (val > 0 ? '+' : '-');
              ctx.fillText(
                `(${sign(v4.x)},${sign(v4.y)},${sign(v4.z)},${sign(v4.w)})`,
                p.sx + 7,
                p.sy + 3
              );
            }
          });
          ctx.restore();
        }
      }
    }

    // ==========================================
    // Render Hypersphere (4D 3-Sphere / S³)
    // ==========================================
    if (s.shape === 'hypersphere') {
      if (s.mode === 'hopf') {
        // Render Hopf Fibration Rings
        const fibers = generateHopfFibration(s.hopfFibers, s.hopfLatitudes, 40);

        ctx.save();
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';

        fibers.forEach((fiber) => {
          const rotPoints = fiber.points.map((v) => rotate4D(v, s));
          const proj3D = rotPoints.map((v) => project4Dto3D(v, 'stereographic'));
          const proj2D = proj3D.map((v) =>
            project3Dto2D(v, s.camPitch, s.camYaw, s.camZoom * 0.85, width, height)
          );

          ctx.strokeStyle = fiber.color;
          ctx.beginPath();
          proj2D.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          });
          ctx.closePath();
          ctx.stroke();
        });
        ctx.restore();
      } else if (s.mode === 'slice') {
        // Render 3D Slicing of Hypersphere S³
        // Slicing x² + y² + z² + w² = 1 with w = sliceW yields a 3D sphere of radius r = sqrt(1 - w²)
        const r2 = 1.0 - s.sliceW * s.sliceW;
        if (r2 > 0) {
          const r = Math.sqrt(r2);
          const rings = 14;
          const ptsPerRing = 32;

          ctx.save();
          ctx.strokeStyle = '#06B6D4';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#06B6D4';
          ctx.shadowBlur = 8;

          // Latitudinal circles
          for (let i = 1; i < rings; i++) {
            const phi = (i / rings) * Math.PI;
            const ringR = r * Math.sin(phi);
            const ringZ = r * Math.cos(phi);

            ctx.beginPath();
            for (let j = 0; j <= ptsPerRing; j++) {
              const th = (j / ptsPerRing) * 2 * Math.PI;
              const pt3: Vec3 = {
                x: ringR * Math.cos(th),
                y: ringR * Math.sin(th),
                z: ringZ,
              };
              const p2 = project3Dto2D(pt3, s.camPitch, s.camYaw, s.camZoom * 1.5, width, height);
              if (j === 0) ctx.moveTo(p2.sx, p2.sy);
              else ctx.lineTo(p2.sx, p2.sy);
            }
            ctx.stroke();
          }

          // Equatorial Ring
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          for (let j = 0; j <= ptsPerRing; j++) {
            const th = (j / ptsPerRing) * 2 * Math.PI;
            const pt3: Vec3 = {
              x: r * Math.cos(th),
              y: r * Math.sin(th),
              z: 0,
            };
            const p2 = project3Dto2D(pt3, s.camPitch, s.camYaw, s.camZoom * 1.5, width, height);
            if (j === 0) ctx.moveTo(p2.sx, p2.sy);
            else ctx.lineTo(p2.sx, p2.sy);
          }
          ctx.stroke();

          ctx.restore();
        } else {
          // Empty slice
          ctx.font = '12px "JetBrains Mono", monospace';
          ctx.fillStyle = theme.textMuted;
          ctx.textAlign = 'center';
          ctx.fillText(`Hyperplane w = ${s.sliceW.toFixed(2)} outside S³ unit radius (|w| > 1)`, width * 0.5, height * 0.5);
        }
      } else {
        // Wireframe Great Circles of S³
        const meridians = generateHypersphereMeridians(16, 48);

        ctx.save();
        ctx.lineWidth = 1.8;
        meridians.forEach((circle, cIdx) => {
          const rotPoints = circle.map((v) => rotate4D(v, s));
          const proj3D = rotPoints.map((v) => project4Dto3D(v, s.projection));
          const proj2D = proj3D.map((v) =>
            project3Dto2D(v, s.camPitch, s.camYaw, s.camZoom * 1.1, width, height)
          );

          const hue = (cIdx / meridians.length) * 360;
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.75)`;

          ctx.beginPath();
          proj2D.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          });
          ctx.closePath();
          ctx.stroke();
        });
        ctx.restore();
      }
    }

    // 4D HUD Overlay (Orientation Badges)
    ctx.save();
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.textSecondary;
    ctx.textAlign = 'left';
    ctx.fillText(
      `4D Rotations: XW: ${(s.rotXW * (180 / Math.PI)).toFixed(0)}°  YW: ${(s.rotYW * (180 / Math.PI)).toFixed(0)}°  ZW: ${(s.rotZW * (180 / Math.PI)).toFixed(0)}°  |  Zoom: ${(s.camZoom * 100).toFixed(0)}%`,
      18,
      height - 20
    );
    ctx.restore();
  }, [theme, tesseractData]);

  // Sync state changes to animStateRef and redraw
  useEffect(() => {
    animStateRef.current = {
      ...animStateRef.current,
      ...state,
    };
    renderFrame();
  }, [state, renderFrame]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      renderFrame();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderFrame]);

  // Continuous Animation Loop (Zero-React-Re-renders for 60-120fps performance)
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const s = animStateRef.current;
      if (s.isAutoRotating && !isDraggingRef.current) {
        const speed = s.autoTumbleSpeed * dt;

        if (s.tumbleMode === 'clifford') {
          // Clifford Double Rotation: simultaneous rotation in XW and YZ (impossible in 3D!)
          s.rotXW = (s.rotXW + speed * 0.9) % (2 * Math.PI);
          s.rotYZ = (s.rotYZ + speed * 0.9) % (2 * Math.PI);
          s.rotYW = (s.rotYW + speed * 0.4) % (2 * Math.PI);
        } else if (s.tumbleMode === 'simple') {
          s.rotXW = (s.rotXW + speed) % (2 * Math.PI);
        } else {
          // Complex multi-plane tumble
          s.rotXW = (s.rotXW + speed * 0.75) % (2 * Math.PI);
          s.rotYW = (s.rotYW + speed * 0.5) % (2 * Math.PI);
          s.rotZW = (s.rotZW + speed * 0.3) % (2 * Math.PI);
          s.camYaw = (s.camYaw + speed * 0.2) % (2 * Math.PI);
        }
      }

      renderFrame();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderFrame]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    dragModeRef.current = e.shiftKey ? '4d_rot' : '3d_orbit';
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (dragModeRef.current === '4d_rot') {
      // 4D Rotation in X-W and Y-W
      animStateRef.current.rotXW = (animStateRef.current.rotXW + dx * 0.012) % (2 * Math.PI);
      animStateRef.current.rotYW = (animStateRef.current.rotYW - dy * 0.012) % (2 * Math.PI);
    } else {
      // 3D Orbit Pitch & Yaw
      animStateRef.current.camYaw = (animStateRef.current.camYaw + dx * 0.008) % (2 * Math.PI);
      animStateRef.current.camPitch = Math.max(
        -Math.PI * 0.48,
        Math.min(Math.PI * 0.48, animStateRef.current.camPitch - dy * 0.008)
      );
    }
    renderFrame();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    animStateRef.current.camZoom = Math.max(0.35, Math.min(5.0, animStateRef.current.camZoom * factor));
    renderFrame();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialZoomRef.current = animStateRef.current.camZoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / touchStartDistRef.current;
      animStateRef.current.camZoom = Math.max(0.35, Math.min(5.0, initialZoomRef.current * scale));
      renderFrame();
    }
  };

  // Zoom and Camera Controls
  const handleZoomIn = () => {
    animStateRef.current.camZoom = Math.min(5.0, animStateRef.current.camZoom * 1.25);
    renderFrame();
    onShowToast?.(`4D Graph Zoom: ${(animStateRef.current.camZoom * 100).toFixed(0)}%`);
  };

  const handleZoomOut = () => {
    animStateRef.current.camZoom = Math.max(0.35, animStateRef.current.camZoom * 0.8);
    renderFrame();
    onShowToast?.(`4D Graph Zoom: ${(animStateRef.current.camZoom * 100).toFixed(0)}%`);
  };

  const handleResetCamera = () => {
    animStateRef.current = {
      ...animStateRef.current,
      rotXW: 0.45,
      rotYW: 0.35,
      rotZW: 0.0,
      rotXY: 0.0,
      rotXZ: 0.0,
      rotYZ: 0.0,
      camPitch: 0.4,
      camYaw: 0.6,
      camZoom: 1.15,
    };
    renderFrame();
    onShowToast?.('Auto-fit 4D HyperSpace & Centered View');
  };

  // Snapshot / PNG Export
  const handleTakeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `stoikliem_4d_${state.shape}_${Date.now()}.png`;
      a.click();
      onShowToast?.('Exported 4D High-Resolution Render PNG');
    } catch {
      onShowToast?.('Failed to capture snapshot');
    }
  };

  // Apply Presets
  const applyPreset = (presetId: string) => {
    setActivePreset(presetId);
    if (presetId === 'classic_tesseract') {
      setState((prev) => ({
        ...prev,
        shape: 'tesseract',
        mode: 'wireframe',
        projection: 'perspective',
        rotXW: 0.45,
        rotYW: 0.35,
        rotZW: 0.0,
        tumbleMode: 'simple',
        showFaces: true,
      }));
      onShowToast?.('Preset: Classic Tesseract (Inner/Outer Cube Perspective)');
    } else if (presetId === 'clifford_tumble') {
      setState((prev) => ({
        ...prev,
        shape: 'tesseract',
        mode: 'wireframe',
        projection: 'perspective',
        tumbleMode: 'clifford',
        isAutoRotating: true,
        autoTumbleSpeed: 0.9,
      }));
      onShowToast?.('Preset: 4D Clifford Double Rotation (Simultaneous Orthogonal Planes)');
    } else if (presetId === 'slice_morph') {
      setState((prev) => ({
        ...prev,
        shape: 'tesseract',
        mode: 'slice',
        sliceW: 0.0,
        isAutoRotating: false,
        showFaces: false,
      }));
      onShowToast?.('Preset: Tesseract Hyperplane Slicing (3D Cross-Section)');
    } else if (presetId === 'dali_net') {
      setState((prev) => ({
        ...prev,
        shape: 'tesseract',
        mode: 'unfolding',
        unfoldProgress: 1.0,
        isAutoRotating: false,
      }));
      onShowToast?.('Preset: Salvador Dalí Latin Cross Net (8 Unfolded Cubes)');
    } else if (presetId === 'hopf_fibration') {
      setState((prev) => ({
        ...prev,
        shape: 'hypersphere',
        mode: 'hopf',
        projection: 'stereographic',
        isAutoRotating: true,
        hopfFibers: 18,
        hopfLatitudes: 6,
      }));
      onShowToast?.('Preset: S³ Hopf Fibration (Interlocking Villarceau Circles)');
    } else if (presetId === 'hypersphere_slice') {
      setState((prev) => ({
        ...prev,
        shape: 'hypersphere',
        mode: 'slice',
        sliceW: 0.0,
        isAutoRotating: false,
      }));
      onShowToast?.('Preset: Hypersphere S³ 3D Slicing (Equatorial Breathing)');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative select-none pb-[58px] md:pb-0">
      {/* Main 4D Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative h-full w-full overflow-hidden touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Top Floating Control Pill */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10 flex-wrap">
          {/* Shape Selector & Mode Bar */}
          <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl border shadow-xl backdrop-blur-md"
            style={{
              backgroundColor: theme.bgCard + 'ee',
              borderColor: theme.border,
            }}
          >
            <button
              onClick={() => setState((prev) => ({ ...prev, shape: 'tesseract', mode: 'wireframe' }))}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                state.shape === 'tesseract'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/40'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">HyperCube (Tesseract)</span>
              <span className="sm:hidden">HyperCube</span>
            </button>

            <button
              onClick={() => setState((prev) => ({ ...prev, shape: 'hypersphere', mode: 'hopf' }))}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                state.shape === 'hypersphere'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-500/40'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
              }`}
            >
              <Circle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hypersphere (S³)</span>
              <span className="sm:hidden">Hypersphere</span>
            </button>
          </div>

          {/* Quick Actions (Guide, Snapshot, Play/Pause, Sidebar Toggle, 2D Studio) */}
          <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl border shadow-xl backdrop-blur-md"
            style={{
              backgroundColor: theme.bgCard + 'ee',
              borderColor: theme.border,
            }}
          >
            <button
              onClick={() => setState((prev) => ({ ...prev, isAutoRotating: !prev.isAutoRotating }))}
              title={state.isAutoRotating ? 'Pause 4D Tumble' : 'Resume 4D Tumble'}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs flex items-center gap-1 font-medium"
              style={{ color: theme.textPrimary }}
            >
              {state.isAutoRotating ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
            </button>

            <button
              onClick={handleTakeSnapshot}
              title="Export High-Resolution 4D Snapshot (PNG)"
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs"
              style={{ color: theme.textPrimary }}
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              title="Open 4D Imagination & Pedagogical Guide"
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isGuideOpen
                  ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/40'
                  : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">4D Guide</span>
            </button>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? 'Hide Parameters Panel (Fullscreen View)' : 'Show Parameters Panel'}
              className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-1 ${
                isSidebarOpen ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              style={{ color: isSidebarOpen ? undefined : theme.textPrimary }}
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden md:inline text-3xs font-semibold">
                {isSidebarOpen ? 'Collapse' : 'Controls'}
              </span>
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

        {/* Bottom Floating Interactive Presets Carousel */}
        <div className="absolute bottom-16 md:bottom-9 left-3 right-3 flex items-center justify-center gap-1.5 overflow-x-auto pointer-events-none z-10 pb-1">
          <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl border shadow-2xl backdrop-blur-md max-w-full overflow-x-auto no-scrollbar"
            style={{
              backgroundColor: theme.bgCard + 'fa',
              borderColor: theme.border,
            }}
          >
            <span className="text-3xs font-mono font-bold uppercase tracking-wider px-2 opacity-60 shrink-0" style={{ color: theme.textSecondary }}>
              Presets:
            </span>

            {[
              { id: 'classic_tesseract', label: 'Tesseract Shadow' },
              { id: 'clifford_tumble', label: '4D Clifford Tumble' },
              { id: 'slice_morph', label: 'Hyperplane 3D Slice' },
              { id: 'dali_net', label: 'Dalí Latin Cross Net' },
              { id: 'hopf_fibration', label: 'Hopf Fibration S³' },
              { id: 'hypersphere_slice', label: 'S³ Sphere Breathing' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`px-2.5 py-1 text-2xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  activePreset === preset.id
                    ? 'font-bold bg-amber-500 text-stone-900 shadow-xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                }`}
                style={{ color: activePreset === preset.id ? undefined : theme.textPrimary }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Floating Quick Camera Controls Dock (Zoom In, Zoom Out, Auto-Fit, Theater Toggle) */}
        <div
          className="absolute right-4 bottom-20 md:bottom-6 flex flex-col items-center gap-1.5 z-20 pointer-events-auto shadow-2xl rounded-2xl p-1.5 border backdrop-blur-md"
          style={{
            backgroundColor: theme.bgCard + 'ee',
            borderColor: theme.border,
          }}
        >
          <button
            onClick={handleZoomIn}
            title="Enlarge 4D Graph (Zoom In)"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all text-xs font-bold"
            style={{ color: theme.textPrimary }}
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomOut}
            title="Shrink 4D Graph (Zoom Out)"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all text-xs font-bold"
            style={{ color: theme.textPrimary }}
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="w-5 h-px bg-stone-300 dark:bg-stone-700 my-0.5" />

          <button
            onClick={handleResetCamera}
            title="Auto-Fit & Center 4D Graph"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all text-xs"
            style={{ color: theme.accent }}
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Expand to Fullscreen Theater' : 'Show Controls Sidebar'}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all text-xs"
            style={{ color: isSidebarOpen ? theme.textSecondary : theme.accent }}
          >
            {isSidebarOpen ? <Minimize2 className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
          </button>
        </div>

        {/* Floating Hint Pill */}
        <div className="absolute bottom-14 md:bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-3xs font-mono opacity-50 px-3 py-0.5 rounded-full"
          style={{ color: theme.textSecondary, backgroundColor: theme.bgCard + '88' }}
        >
          Drag: 3D Orbit • Shift+Drag: 4D Rotation • Pinch/Scroll: Zoom
        </div>
      </div>

      {/* Right Control & Parameter Sidebar */}
      {isSidebarOpen && (
        <div
          className="w-full md:w-80 lg:w-96 border-l flex flex-col shrink-0 overflow-y-auto max-h-[45vh] md:max-h-full transition-all"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
            color: theme.textPrimary,
          }}
        >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <Rotate3d className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm tracking-tight" style={{ fontFamily: '"Cinzel", serif' }}>
              4D Dimension Controls
            </h3>
          </div>
          <button
            onClick={handleResetCamera}
            className="text-2xs font-mono underline opacity-70 hover:opacity-100 flex items-center gap-1"
          >
            <Undo className="w-3 h-3" />
            <span>Reset View</span>
          </button>
        </div>

        <div className="p-4 flex flex-col gap-5 text-xs">
          {/* Visualization Modes */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-2xs uppercase tracking-wider opacity-70" style={{ color: theme.textSecondary }}>
              Visualization Mode
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(state.shape === 'tesseract'
                ? [
                    { id: 'wireframe', label: '4D Wireframe' },
                    { id: 'slice', label: '3D Hyperplane Slice' },
                    { id: 'unfolding', label: 'Dalí Net Unfold' },
                  ]
                : [
                    { id: 'hopf', label: 'Hopf Fibration' },
                    { id: 'wireframe', label: 'Great Circles' },
                    { id: 'slice', label: '3D Slice Sphere' },
                  ]
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setState((prev) => ({ ...prev, mode: m.id as any }))}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    state.mode === m.id
                      ? 'font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-xs'
                      : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slicing Hyperplane Slider (When in slice mode) */}
          {state.mode === 'slice' && (
            <div className="p-3 rounded-xl border flex flex-col gap-2.5 bg-emerald-500/5 border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  Hyperplane Coordinate (w):
                </span>
                <span className="font-mono font-bold text-xs">
                  {state.sliceW.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.02"
                value={state.sliceW}
                onChange={(e) => setState((prev) => ({ ...prev, sliceW: parseFloat(e.target.value) }))}
                className="w-full accent-emerald-500"
              />
              <div className="flex items-center justify-between text-3xs opacity-75 font-mono">
                <span>w = -1.5 (Apex Point)</span>
                <span>w = 0 (Equatorial Solid)</span>
                <span>w = +1.5</span>
              </div>
              {onPlot2DSlice && (
                <button
                  onClick={() => {
                    const eq =
                      state.shape === 'tesseract'
                        ? `|x| <= 1, |y| <= 1, |z| <= 1 (w = ${state.sliceW.toFixed(2)})`
                        : `x^2 + y^2 = ${(Math.max(0, 1 - state.sliceW * state.sliceW)).toFixed(3)}`;
                    onPlot2DSlice(eq);
                    onShowToast?.(`Sent 2D Slice equation '${eq}' to Graph Studio!`);
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

          {/* Dalí Net Unfolding Slider */}
          {state.mode === 'unfolding' && state.shape === 'tesseract' && (
            <div className="p-3 rounded-xl border flex flex-col gap-2.5 bg-indigo-500/5 border-indigo-500/30">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-700 dark:text-indigo-400">
                  Net Unfolding Progress:
                </span>
                <span className="font-mono font-bold text-xs">
                  {(state.unfoldProgress * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={state.unfoldProgress}
                onChange={(e) => setState((prev) => ({ ...prev, unfoldProgress: parseFloat(e.target.value) }))}
                className="w-full accent-indigo-500"
              />
              <p className="text-3xs opacity-70 leading-relaxed font-sans">
                Just as a 3D cube unfolds into a 2D cross on paper, a 4D hypercube unfolds into 8 connected 3D cubes forming a 3D Latin cross.
              </p>
            </div>
          )}

          {/* 4D Rotation Sliders */}
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-2xs uppercase tracking-wider opacity-70" style={{ color: theme.textSecondary }}>
              4D Rotation Planes (Radians)
            </span>

            {/* X-W Plane */}
            <div className="flex flex-col gap-1 font-mono text-3xs">
              <div className="flex justify-between">
                <span>Plane X-W (Inner-Outer Inversion)</span>
                <span>{(state.rotXW * (180 / Math.PI)).toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max={2 * Math.PI}
                step="0.05"
                value={state.rotXW}
                onChange={(e) => setState((prev) => ({ ...prev, rotXW: parseFloat(e.target.value) }))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Y-W Plane */}
            <div className="flex flex-col gap-1 font-mono text-3xs">
              <div className="flex justify-between">
                <span>Plane Y-W (Vertical 4D Precession)</span>
                <span>{(state.rotYW * (180 / Math.PI)).toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max={2 * Math.PI}
                step="0.05"
                value={state.rotYW}
                onChange={(e) => setState((prev) => ({ ...prev, rotYW: parseFloat(e.target.value) }))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Z-W Plane */}
            <div className="flex flex-col gap-1 font-mono text-3xs">
              <div className="flex justify-between">
                <span>Plane Z-W (Depth 4D Precession)</span>
                <span>{(state.rotZW * (180 / Math.PI)).toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max={2 * Math.PI}
                step="0.05"
                value={state.rotZW}
                onChange={(e) => setState((prev) => ({ ...prev, rotZW: parseFloat(e.target.value) }))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Projection Modes */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-2xs uppercase tracking-wider opacity-70" style={{ color: theme.textSecondary }}>
              4D to 3D Projection Model
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'perspective', label: 'Perspective' },
                { id: 'stereographic', label: 'Stereographic' },
                { id: 'orthographic', label: 'Orthographic' },
              ].map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => setState((prev) => ({ ...prev, projection: proj.id as any }))}
                  className={`py-1.5 px-1 rounded-md text-3xs font-medium border text-center transition-all ${
                    state.projection === proj.id
                      ? 'font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
                      : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
                  }`}
                >
                  {proj.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: theme.border }}>
            <span className="font-semibold text-2xs uppercase tracking-wider opacity-70" style={{ color: theme.textSecondary }}>
              Display Elements
            </span>
            <div className="flex items-center justify-between text-2xs">
              <span>Cell Tints (8 Cubes)</span>
              <input
                type="checkbox"
                checked={state.showFaces}
                onChange={(e) => setState((prev) => ({ ...prev, showFaces: e.target.checked }))}
                className="accent-amber-500 rounded"
              />
            </div>
            <div className="flex items-center justify-between text-2xs">
              <span>16 Vertices</span>
              <input
                type="checkbox"
                checked={state.showVertices}
                onChange={(e) => setState((prev) => ({ ...prev, showVertices: e.target.checked }))}
                className="accent-amber-500 rounded"
              />
            </div>
            <div className="flex items-center justify-between text-2xs">
              <span>Vertex 4D Coordinates</span>
              <input
                type="checkbox"
                checked={state.showCoordinates}
                onChange={(e) => setState((prev) => ({ ...prev, showCoordinates: e.target.checked }))}
                className="accent-amber-500 rounded"
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 4D Pedagogical / Educational Imagination Guide Drawer */}
      {isGuideOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-50 shadow-2xl border-l flex flex-col p-5 overflow-y-auto animate-in slide-in-from-right duration-200"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            color: theme.textPrimary,
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-base tracking-tight" style={{ fontFamily: '"Cinzel", serif' }}>
                4D Imagination Guide
              </h2>
            </div>
            <button
              onClick={() => setIsGuideOpen(false)}
              className="text-2xs font-semibold px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              ✕ Close
            </button>
          </div>

          <div className="space-y-4 text-xs leading-relaxed">
            <section className="space-y-1.5">
              <h3 className="font-bold text-amber-600 dark:text-amber-400">
                1. The Dimensional Progression Analogy
              </h3>
              <p className="opacity-80">
                In Edwin Abbott's classic <em>Flatland (1884)</em>, a 2D Square living on a flat plane cannot look "up" into the 3rd dimension. If a 3D sphere passes through the plane, the Square sees only a point that grows into a widening circle, and then shrinks back to a point.
              </p>
              <p className="opacity-80">
                Similarly, 3-dimensional humans cannot look directly into the 4th spatial direction (coordinate $w$). We can only observe 3D shadows and 3D cross-sections of 4D entities!
              </p>
            </section>

            <section className="space-y-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <h3 className="font-bold text-amber-700 dark:text-amber-300">
                2. Mathematics of the Tesseract (8-Cell)
              </h3>
              <p className="opacity-90 font-mono text-2xs">
                Vertices: 2⁴ = 16 points (±1, ±1, ±1, ±1)<br />
                Edges: 4 × 2³ = 32 edges<br />
                Faces: 6 × 2² = 24 square faces<br />
                Bounding Cells: 8 cubic 3D hypercells
              </p>
              <p className="text-3xs opacity-80 pt-1">
                When you rotate in the $XW$ plane, the inner cube expands and passes through the outer cube, illustrating 4D spatial inversion.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-indigo-600 dark:text-indigo-400">
                3. The Hypersphere (3-Sphere S³) & Hopf Fibration
              </h3>
              <p className="opacity-80">
                The 3-sphere in 4D space is defined by the algebraic equation:
              </p>
              <div className="p-2 font-mono text-center rounded bg-black/5 dark:bg-white/5 text-xs font-bold">
                x² + y² + z² + w² = R²
              </div>
              <p className="opacity-80">
                Heinz Hopf proved in 1931 that $S^3$ is composed of a seamless family of linked circles called the <strong>Hopf Fibration</strong>. Projected stereographically into 3D, these circles weave into nested Clifford tori with linking number 1!
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-emerald-600 dark:text-emerald-400">
                4. Salvador Dalí's Corpus Hypercubus
              </h3>
              <p className="opacity-80">
                In his famous 1954 painting <em>Corpus Hypercubus</em>, surrealist master Salvador Dalí depicted Christ crucified on the 3D unfolded Latin cross net of a 4D tesseract—bridging sacred geometry and higher-dimensional mathematics.
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
