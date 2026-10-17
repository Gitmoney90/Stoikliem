/**
 * Stoikliem Graphica — 4D Geometry & Hyper-Dimensional Engine
 * 
 * Provides rigorous mathematical representations, 4D rotation matrices,
 * stereographic & perspective projections, hyperplane slicing, and Hopf fibration
 * for the Tesseract (4D Hypercube / 8-cell) and Hypersphere (4D 3-sphere / S³).
 */

export type HyperShapeType = 'tesseract' | 'hypersphere';
export type HyperProjectionType = 'perspective' | 'stereographic' | 'orthographic';
export type HyperVisualizationMode = 'wireframe' | 'cells' | 'slice' | 'unfolding' | 'hopf';

export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Edge4D {
  i: number;
  j: number;
}

export interface Face4D {
  indices: number[]; // 4 vertex indices
  cellId?: number;
}

export interface Cell4D {
  id: number;
  name: string;
  normal: string;
  indices: number[]; // 8 vertex indices
  color: string;
}

export interface Hyper4DState {
  shape: HyperShapeType;
  projection: HyperProjectionType;
  mode: HyperVisualizationMode;
  // 6 fundamental 4D rotation planes
  rotXW: number;
  rotYW: number;
  rotZW: number;
  rotXY: number;
  rotXZ: number;
  rotYZ: number;
  // 3D camera angles
  camPitch: number;
  camYaw: number;
  camZoom: number;
  // Slicing hyperplane coordinate w in [-1.5, 1.5]
  sliceW: number;
  sliceAxis: 'w' | 'x' | 'y' | 'z' | 'diagonal';
  // Unfolding animation progress [0, 1]
  unfoldProgress: number;
  // Hopf fibration parameters
  hopfFibers: number;
  hopfLatitudes: number;
  hopfAlpha: number;
  // Display settings
  isAutoRotating: boolean;
  autoTumbleSpeed: number;
  tumbleMode: 'simple' | 'clifford' | 'all';
  showVertices: boolean;
  showEdges: boolean;
  showFaces: boolean;
  showCoordinates: boolean;
  cellOpacity: number;
  lineWidth: number;
}

export const DEFAULT_HYPER4D_STATE: Hyper4DState = {
  shape: 'tesseract',
  projection: 'perspective',
  mode: 'wireframe',
  rotXW: 0.45,
  rotYW: 0.35,
  rotZW: 0.0,
  rotXY: 0.0,
  rotXZ: 0.0,
  rotYZ: 0.0,
  camPitch: 0.4,
  camYaw: 0.6,
  camZoom: 1.0,
  sliceW: 0.0,
  sliceAxis: 'w',
  unfoldProgress: 0.0,
  hopfFibers: 16,
  hopfLatitudes: 6,
  hopfAlpha: 0.75,
  isAutoRotating: true,
  autoTumbleSpeed: 0.8,
  tumbleMode: 'clifford',
  showVertices: true,
  showEdges: true,
  showFaces: true,
  showCoordinates: false,
  cellOpacity: 0.18,
  lineWidth: 2.0,
};

// ==========================================
// 4D Rotation Matrices & Transformations
// ==========================================

export function rotate4D(v: Vec4, state: Pick<Hyper4DState, 'rotXW' | 'rotYW' | 'rotZW' | 'rotXY' | 'rotXZ' | 'rotYZ'>): Vec4 {
  let { x, y, z, w } = v;

  // 1. X-W rotation (the classic 4D turnover where inner and outer cubes invert)
  if (state.rotXW !== 0) {
    const c = Math.cos(state.rotXW);
    const s = Math.sin(state.rotXW);
    const nx = x * c - w * s;
    const nw = x * s + w * c;
    x = nx;
    w = nw;
  }

  // 2. Y-W rotation
  if (state.rotYW !== 0) {
    const c = Math.cos(state.rotYW);
    const s = Math.sin(state.rotYW);
    const ny = y * c - w * s;
    const nw = y * s + w * c;
    y = ny;
    w = nw;
  }

  // 3. Z-W rotation
  if (state.rotZW !== 0) {
    const c = Math.cos(state.rotZW);
    const s = Math.sin(state.rotZW);
    const nz = z * c - w * s;
    const nw = z * s + w * c;
    z = nz;
    w = nw;
  }

  // 4. X-Y rotation
  if (state.rotXY !== 0) {
    const c = Math.cos(state.rotXY);
    const s = Math.sin(state.rotXY);
    const nx = x * c - y * s;
    const ny = x * s + y * c;
    x = nx;
    y = ny;
  }

  // 5. X-Z rotation
  if (state.rotXZ !== 0) {
    const c = Math.cos(state.rotXZ);
    const s = Math.sin(state.rotXZ);
    const nx = x * c - z * s;
    const nz = x * s + z * c;
    x = nx;
    z = nz;
  }

  // 6. Y-Z rotation
  if (state.rotYZ !== 0) {
    const c = Math.cos(state.rotYZ);
    const s = Math.sin(state.rotYZ);
    const ny = y * c - z * s;
    const nz = y * s + z * c;
    y = ny;
    z = nz;
  }

  return { x, y, z, w };
}

/**
 * Projects a 4D point (x, y, z, w) to 3D space (x3, y3, z3).
 * D4 is 4D viewpoint distance (typically ~2.8 to 3.2).
 */
export function project4Dto3D(v: Vec4, projection: HyperProjectionType, d4: number = 2.6): Vec3 {
  if (projection === 'orthographic') {
    return { x: v.x, y: v.y, z: v.z };
  }

  if (projection === 'stereographic') {
    // Conformal stereographic projection from North Pole of S³
    const denom = Math.max(0.12, 1.0 - v.w * 0.45);
    return {
      x: v.x / denom,
      y: v.y / denom,
      z: v.z / denom,
    };
  }

  // Default: Perspective 4D projection
  // As w approaches d4, scale increases; inner cube is smaller when further in 4D.
  const denom = Math.max(0.25, d4 - v.w);
  const factor = 2.0 / denom;
  return {
    x: v.x * factor,
    y: v.y * factor,
    z: v.z * factor,
  };
}

/**
 * 3D Orbit Camera transformation: rotates 3D point by pitch/yaw, applies zoom and screen mapping.
 */
export function project3Dto2D(
  v: Vec3,
  pitch: number,
  yaw: number,
  zoom: number,
  width: number,
  height: number
): { sx: number; sy: number; depth: number } {
  // Yaw around Y axis
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const x1 = v.x * cosYaw + v.z * sinYaw;
  const z1 = -v.x * sinYaw + v.z * cosYaw;

  // Pitch around X axis
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const y2 = v.y * cosPitch - z1 * sinPitch;
  const z2 = v.y * sinPitch + z1 * cosPitch;

  // 3D Camera distance
  const d3 = 5.2;
  const fov = Math.min(width, height) * 0.42 * zoom;
  const denom = Math.max(0.2, d3 - z2);

  const sx = width * 0.5 + (x1 / denom) * fov;
  const sy = height * 0.5 - (y2 / denom) * fov;

  return { sx, sy, depth: z2 };
}

// ==========================================
// Tesseract (4D Hypercube / 8-cell) Topology
// ==========================================

export interface TesseractData {
  vertices: Vec4[];
  edges: Edge4D[];
  faces: Face4D[];
  cells: Cell4D[];
}

/**
 * Builds the canonical 16 vertices, 32 edges, 24 square faces, and 8 cubic cells
 * of the 4D Hypercube [-1, 1]⁴.
 */
export function createTesseract(): TesseractData {
  const vertices: Vec4[] = [];

  // 16 vertices: (±1, ±1, ±1, ±1)
  for (let i = 0; i < 16; i++) {
    vertices.push({
      x: (i & 1) ? 1 : -1,
      y: (i & 2) ? 1 : -1,
      z: (i & 4) ? 1 : -1,
      w: (i & 8) ? 1 : -1,
    });
  }

  // 32 edges: connect vertices that differ in exactly one coordinate (Hamming distance 1)
  const edges: Edge4D[] = [];
  for (let i = 0; i < 16; i++) {
    for (let bit = 1; bit < 16; bit <<= 1) {
      const j = i ^ bit;
      if (i < j) {
        edges.push({ i, j });
      }
    }
  }

  // 24 square faces (each face has 4 vertices with 2 fixed coordinates and 2 varying)
  const faces: Face4D[] = [];
  const coords: ('x' | 'y' | 'z' | 'w')[] = ['x', 'y', 'z', 'w'];

  for (let c1 = 0; c1 < 4; c1++) {
    for (let c2 = c1 + 1; c2 < 4; c2++) {
      // The other two coordinates are fixed at ±1 (4 combinations)
      const otherCoords = [0, 1, 2, 3].filter((c) => c !== c1 && c !== c2);
      const [o1, o2] = otherCoords;

      for (const val1 of [-1, 1]) {
        for (const val2 of [-1, 1]) {
          // Find the 4 vertices
          const faceVerts: number[] = [];
          for (let idx = 0; idx < 16; idx++) {
            const v = vertices[idx];
            const vArr = [v.x, v.y, v.z, v.w];
            if (vArr[o1] === val1 && vArr[o2] === val2) {
              faceVerts.push(idx);
            }
          }
          if (faceVerts.length === 4) {
            // Sort in cyclic winding order
            const [v0, v1, v2, v3] = faceVerts;
            // Ensure proper loop order: (v0, v1, v3, v2)
            const bit1 = 1 << c1;
            const bit2 = 1 << c2;
            const sorted = [
              v0,
              v0 ^ bit1,
              v0 ^ bit1 ^ bit2,
              v0 ^ bit2,
            ];
            faces.push({ indices: sorted });
          }
        }
      }
    }
  }

  // 8 cubic bounding hypercells (w=±1, x=±1, y=±1, z=±1)
  const cellColors = [
    '#3B82F6', // w = +1 (Outer Cube in standard perspective)
    '#F59E0B', // w = -1 (Inner Cube)
    '#10B981', // x = +1
    '#EC4899', // x = -1
    '#8B5CF6', // y = +1
    '#06B6D4', // y = -1
    '#EF4444', // z = +1
    '#64748B', // z = -1
  ];

  const cellDefinitions: { name: string; normal: string; filter: (v: Vec4) => boolean }[] = [
    { name: 'Hypercell +W (Outer)', normal: 'w = +1', filter: (v) => v.w === 1 },
    { name: 'Hypercell -W (Inner)', normal: 'w = -1', filter: (v) => v.w === -1 },
    { name: 'Hypercell +X (Right)', normal: 'x = +1', filter: (v) => v.x === 1 },
    { name: 'Hypercell -X (Left)', normal: 'x = -1', filter: (v) => v.x === -1 },
    { name: 'Hypercell +Y (Top)', normal: 'y = +1', filter: (v) => v.y === 1 },
    { name: 'Hypercell -Y (Bottom)', normal: 'y = -1', filter: (v) => v.y === -1 },
    { name: 'Hypercell +Z (Front)', normal: 'z = +1', filter: (v) => v.z === 1 },
    { name: 'Hypercell -Z (Back)', normal: 'z = -1', filter: (v) => v.z === -1 },
  ];

  const cells: Cell4D[] = cellDefinitions.map((def, idx) => {
    const indices: number[] = [];
    vertices.forEach((v, vIdx) => {
      if (def.filter(v)) indices.push(vIdx);
    });
    return {
      id: idx,
      name: def.name,
      normal: def.normal,
      indices,
      color: cellColors[idx],
    };
  });

  return { vertices, edges, faces, cells };
}

// ==========================================
// Tesseract 3D Hyperplane Slicing Algorithm
// ==========================================

export interface SlicePolygon3D {
  points: Vec3[];
  color: string;
}

/**
 * Computes the 3D cross section of a 4D hypercube sliced by the hyperplane w = sliceW.
 * For each edge of the tesseract, if the edge crosses w = sliceW, interpolate the (x, y, z) 3D coordinate.
 */
export function computeHyperplaneSlice(
  vertices: Vec4[],
  edges: Edge4D[],
  sliceW: number
): { intersectionPoints: Vec3[]; lines: { p1: Vec3; p2: Vec3 }[] } {
  const edgeIntersections: { edgeIdx: number; pt: Vec3 }[] = [];

  edges.forEach((edge, eIdx) => {
    const v1 = vertices[edge.i];
    const v2 = vertices[edge.j];

    const minW = Math.min(v1.w, v2.w);
    const maxW = Math.max(v1.w, v2.w);

    if (sliceW >= minW && sliceW <= maxW && minW !== maxW) {
      const t = (sliceW - v1.w) / (v2.w - v1.w);
      const pt: Vec3 = {
        x: v1.x + t * (v2.x - v1.x),
        y: v1.y + t * (v2.y - v1.y),
        z: v1.z + t * (v2.z - v1.z),
      };
      edgeIntersections.push({ edgeIdx: eIdx, pt });
    }
  });

  const lines: { p1: Vec3; p2: Vec3 }[] = [];
  const points = edgeIntersections.map((ei) => ei.pt);

  // Connect points that share a 2D square face crossing w = sliceW
  // A square face has 4 edges; if 2 of its edges are intersected, connect them.
  // (Simplified distance-based clustering for clean cross-sectional wireframe)
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dz = p1.z - p2.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      // In the [-1, 1]⁴ hypercube slice, adjacent face intersections are at distance <= 2.01
      if (distSq <= 4.05 && distSq > 1e-4) {
        // Check if only 1 or 2 coordinates differ
        let coordDiffs = 0;
        if (Math.abs(p1.x - p2.x) > 1e-4) coordDiffs++;
        if (Math.abs(p1.y - p2.y) > 1e-4) coordDiffs++;
        if (Math.abs(p1.z - p2.z) > 1e-4) coordDiffs++;

        if (coordDiffs <= 2) {
          lines.push({ p1, p2 });
        }
      }
    }
  }

  return { intersectionPoints: points, lines };
}

// ==========================================
// Tesseract Dalí Net (Unfolding)
// ==========================================

export interface UnfoldedCube {
  name: string;
  center: Vec3;
  color: string;
}

/**
 * Computes the 3D positions of the 8 cubes in Salvador Dalí's Corpus Hypercubus net.
 * Morph smoothly from 4D folded state (unfoldProgress = 0) to 3D unfolded Latin cross (unfoldProgress = 1).
 */
export function computeDaliNetPositions(unfoldProgress: number): UnfoldedCube[] {
  // Latin cross in 3D:
  // Base central cube at (0, 0, 0)
  // +Y (0, 2, 0), +Y2 (0, 4, 0), -Y (0, -2, 0)
  // +X (2, 0, 0), -X (-2, 0, 0)
  // +Z (0, 0, 2), -Z (0, 0, -2)
  const targets: { name: string; center: Vec3; color: string }[] = [
    { name: 'Core Cube (W=0)', center: { x: 0, y: 0, z: 0 }, color: '#3B82F6' },
    { name: 'Top 1 Cube (+Y)', center: { x: 0, y: 2, z: 0 }, color: '#8B5CF6' },
    { name: 'Top 2 Cube (+2Y)', center: { x: 0, y: 4, z: 0 }, color: '#A855F7' },
    { name: 'Bottom Cube (-Y)', center: { x: 0, y: -2, z: 0 }, color: '#06B6D4' },
    { name: 'Right Cube (+X)', center: { x: 2, y: 0, z: 0 }, color: '#10B981' },
    { name: 'Left Cube (-X)', center: { x: -2, y: 0, z: 0 }, color: '#EC4899' },
    { name: 'Front Cube (+Z)', center: { x: 0, y: 0, z: 2 }, color: '#EF4444' },
    { name: 'Back Cube (-Z)', center: { x: 0, y: 0, z: -2 }, color: '#F59E0B' },
  ];

  return targets.map((t) => ({
    name: t.name,
    center: {
      x: t.center.x * unfoldProgress,
      y: t.center.y * unfoldProgress,
      z: t.center.z * unfoldProgress,
    },
    color: t.color,
  }));
}

// ==========================================
// Hypersphere (4D 3-Sphere / S³) & Hopf Fibration
// ==========================================

export interface HopfFiberRing {
  points: Vec4[];
  color: string;
  latitude: number;
  longitude: number;
}

/**
 * Generates the Hopf Fibration: a continuous family of interlocking, linked great circles (fibers)
 * on the 3-sphere S³ defined by x² + y² + z² + w² = 1.
 * 
 * In stereographic projection from S³ into ℝ³, each fiber circle projects into a magnificent
 * family of nested Villarceau circles on Clifford tori with linking number 1!
 */
export function generateHopfFibration(
  numFibers: number = 18,
  numLatitudes: number = 6,
  ptsPerFiber: number = 48
): HopfFiberRing[] {
  const fibers: HopfFiberRing[] = [];

  // Latitude parameter eta in (0, pi/2)
  for (let latIdx = 1; latIdx <= numLatitudes; latIdx++) {
    const eta = (latIdx / (numLatitudes + 1)) * (Math.PI / 2);
    const cosEta = Math.cos(eta);
    const sinEta = Math.sin(eta);

    // Color gradient based on latitude
    const hue = (latIdx / numLatitudes) * 320;
    const color = `hsl(${hue}, 85%, 60%)`;

    // Longitude parameter xi2
    for (let fIdx = 0; fIdx < numFibers; fIdx++) {
      const xi2 = (fIdx / numFibers) * 2 * Math.PI;

      // Each fiber is parametrized by xi1 in [0, 2pi)
      const points: Vec4[] = [];
      for (let pIdx = 0; pIdx <= ptsPerFiber; pIdx++) {
        const xi1 = (pIdx / ptsPerFiber) * 2 * Math.PI;

        // Parametric formula for Hopf fiber on S³:
        // z1 = cos(eta) * exp(i * xi1)
        // z2 = sin(eta) * exp(i * (xi1 + xi2))
        const x = cosEta * Math.cos(xi1);
        const y = cosEta * Math.sin(xi1);
        const z = sinEta * Math.cos(xi1 + xi2);
        const w = sinEta * Math.sin(xi1 + xi2);

        points.push({ x, y, z, w });
      }

      fibers.push({
        points,
        color,
        latitude: eta,
        longitude: xi2,
      });
    }
  }

  return fibers;
}

/**
 * Generates great circle rings on the 3-sphere S³ for wireframe geodesic visualization.
 */
export function generateHypersphereMeridians(numCircles: number = 16, ptsPerCircle: number = 48): Vec4[][] {
  const circles: Vec4[][] = [];

  // Meridian circles in XY, XZ, XW, YZ, YW, ZW planes
  const pairs: [number, number][] = [
    [0, 1], // XY
    [0, 2], // XZ
    [0, 3], // XW
    [1, 2], // YZ
    [1, 3], // YW
    [2, 3], // ZW
  ];

  pairs.forEach(([c1, c2]) => {
    for (let offset = 0; offset < numCircles / 4; offset++) {
      const angleOffset = (offset / (numCircles / 4)) * Math.PI;
      const pts: Vec4[] = [];

      for (let i = 0; i <= ptsPerCircle; i++) {
        const t = (i / ptsPerCircle) * 2 * Math.PI;
        const v = [0, 0, 0, 0];
        v[c1] = Math.cos(t);
        v[c2] = Math.sin(t);

        // Perturb into other coordinates for spherical coverage
        const other1 = [0, 1, 2, 3].find((c) => c !== c1 && c !== c2)!;
        const other2 = [0, 1, 2, 3].find((c) => c !== c1 && c !== c2 && c !== other1)!;
        v[other1] = Math.sin(angleOffset) * 0.35 * Math.sin(t);
        v[other2] = Math.cos(angleOffset) * 0.35 * Math.cos(t);

        // Normalize to unit sphere S³
        const norm = Math.hypot(v[0], v[1], v[2], v[3]);
        pts.push({
          x: v[0] / norm,
          y: v[1] / norm,
          z: v[2] / norm,
          w: v[3] / norm,
        });
      }
      circles.push(pts);
    }
  });

  return circles;
}
