/**
 * Stoikliem Graphica — 3D Surface & Multivariable Plotting Engine
 * 
 * Provides mesh generation for explicit surfaces z = f(x, y),
 * Kuhn 6-Tetrahedra Marching Level-Set Extraction for implicit surfaces F(x, y, z) = c,
 * central-difference analytical normals, scientific colormaps, lighting shaders,
 * and tangent plane multivariable calculus.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Triangle3D {
  p0: Vec3;
  p1: Vec3;
  p2: Vec3;
  n0: Vec3;
  n1: Vec3;
  n2: Vec3;
  val0: number;
  val1: number;
  val2: number;
}

export interface SurfaceMesh3D {
  triangles: Triangle3D[];
  minVal: number;
  maxVal: number;
  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  };
}

export type ColormapId =
  | 'viridis'
  | 'spectral'
  | 'magma'
  | 'coolwarm'
  | 'academic'
  | 'ocean'
  | 'topographic'
  | 'plasma'
  | 'neon';

export type ShadingShaderId =
  | 'phong'
  | 'iridescent'
  | 'contour_stripes'
  | 'curvature';

export interface SurfacePreset {
  id: string;
  name: string;
  category: 'Explicit (z = f(x, y))' | 'Implicit (F(x, y, z) = 0)' | 'Minimal & Algebraic' | 'Calculus & Optimization';
  type: 'explicit' | 'implicit';
  formula: string;
  description: string;
  defaultDomain: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin?: number;
    zMax?: number;
  };
  isovalue?: number;
  defaultColormap: ColormapId;
  defaultShader?: ShadingShaderId;
}

// ==========================================
// Scientific Colormaps (RGB 0..1)
// ==========================================

export function getColorFromMap(tNorm: number, map: ColormapId): [number, number, number] {
  const t = Math.max(0, Math.min(1, tNorm));

  switch (map) {
    case 'viridis': {
      // Perceptually uniform Viridis colormap approximation
      const r = 0.267 + 0.728 * Math.pow(t, 2) - 0.04 * t;
      const g = 0.004 + 1.4 * t - 0.5 * Math.pow(t, 2);
      const b = 0.329 + 0.6 * Math.sin(t * Math.PI);
      return [Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b))];
    }

    case 'spectral': {
      // Smooth rainbow spectrum
      const hue = (1.0 - t) * 260; // Blue (0) -> Green -> Yellow -> Red (1)
      return hslToRgb(hue, 0.9, 0.52);
    }

    case 'magma': {
      // Black -> Purple -> Hot Pink -> Orange -> Pale Yellow
      const r = Math.min(1, Math.pow(t, 0.6) * 1.25);
      const g = Math.min(1, Math.max(0, (t - 0.28) * 1.45));
      const b = Math.min(1, Math.max(0, 0.2 + 0.8 * Math.sin(t * Math.PI * 0.8)));
      return [r, g, b];
    }

    case 'coolwarm': {
      // Diverging blue (-1) -> white (0) -> red (+1)
      if (t < 0.5) {
        const f = t * 2.0;
        return [0.23 + 0.7 * f, 0.3 + 0.65 * f, 0.75 + 0.25 * f];
      } else {
        const f = (t - 0.5) * 2.0;
        return [0.93 + 0.07 * (1 - f), 0.95 - 0.65 * f, 1.0 - 0.75 * f];
      }
    }

    case 'academic': {
      // Amber Gold & Rich Slate Navy
      const r = 0.12 + t * 0.78;
      const g = 0.18 + t * 0.58;
      const b = 0.35 + (1 - t) * 0.25;
      return [r, g, b];
    }

    case 'ocean': {
      // Deep Blue -> Turquoise -> Sea Foam Cyan
      return [0.05 + 0.25 * t, 0.3 + 0.65 * t, 0.55 + 0.45 * Math.pow(t, 0.5)];
    }

    case 'topographic': {
      // Topographic contour bands with distinct level steps
      const bands = 12;
      const stepped = Math.floor(t * bands) / bands;
      const base = hslToRgb((1.0 - stepped) * 230, 0.85, 0.5);
      const frac = (t * bands) % 1;
      const line = frac < 0.08 ? 0.35 : 1.0;
      return [base[0] * line, base[1] * line, base[2] * line];
    }

    case 'plasma': {
      // Deep blue -> Magenta -> Orange -> Sunshine yellow
      const r = Math.min(1, Math.max(0, 0.05 + 1.25 * Math.pow(t, 0.7)));
      const g = Math.min(1, Math.max(0, 0.02 + 0.9 * Math.pow(t, 1.5)));
      const b = Math.min(1, Math.max(0, 0.55 + 0.45 * Math.sin(t * Math.PI - 0.4)));
      return [r, g, b];
    }

    case 'neon': {
      // Cyan -> Electric Emerald -> Bright Yellow -> Vivid Magenta
      const hue = (t * 300 + 170) % 360;
      return hslToRgb(hue, 1.0, 0.54);
    }

    default:
      return [t, t, t];
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) { r = c; g = x; }
  else if (hp >= 1 && hp < 2) { r = x; g = c; }
  else if (hp >= 2 && hp < 3) { g = c; b = x; }
  else if (hp >= 3 && hp < 4) { g = x; b = c; }
  else if (hp >= 4 && hp < 5) { r = x; b = c; }
  else if (hp >= 5 && hp < 6) { r = c; b = x; }
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

// ==========================================
// Explicit Surface Generator: z = f(x, y)
// ==========================================

export function generateExplicitSurfaceMesh(
  fn: (x: number, y: number) => number,
  domain: { xMin: number; xMax: number; yMin: number; yMax: number },
  resolution: number = 60,
  zClip: number = 30
): SurfaceMesh3D {
  const { xMin, xMax, yMin, yMax } = domain;
  const nx = resolution;
  const ny = resolution;
  const dx = (xMax - xMin) / nx;
  const dy = (yMax - yMin) / ny;

  // 1. Grid Evaluation
  const gridZ: number[][] = [];
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i <= nx; i++) {
    gridZ[i] = [];
    const x = xMin + i * dx;
    for (let j = 0; j <= ny; j++) {
      const y = yMin + j * dy;
      let z = fn(x, y);
      if (isNaN(z) || !isFinite(z)) {
        z = NaN;
      } else {
        z = Math.max(-zClip, Math.min(zClip, z));
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
      gridZ[i][j] = z;
    }
  }

  if (!isFinite(minZ)) {
    minZ = -1;
    maxZ = 1;
  }
  if (minZ === maxZ) {
    maxZ = minZ + 1;
  }

  // 2. Normal Vectors via Central Differences on evaluated grid (Ultra-Fast)
  const normalGrid: Vec3[][] = [];

  for (let i = 0; i <= nx; i++) {
    normalGrid[i] = [];
    const iL = Math.max(0, i - 1);
    const iR = Math.min(nx, i + 1);

    for (let j = 0; j <= ny; j++) {
      const zVal = gridZ[i][j];
      if (isNaN(zVal)) {
        normalGrid[i][j] = { x: 0, y: 0, z: 1 };
        continue;
      }
      const jB = Math.max(0, j - 1);
      const jT = Math.min(ny, j + 1);

      const zL = gridZ[iL][j];
      const zR = gridZ[iR][j];
      const zB = gridZ[i][jB];
      const zT = gridZ[i][jT];

      const dzdx = (iR !== iL && !isNaN(zL) && !isNaN(zR)) ? (zR - zL) / ((iR - iL) * dx) : 0;
      const dzdy = (jT !== jB && !isNaN(zB) && !isNaN(zT)) ? (zT - zB) / ((jT - jB) * dy) : 0;

      const len = Math.hypot(-dzdx, -dzdy, 1) || 1;
      normalGrid[i][j] = {
        x: -dzdx / len,
        y: -dzdy / len,
        z: 1 / len,
      };
    }
  }

  // 3. Triangulation
  const triangles: Triangle3D[] = [];

  for (let i = 0; i < nx; i++) {
    const x0 = xMin + i * dx;
    const x1 = xMin + (i + 1) * dx;

    for (let j = 0; j < ny; j++) {
      const y0 = yMin + j * dy;
      const y1 = yMin + (j + 1) * dy;

      const z00 = gridZ[i][j];
      const z10 = gridZ[i + 1][j];
      const z01 = gridZ[i][j + 1];
      const z11 = gridZ[i + 1][j + 1];

      // Skip invalid cells
      if (isNaN(z00) || isNaN(z10) || isNaN(z01) || isNaN(z11)) continue;

      const p00: Vec3 = { x: x0, y: y0, z: z00 };
      const p10: Vec3 = { x: x1, y: y0, z: z10 };
      const p01: Vec3 = { x: x0, y: y1, z: z01 };
      const p11: Vec3 = { x: x1, y: y1, z: z11 };

      const n00 = normalGrid[i][j];
      const n10 = normalGrid[i + 1][j];
      const n01 = normalGrid[i][j + 1];
      const n11 = normalGrid[i + 1][j + 1];

      // Triangle 1: (p00, p10, p11)
      triangles.push({
        p0: p00, p1: p10, p2: p11,
        n0: n00, n1: n10, n2: n11,
        val0: z00, val1: z10, val2: z11,
      });

      // Triangle 2: (p00, p11, p01)
      triangles.push({
        p0: p00, p1: p11, p2: p01,
        n0: n00, n1: n11, n2: n01,
        val0: z00, val1: z11, val2: z01,
      });
    }
  }

  return {
    triangles,
    minVal: minZ,
    maxVal: maxZ,
    bounds: {
      xMin,
      xMax,
      yMin,
      yMax,
      zMin: minZ,
      zMax: maxZ,
    },
  };
}

// ==========================================
// Implicit 3D Surface Generator (Marching Tetrahedra)
// ==========================================

/**
 * Marching Tetrahedra Table:
 * A tetrahedron has 4 vertices (v0, v1, v2, v3) and 6 edges:
 * 0: (0, 1), 1: (1, 2), 2: (2, 0), 3: (0, 3), 4: (1, 3), 5: (2, 3)
 */
const TETRA_EDGES: [number, number][] = [
  [0, 1], // edge 0
  [1, 2], // edge 1
  [2, 0], // edge 2
  [0, 3], // edge 3
  [1, 3], // edge 4
  [2, 3], // edge 5
];

// Triangles formed for each of the 16 configurations (index = bitmask of vertices > isovalue)
const TETRA_TRIANGLES: number[][] = [
  [], // 0: none
  [0, 3, 2], // 1: v0
  [0, 1, 4], // 2: v1
  [3, 2, 1, 3, 1, 4], // 3: v0, v1
  [1, 2, 5], // 4: v2
  [0, 3, 1, 1, 3, 5], // 5: v0, v2
  [0, 4, 2, 2, 4, 5], // 6: v1, v2
  [3, 4, 5], // 7: v0, v1, v2
  [3, 5, 4], // 8: v3
  [0, 2, 4, 4, 2, 5], // 9: v0, v3
  [0, 5, 1, 0, 3, 5], // 10: v1, v3
  [1, 5, 2], // 11: v0, v1, v3
  [3, 4, 1, 3, 1, 2], // 12: v2, v3
  [0, 4, 1], // 13: v0, v2, v3
  [0, 2, 3], // 14: v1, v2, v3
  [], // 15: all
];

export function generateImplicitSurfaceMesh(
  evalFn: (x: number, y: number, z: number) => number,
  domain: { xMin: number; xMax: number; yMin: number; yMax: number; zMin: number; zMax: number },
  isovalue: number = 0.0,
  gridResolution: number = 32
): SurfaceMesh3D {
  const { xMin, xMax, yMin, yMax, zMin, zMax } = domain;
  const nx = gridResolution;
  const ny = gridResolution;
  const nz = gridResolution;
  const dx = (xMax - xMin) / nx;
  const dy = (yMax - yMin) / ny;
  const dz = (zMax - zMin) / nz;

  // 1. Evaluate 3D scalar field grid
  const totalPoints = (nx + 1) * (ny + 1) * (nz + 1);
  const field: Float64Array = new Float64Array(totalPoints);
  const getIdx = (i: number, j: number, k: number) =>
    i * (ny + 1) * (nz + 1) + j * (nz + 1) + k;

  let minF = Infinity;
  let maxF = -Infinity;

  for (let i = 0; i <= nx; i++) {
    const x = xMin + i * dx;
    for (let j = 0; j <= ny; j++) {
      const y = yMin + j * dy;
      for (let k = 0; k <= nz; k++) {
        const z = zMin + k * dz;
        const val = evalFn(x, y, z);
        field[getIdx(i, j, k)] = val;
        if (!isNaN(val) && isFinite(val)) {
          if (val < minF) minF = val;
          if (val > maxF) maxF = val;
        }
      }
    }
  }

  // 2. Normal Gradient Function
  const h = 1e-3;
  const getGradient = (x: number, y: number, z: number): Vec3 => {
    const fx1 = evalFn(x + h, y, z);
    const fx0 = evalFn(x - h, y, z);
    const fy1 = evalFn(x, y + h, z);
    const fy0 = evalFn(x, y - h, z);
    const fz1 = evalFn(x, y, z + h);
    const fz0 = evalFn(x, y, z - h);

    const gx = (fx1 - fx0) / (2 * h);
    const gy = (fy1 - fy0) / (2 * h);
    const gz = (fz1 - fz0) / (2 * h);
    const len = Math.hypot(gx, gy, gz);
    if (len < 1e-9) return { x: 0, y: 0, z: 1 };
    return { x: gx / len, y: gy / len, z: gz / len };
  };

  const triangles: Triangle3D[] = [];

  // 3. Process each voxel cube by decomposing into 6 non-overlapping Kuhn tetrahedra
  const kuhnTetrahedra = [
    [0, 1, 2, 6],
    [0, 3, 2, 6],
    [0, 3, 7, 6],
    [0, 4, 7, 6],
    [0, 4, 5, 6],
    [0, 1, 5, 6],
  ];

  for (let i = 0; i < nx; i++) {
    const x0 = xMin + i * dx;
    const x1 = x0 + dx;

    for (let j = 0; j < ny; j++) {
      const y0 = yMin + j * dy;
      const y1 = y0 + dy;

      for (let k = 0; k < nz; k++) {
        const z0 = zMin + k * dz;
        const z1 = z0 + dz;

        // Cube 8 vertices:
        const cP: Vec3[] = [
          { x: x0, y: y0, z: z0 }, // 0: 000
          { x: x1, y: y0, z: z0 }, // 1: 100
          { x: x1, y: y1, z: z0 }, // 2: 110
          { x: x0, y: y1, z: z0 }, // 3: 010
          { x: x0, y: y0, z: z1 }, // 4: 001
          { x: x1, y: y0, z: z1 }, // 5: 101
          { x: x1, y: y1, z: z1 }, // 6: 111
          { x: x0, y: y1, z: z1 }, // 7: 011
        ];

        const cV: number[] = [
          field[getIdx(i, j, k)],
          field[getIdx(i + 1, j, k)],
          field[getIdx(i + 1, j + 1, k)],
          field[getIdx(i, j + 1, k)],
          field[getIdx(i, j, k + 1)],
          field[getIdx(i + 1, j, k + 1)],
          field[getIdx(i + 1, j + 1, k + 1)],
          field[getIdx(i, j + 1, k + 1)],
        ];

        // Quick check: if all values are strictly above or below isovalue, skip entire cube!
        let hasAbove = false;
        let hasBelow = false;
        for (let vi = 0; vi < 8; vi++) {
          if (cV[vi] > isovalue) hasAbove = true;
          else hasBelow = true;
          if (hasAbove && hasBelow) break;
        }
        if (!hasAbove || !hasBelow) continue;

        kuhnTetrahedra.forEach((tIndices) => {
          const tP = [cP[tIndices[0]], cP[tIndices[1]], cP[tIndices[2]], cP[tIndices[3]]];
          const tV = [cV[tIndices[0]], cV[tIndices[1]], cV[tIndices[2]], cV[tIndices[3]]];

          let mask = 0;
          for (let vi = 0; vi < 4; vi++) {
            if (tV[vi] > isovalue) mask |= (1 << vi);
          }

          const triList = TETRA_TRIANGLES[mask];
          if (!triList || triList.length === 0) return;

          // Edge intersection positions
          const edgePoints: Vec3[] = [];
          for (let eIdx = 0; eIdx < 6; eIdx++) {
            const [vA, vB] = TETRA_EDGES[eIdx];
            const valA = tV[vA];
            const valB = tV[vB];
            const denom = valB - valA;
            const t = Math.abs(denom) > 1e-12 ? (isovalue - valA) / denom : 0.5;
            const tClamped = Math.max(0, Math.min(1, t));

            edgePoints[eIdx] = {
              x: tP[vA].x + tClamped * (tP[vB].x - tP[vA].x),
              y: tP[vA].y + tClamped * (tP[vB].y - tP[vA].y),
              z: tP[vA].z + tClamped * (tP[vB].z - tP[vA].z),
            };
          }

          // Emit triangles
          for (let ti = 0; ti < triList.length; ti += 3) {
            const p0 = edgePoints[triList[ti]];
            const p1 = edgePoints[triList[ti + 1]];
            const p2 = edgePoints[triList[ti + 2]];

            const n0 = getGradient(p0.x, p0.y, p0.z);
            const n1 = getGradient(p1.x, p1.y, p1.z);
            const n2 = getGradient(p2.x, p2.y, p2.z);

            triangles.push({
              p0, p1, p2,
              n0, n1, n2,
              val0: p0.z,
              val1: p1.z,
              val2: p2.z,
            });
          }
        });
      }
    }
  }

  return {
    triangles,
    minVal: zMin,
    maxVal: zMax,
    bounds: domain,
  };
}

// ==========================================
// 3D Orbital Projection to Screen Canvas
// ==========================================

export function projectWorldToScreen3D(
  v: Vec3,
  pitch: number,
  yaw: number,
  zoom: number,
  pan: { x: number; y: number },
  width: number,
  height: number,
  domainRadius: number = 2.5
): { sx: number; sy: number; depth: number } {
  // Yaw around Z axis
  const cy = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = v.x * cy - v.y * sinY;
  const y1 = v.x * sinY + v.y * cy;

  // Pitch around X axis
  const cp = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y2 = y1 * cp - v.z * sinP;
  const z2 = y1 * sinP + v.z * cp;

  // 3D Perspective camera distance & auto-framing
  const dCamera = 8.2;
  const normRadius = Math.max(0.5, domainRadius);
  // Viewport scale: graph comfortably fills ~75-80% of min(width, height)
  const fov = (Math.min(width, height) * 0.42 * dCamera / normRadius) * zoom;
  const denom = Math.max(0.25, dCamera - (z2 / normRadius) * 2.5);

  const sx = width * 0.5 + pan.x + (x1 / denom) * fov;
  const sy = height * 0.5 + pan.y - (y2 / denom) * fov;

  return { sx, sy, depth: z2 };
}

// ==========================================
// Calculus 3D: Tangent Plane Equation
// ==========================================

export function computeTangentPlane(
  fn: (x: number, y: number) => number,
  x0: number,
  y0: number
): {
  z0: number;
  dfdx: number;
  dfdy: number;
  planeEquation: string;
  points: Vec3[];
} {
  const h = 1e-4;
  const z0 = fn(x0, y0);
  const dfdx = (fn(x0 + h, y0) - fn(x0 - h, y0)) / (2 * h);
  const dfdy = (fn(x0, y0 + h) - fn(x0, y0 - h)) / (2 * h);

  const sign = (n: number) => (n >= 0 ? `+ ${n.toFixed(2)}` : `- ${Math.abs(n).toFixed(2)}`);
  const planeEquation = `z = ${z0.toFixed(2)} ${sign(dfdx)}(x - ${x0.toFixed(2)}) ${sign(dfdy)}(y - ${y0.toFixed(2)})`;

  // Tangent patch quad around (x0, y0)
  const span = 1.2;
  const corners: [number, number][] = [
    [x0 - span, y0 - span],
    [x0 + span, y0 - span],
    [x0 + span, y0 + span],
    [x0 - span, y0 + span],
  ];

  const points: Vec3[] = corners.map(([x, y]) => ({
    x,
    y,
    z: z0 + dfdx * (x - x0) + dfdy * (y - y0),
  }));

  return { z0, dfdx, dfdy, planeEquation, points };
}

// ==========================================
// Curated 3D Surface & Contour Presets
// ==========================================

export const SURFACE_3D_PRESETS: SurfacePreset[] = [
  {
    id: 'elliptic_paraboloid',
    name: 'Elliptic Paraboloid',
    category: 'Explicit (z = f(x, y))',
    type: 'explicit',
    formula: 'x^2 + y^2',
    description: 'A classic smooth quadratic bowl opening upward with rotational symmetry. Fundamental to Newtonian optics, satellite dishes, and parabolic reflectors.',
    defaultDomain: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
    defaultColormap: 'viridis',
    defaultShader: 'phong',
  },
  {
    id: 'hyperbolic_paraboloid',
    name: 'Hyperbolic Paraboloid (Saddle)',
    category: 'Explicit (z = f(x, y))',
    type: 'explicit',
    formula: 'x^2 - y^2',
    description: 'The prototypical saddle surface with opposing principal curvatures. Demonstrates saddle points in multivariable calculus where the gradient is zero but the Hessian determinant is negative.',
    defaultDomain: { xMin: -2.8, xMax: 2.8, yMin: -2.8, yMax: 2.8 },
    defaultColormap: 'coolwarm',
    defaultShader: 'phong',
  },
  {
    id: 'sombrero_ripple',
    name: 'Circular Ripple (Sombrero)',
    category: 'Explicit (z = f(x, y))',
    type: 'explicit',
    formula: 'sin(sqrt(x^2 + y^2)*2.5) / (sqrt(x^2 + y^2) + 0.3)',
    description: 'Radial Bessel-like wave interference pattern modeling circular 2D wave diffraction and water ripple resonances.',
    defaultDomain: { xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 },
    defaultColormap: 'spectral',
    defaultShader: 'iridescent',
  },
  {
    id: 'damped_bessel_ripple',
    name: 'Damped Concentric Wave',
    category: 'Explicit (z = f(x, y))',
    type: 'explicit',
    formula: '2.5 * sin(3.0 * sqrt(x^2 + y^2)) / (1.0 + 0.35 * (x^2 + y^2))',
    description: 'A heavily damped circular wave packet radiating outward from the origin with multiple oscillation rings.',
    defaultDomain: { xMin: -4.0, xMax: 4.0, yMin: -4.0, yMax: 4.0 },
    defaultColormap: 'neon',
    defaultShader: 'contour_stripes',
  },
  {
    id: 'monkey_saddle',
    name: 'Monkey Saddle',
    category: 'Explicit (z = f(x, y))',
    type: 'explicit',
    formula: 'x^3 - 3*x*y^2',
    description: 'A cubic saddle with three downward slopes: two for the monkey’s legs and one for its tail. Defined by Re((x + i y)^3).',
    defaultDomain: { xMin: -2.0, xMax: 2.0, yMin: -2.0, yMax: 2.0 },
    defaultColormap: 'academic',
    defaultShader: 'phong',
  },
  {
    id: 'egg_carton',
    name: 'Egg Carton Wave',
    category: 'Explicit (z = f(x, y))',
    type: 'explicit',
    formula: 'sin(x) * cos(y)',
    description: 'Bi-periodic doubly trigonometric undulating wave surface with an infinite lattice of alternating local maxima, minima, and saddle passes.',
    defaultDomain: { xMin: -5.0, xMax: 5.0, yMin: -5.0, yMax: 5.0 },
    defaultColormap: 'topographic',
    defaultShader: 'phong',
  },
  {
    id: 'gaussian_bell',
    name: 'Bivariate Gaussian Bell',
    category: 'Explicit (z = f(x, y))',
    type: 'explicit',
    formula: '3.5 * exp(-(x^2 + y^2) / 2.0)',
    description: 'Standard 2D normal probability distribution bell curve with smooth exponential dropoff.',
    defaultDomain: { xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5 },
    defaultColormap: 'magma',
    defaultShader: 'phong',
  },
  {
    id: 'rosenbrock_valley',
    name: 'Rosenbrock Banana Valley',
    category: 'Calculus & Optimization',
    type: 'explicit',
    formula: '(1 - x)^2 + 10 * (y - x^2)^2',
    description: 'A famous benchmark problem for gradient descent optimization algorithms. The global minimum lies inside a long, narrow, parabolic flat valley.',
    defaultDomain: { xMin: -2.0, xMax: 2.0, yMin: -1.0, yMax: 3.0 },
    defaultColormap: 'plasma',
    defaultShader: 'curvature',
  },
  {
    id: 'rastrigin_field',
    name: 'Rastrigin Multimodal Peaks',
    category: 'Calculus & Optimization',
    type: 'explicit',
    formula: '0.15 * (x^2 + y^2) - cos(2*3.14159*x) - cos(2*3.14159*y)',
    description: 'A heavily non-convex landscape with a dense field of local minima arranged in an egg-carton lattice, challenging global optimization heuristics.',
    defaultDomain: { xMin: -3.0, xMax: 3.0, yMin: -3.0, yMax: 3.0 },
    defaultColormap: 'spectral',
    defaultShader: 'contour_stripes',
  },
  {
    id: 'implicit_sphere',
    name: '3D Sphere (Level Set)',
    category: 'Implicit (F(x, y, z) = 0)',
    type: 'implicit',
    formula: 'x^2 + y^2 + z^2 - 4 = 0',
    description: 'Canonical 2-sphere S² of radius 2. Zero-crossing level set of the quadratic distance potential field.',
    defaultDomain: { xMin: -2.6, xMax: 2.6, yMin: -2.6, yMax: 2.6, zMin: -2.6, zMax: 2.6 },
    isovalue: 0.0,
    defaultColormap: 'ocean',
    defaultShader: 'phong',
  },
  {
    id: 'implicit_torus',
    name: 'Ring Torus (Donut)',
    category: 'Implicit (F(x, y, z) = 0)',
    type: 'implicit',
    formula: '(x^2 + y^2 + z^2 + 2.25 - 0.49)^2 - 9*(x^2 + y^2) = 0',
    description: 'A smooth doughnut surface with major radius R = 1.5 and minor tube radius r = 0.7, generated by revolving a circle in 3D.',
    defaultDomain: { xMin: -2.8, xMax: 2.8, yMin: -2.8, yMax: 2.8, zMin: -1.6, zMax: 1.6 },
    isovalue: 0.0,
    defaultColormap: 'viridis',
    defaultShader: 'iridescent',
  },
  {
    id: 'implicit_heart',
    name: 'Algebraic 3D Heart',
    category: 'Implicit (F(x, y, z) = 0)',
    type: 'implicit',
    formula: '(x^2 + 2.25*y^2 + z^2 - 1)^3 - x^2*z^3 - 0.1125*y^2*z^3 = 0',
    description: 'Taubin algebraic 6th-degree heart surface with smooth bilobed symmetry and sharp bottom apex.',
    defaultDomain: { xMin: -1.8, xMax: 1.8, yMin: -1.8, yMax: 1.8, zMin: -1.8, zMax: 1.8 },
    isovalue: 0.0,
    defaultColormap: 'magma',
    defaultShader: 'phong',
  },
  {
    id: 'implicit_gyroid',
    name: 'Gyroid Minimal Surface',
    category: 'Minimal & Algebraic',
    type: 'implicit',
    formula: 'sin(x)*cos(y) + sin(y)*cos(z) + sin(z)*cos(x) = 0',
    description: 'Discovered by NASA scientist Alan Schoen in 1970, this infinitely connected minimal surface partitions space into two congruent interwoven labyrinths without self-intersection.',
    defaultDomain: { xMin: -3.8, xMax: 3.8, yMin: -3.8, yMax: 3.8, zMin: -3.8, zMax: 3.8 },
    isovalue: 0.0,
    defaultColormap: 'spectral',
    defaultShader: 'phong',
  },
  {
    id: 'hyperboloid_one_sheet',
    name: 'Hyperboloid of One Sheet',
    category: 'Implicit (F(x, y, z) = 0)',
    type: 'implicit',
    formula: 'x^2 + y^2 - z^2 - 1 = 0',
    description: 'A doubly-ruled quadric surface used in cooling tower architecture. Can be generated by rotating straight lines about a central axis.',
    defaultDomain: { xMin: -2.6, xMax: 2.6, yMin: -2.6, yMax: 2.6, zMin: -2.2, zMax: 2.2 },
    isovalue: 0.0,
    defaultColormap: 'academic',
    defaultShader: 'phong',
  },
];
