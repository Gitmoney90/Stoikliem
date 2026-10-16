/**
 * GPU-Accelerated WebGL Raymarching Shader Engine for 3D Algebraic Manifolds & Implicit Surfaces
 * Provides zero-lag 3D rendering, orbital interaction, and real-time slicing with Cartesian synchronization.
 */

export interface AlgebraicManifold {
  id: string;
  name: string;
  subtitle: string;
  degree: number;
  description: string;
  formulaLatex: string;
  glslFunction: string;
  defaultZoom: number;
  sliceRange: [number, number];
  defaultSlice: number;
  getSlice2DFormula: (z: number) => string;
}

export const GOLDEN_RATIO = 1.618033988749895;

export const ALGEBRAIC_MANIFOLDS: AlgebraicManifold[] = [
  {
    id: 'barth_sextic',
    name: 'Barth Sextic',
    subtitle: 'Maximal Nodal Algebraic Surface (Degree 6, 65 Nodes)',
    degree: 6,
    description:
      'Discovered by Wolf Barth in 1996, this degree-6 algebraic surface features exactly 65 $A_1$ real double point singularities—the theoretical maximum known for degree 6 under Kummer bounds.',
    formulaLatex: '4(\\phi^2 x^2 - y^2)(\\phi^2 y^2 - z^2)(\\phi^2 z^2 - x^2) - (1 + 2\\phi)(x^2 + y^2 + z^2 - 1)^2 = 0',
    defaultZoom: 2.5,
    sliceRange: [-1.8, 1.8],
    defaultSlice: 0.0,
    getSlice2DFormula: (z: number) => {
      const zVal = Number(z.toFixed(3));
      return `4*(2.618*x^2 - y^2)*(2.618*y^2 - ${Number((zVal * zVal).toFixed(3))})*(2.618*${Number((zVal * zVal).toFixed(3))} - x^2) - 4.236*(x^2 + y^2 + ${Number((zVal * zVal).toFixed(3))} - 1)^2 = 0`;
    },
    glslFunction: `
      float evalManifold(vec3 p) {
        float phi = 1.6180339887;
        float phi2 = phi * phi;
        float x2 = p.x * p.x;
        float y2 = p.y * p.y;
        float z2 = p.z * p.z;
        float r2 = x2 + y2 + z2;
        float f1 = 4.0 * (phi2 * x2 - y2) * (phi2 * y2 - z2) * (phi2 * z2 - x2);
        float f2 = (1.0 + 2.0 * phi) * pow(r2 - 1.0, 2.0);
        return f1 - f2;
      }
    `,
  },
  {
    id: 'clebsch_cubic',
    name: 'Clebsch Diagonal Cubic',
    subtitle: 'Smooth Cubic Surface Containing 27 Real Lines (Degree 3)',
    degree: 3,
    description:
      'Discovered in 1871 by Alfred Clebsch, this is the unique cubic surface invariant under permutations of 5 coordinates where all 27 lines predicted by Cayley and Salmon are completely real.',
    formulaLatex: '81(x^3 + y^3 + z^3) - 189(x^2 y + x^2 z + y^2 x + y^2 z + z^2 x + z^2 y) + 54 xyz + 126(xy + yz + zx) - 9(x+y+z) - 1 = 0',
    defaultZoom: 2.2,
    sliceRange: [-1.5, 1.5],
    defaultSlice: 0.2,
    getSlice2DFormula: (z: number) => {
      const zVal = Number(z.toFixed(2));
      return `81*(x^3 + y^3 + ${Number((zVal**3).toFixed(2))}) - 189*(x^2*y + x^2*${zVal} + y^2*x + y^2*${zVal} + ${Number((zVal**2).toFixed(2))}*x + ${Number((zVal**2).toFixed(2))}*y) + 54*x*y*${zVal} + 126*(x*y + y*${zVal} + ${zVal}*x) - 9*(x + y + ${zVal}) - 1 = 0`;
    },
    glslFunction: `
      float evalManifold(vec3 p) {
        float x = p.x; float y = p.y; float z = p.z;
        float sum3 = x*x*x + y*y*y + z*z*z;
        float sum21 = (x*x*y + x*x*z + y*y*x + y*y*z + z*z*x + z*z*y);
        float xyz = x * y * z;
        float sum2 = x*y + y*z + z*x;
        float sum1 = x + y + z;
        return 81.0 * sum3 - 189.0 * sum21 + 54.0 * xyz + 126.0 * sum2 - 9.0 * sum1 - 1.0;
      }
    `,
  },
  {
    id: 'kummer_quartic',
    name: 'Kummer Quartic Surface',
    subtitle: 'Classical Nodal Quartic with 16 Singularities (Degree 4)',
    degree: 4,
    description:
      'Investigated by Ernst Kummer in 1864, this quartic algebraic surface possesses 16 nodal double points and 16 singular tangent planes (a 16_6 configuration in algebraic geometry).',
    formulaLatex: '(x^2 + y^2 + z^2 - w^2)^2 - \\frac{3\\mu^2 - 1}{3 - \\mu^2}(x^2(y^2+z^2) + y^2 z^2) = 0',
    defaultZoom: 2.4,
    sliceRange: [-1.6, 1.6],
    defaultSlice: 0.1,
    getSlice2DFormula: (z: number) => {
      const z2 = Number((z * z).toFixed(3));
      return `(x^2 + y^2 + ${z2} - 1)^2 - 1.25*(x^2*(y^2 + ${z2}) + y^2*${z2}) = 0`;
    },
    glslFunction: `
      float evalManifold(vec3 p) {
        float x2 = p.x * p.x;
        float y2 = p.y * p.y;
        float z2 = p.z * p.z;
        float r2 = x2 + y2 + z2;
        float w2 = 1.0;
        float term1 = pow(r2 - w2, 2.0);
        float term2 = 1.25 * (x2 * (y2 + z2) + y2 * z2);
        return term1 - term2;
      }
    `,
  },
  {
    id: 'goursat_tanglecube',
    name: 'Goursat Tanglecube',
    subtitle: 'Octahedral Symmetric Quartic Manifold (Degree 4)',
    degree: 4,
    description:
      'An algebraic manifold with complete octahedral symmetry $O_h$, exhibiting interlacing tubular branches and topological handles.',
    formulaLatex: 'x^4 + y^4 + z^4 - 5(x^2 + y^2 + z^2) + 11.8 = 0',
    defaultZoom: 3.2,
    sliceRange: [-2.0, 2.0],
    defaultSlice: 0.0,
    getSlice2DFormula: (z: number) => {
      const zVal = Number(z.toFixed(2));
      const z2 = Number((zVal * zVal).toFixed(2));
      const z4 = Number((z2 * z2).toFixed(2));
      return `x^4 + y^4 + ${z4} - 5*(x^2 + y^2 + ${z2}) + 11.8 = 0`;
    },
    glslFunction: `
      float evalManifold(vec3 p) {
        float x2 = p.x * p.x; float y2 = p.y * p.y; float z2 = p.z * p.z;
        float x4 = x2 * x2; float y4 = y2 * y2; float z4 = z2 * z2;
        return (x4 + y4 + z4) - 5.0 * (x2 + y2 + z2) + 11.8;
      }
    `,
  },
  {
    id: 'chmutov_genus2',
    name: 'Chmutov Genus-2 Surface',
    subtitle: 'Folded Chebyshev Algebraic Locus (Degree 4)',
    degree: 4,
    description:
      'Constructed from Chebyshev polynomials $T_4(x) + T_4(y) + T_4(z) = 0$, maximizing the number of isolated singularities and symmetric saddles in affine space.',
    formulaLatex: '8(x^4 + y^4 + z^4) - 8(x^2 + y^2 + z^2) + 1 = 0',
    defaultZoom: 2.2,
    sliceRange: [-1.2, 1.2],
    defaultSlice: 0.0,
    getSlice2DFormula: (z: number) => {
      const zVal = Number(z.toFixed(2));
      const z2 = Number((zVal * zVal).toFixed(3));
      const z4 = Number((z2 * z2).toFixed(3));
      return `8*(x^4 + y^4 + ${z4}) - 8*(x^2 + y^2 + ${z2}) + 1 = 0`;
    },
    glslFunction: `
      float evalManifold(vec3 p) {
        float x2 = p.x*p.x; float y2 = p.y*p.y; float z2 = p.z*p.z;
        float x4 = x2*x2; float y4 = y2*y2; float z4 = z2*z2;
        return 8.0 * (x4 + y4 + z4) - 8.0 * (x2 + y2 + z2) + 1.0;
      }
    `,
  },
  {
    id: 'ring_torus',
    name: 'Ring Torus & Villarceau Circles',
    subtitle: 'Genus-1 Algebraic Manifold with Slicing Circles (Degree 4)',
    degree: 4,
    description:
      'A canonical genus-1 torus with major radius $R=2.0$ and minor radius $r=0.8$. When sliced by bitangent planes, the cross-section splits into Villarceau circles.',
    formulaLatex: '(x^2 + y^2 + z^2 + R^2 - r^2)^2 - 4 R^2 (x^2 + y^2) = 0',
    defaultZoom: 3.5,
    sliceRange: [-1.2, 1.2],
    defaultSlice: 0.4,
    getSlice2DFormula: (z: number) => {
      const z2 = Number((z * z).toFixed(3));
      return `(x^2 + y^2 + ${z2} + 3.36)^2 - 16*(x^2 + y^2) = 0`;
    },
    glslFunction: `
      float evalManifold(vec3 p) {
        float R = 1.8;
        float r = 0.7;
        float x2 = p.x*p.x; float y2 = p.y*p.y; float z2 = p.z*p.z;
        float r2 = x2 + y2 + z2;
        return pow(r2 + R*R - r*r, 2.0) - 4.0 * R*R * (x2 + y2);
      }
    `,
  },
  {
    id: 'cassini_ovaloid',
    name: 'Cassini 3D Ovaloid',
    subtitle: 'Topological Bifurcation Manifold (Degree 4)',
    degree: 4,
    description:
      'Locus of points where the product of Euclidean distances to two focal points is constant. Slicing through $z$ exhibits topological transition from single ovaloid to double hourglass.',
    formulaLatex: '((x-a)^2 + y^2 + z^2)((x+a)^2 + y^2 + z^2) - c^4 = 0',
    defaultZoom: 2.8,
    sliceRange: [-1.4, 1.4],
    defaultSlice: 0.0,
    getSlice2DFormula: (z: number) => {
      const z2 = Number((z * z).toFixed(3));
      return `((x - 1.2)^2 + y^2 + ${z2}) * ((x + 1.2)^2 + y^2 + ${z2}) - 2.2 = 0`;
    },
    glslFunction: `
      float evalManifold(vec3 p) {
        float a = 1.15;
        float c4 = 2.0;
        float d1 = pow(p.x - a, 2.0) + p.y*p.y + p.z*p.z;
        float d2 = pow(p.x + a, 2.0) + p.y*p.y + p.z*p.z;
        return d1 * d2 - c4;
      }
    `,
  },
];

/**
 * Returns complete WebGL vertex shader source for raymarching quad.
 */
export const RAYMARCH_VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

/**
 * Builds the complete WebGL fragment shader source with custom manifold formula and real-time slicing.
 */
export function buildRaymarchFragmentShader(manifold: AlgebraicManifold, themeId: string): string {
  // Theme color palette mappings for shader lighting
  let baseColor = 'vec3(0.92, 0.88, 0.79)'; // Parchment
  let specularColor = 'vec3(0.72, 0.55, 0.35)';
  let sliceColor = 'vec3(0.85, 0.25, 0.15)'; // Crimson slice indicator
  let bgGradientTop = 'vec3(0.12, 0.11, 0.10)';
  let bgGradientBottom = 'vec3(0.06, 0.05, 0.05)';

  if (themeId === 'slate' || themeId === 'engraving') {
    baseColor = 'vec3(0.58, 0.72, 0.95)'; // Cyan-Cobalt Slate
    specularColor = 'vec3(0.85, 0.92, 1.0)';
    sliceColor = 'vec3(0.98, 0.65, 0.12)'; // Amber slice indicator
    bgGradientTop = 'vec3(0.08, 0.10, 0.14)';
    bgGradientBottom = 'vec3(0.03, 0.04, 0.06)';
  } else if (themeId === 'cartographer') {
    baseColor = 'vec3(0.80, 0.72, 0.58)'; // Sepia
    specularColor = 'vec3(0.95, 0.88, 0.75)';
    sliceColor = 'vec3(0.20, 0.55, 0.40)'; // Emerald
    bgGradientTop = 'vec3(0.14, 0.12, 0.10)';
    bgGradientBottom = 'vec3(0.07, 0.06, 0.05)';
  }

  return `
    precision highp float;
    varying vec2 v_uv;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_yaw;
    uniform float u_pitch;
    uniform float u_zoom;
    uniform float u_sliceZ;
    uniform float u_sliceActive;
    uniform float u_sliceClip;
    uniform vec3 u_pan;

    ${manifold.glslFunction}

    // Estimate analytical normal via forward/central differences
    vec3 calcNormal(vec3 p) {
      float eps = 0.002;
      float d = evalManifold(p);
      return normalize(vec3(
        evalManifold(p + vec3(eps, 0.0, 0.0)) - evalManifold(p - vec3(eps, 0.0, 0.0)),
        evalManifold(p + vec3(0.0, eps, 0.0)) - evalManifold(p - vec3(0.0, eps, 0.0)),
        evalManifold(p + vec3(0.0, 0.0, eps)) - evalManifold(p - vec3(0.0, 0.0, eps))
      ));
    }

    mat3 rotateY(float angle) {
      float c = cos(angle); float s = sin(angle);
      return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
    }

    mat3 rotateX(float angle) {
      float c = cos(angle); float s = sin(angle);
      return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
    }

    void main() {
      vec2 screenCoord = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

      // Camera Ray setup
      float dist = u_zoom;
      vec3 ro = vec3(0.0, 0.0, dist);
      vec3 rd = normalize(vec3(screenCoord, -1.8));

      // Orbit rotations
      mat3 rot = rotateY(u_yaw) * rotateX(u_pitch);
      ro = rot * ro + u_pan;
      rd = rot * rd;

      // Raymarching parameters
      const int MAX_STEPS = 120;
      float tMin = 0.1;
      float tMax = dist + 5.0;
      float dt = (tMax - tMin) / float(MAX_STEPS);

      float t = tMin;
      float prevF = evalManifold(ro + rd * t);
      bool hit = false;
      vec3 hitPos = vec3(0.0);
      bool isSliceHit = false;

      for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;

        // Clipping by slicing plane if enabled
        if (u_sliceClip > 0.5 && p.z > u_sliceZ) {
          t += dt;
          prevF = evalManifold(ro + rd * t);
          continue;
        }

        float curF = evalManifold(p);

        // Sign change detection: manifold boundary crossing f(p) = 0
        if (prevF * curF < 0.0) {
          // Secant root refinement
          float tExact = t - dt * (curF / (curF - prevF));
          hitPos = ro + rd * tExact;

          // Double check clipping
          if (!(u_sliceClip > 0.5 && hitPos.z > u_sliceZ)) {
            hit = true;
            break;
          }
        }

        prevF = curF;
        t += dt;
      }

      // Background procedural vignette
      vec3 color = mix(${bgGradientTop}, ${bgGradientBottom}, length(screenCoord) * 0.8);

      if (hit) {
        vec3 norm = calcNormal(hitPos);

        // Lighting model: Key Light + Fill Light + Ambient
        vec3 light1 = normalize(vec3(1.0, 1.5, 1.2));
        vec3 light2 = normalize(vec3(-1.0, -0.8, -0.5));
        vec3 viewDir = -rd;

        float diff1 = max(dot(norm, light1), 0.0);
        float diff2 = max(dot(norm, light2), 0.0) * 0.4;
        vec3 halfVec = normalize(light1 + viewDir);
        float spec = pow(max(dot(norm, halfVec), 0.0), 32.0);

        // Curvature / Fresnel rim light
        float rim = pow(1.0 - max(dot(norm, viewDir), 0.0), 2.5) * 0.35;

        // Base surface shading
        vec3 surfaceCol = ${baseColor} * (diff1 * 0.75 + diff2 + 0.22) + ${specularColor} * spec + rim;

        // Slicing contour glow intersection test (z == u_sliceZ)
        if (u_sliceActive > 0.5) {
          float distToSlice = abs(hitPos.z - u_sliceZ);
          if (distToSlice < 0.04) {
            float sliceFactor = 1.0 - smoothstep(0.0, 0.04, distToSlice);
            surfaceCol = mix(surfaceCol, ${sliceColor} * 1.6, sliceFactor * 0.85);
          }
        }

        color = surfaceCol;
      }

      // Slicing boundary grid planes indicator
      if (u_sliceActive > 0.5 && !hit) {
        // Intersect ray with slice plane z = u_sliceZ
        if (abs(rd.z) > 0.001) {
          float tSlice = (u_sliceZ - ro.z) / rd.z;
          if (tSlice > 0.0 && tSlice < tMax) {
            vec3 pSlice = ro + rd * tSlice;
            float rSlice = length(pSlice.xy);
            if (rSlice < 2.5) {
              // Subtle concentric grid rings on the cutting plane
              float grid = step(0.96, fract(rSlice * 2.0)) * 0.15;
              float border = smoothstep(2.5, 2.4, rSlice);
              color += ${sliceColor} * (0.04 + grid) * border;
            }
          }
        }
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `;
}
