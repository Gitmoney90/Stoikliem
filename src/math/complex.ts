/**
 * Principia Graphica - Complex Plane, Argand Analysis, Complex Vector Fields & Fractal Engine
 * Provides complex arithmetic, Polya vector fields, phase coloring, Mandelbrot, Julia & Newton fractals.
 */

import { Viewport, ThemeConfig } from '../types/graph';
import { EvalScope } from './evaluator';

export interface Complex {
  re: number;
  im: number;
}

export function c_create(re: number, im: number): Complex {
  return { re, im };
}

export function c_add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function c_sub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function c_mul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

export function c_div(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return { re: Infinity, im: Infinity };
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

export function c_abs(a: Complex): number {
  return Math.hypot(a.re, a.im);
}

export function c_abs2(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

export function c_arg(a: Complex): number {
  return Math.atan2(a.im, a.re);
}

export function c_exp(a: Complex): Complex {
  const r = Math.exp(a.re);
  return { re: r * Math.cos(a.im), im: r * Math.sin(a.im) };
}

export function c_sin(a: Complex): Complex {
  return {
    re: Math.sin(a.re) * Math.cosh(a.im),
    im: Math.cos(a.re) * Math.sinh(a.im),
  };
}

export function c_cos(a: Complex): Complex {
  return {
    re: Math.cos(a.re) * Math.cosh(a.im),
    im: -Math.sin(a.re) * Math.sinh(a.im),
  };
}

export function c_ln(a: Complex): Complex {
  return {
    re: Math.log(c_abs(a)),
    im: c_arg(a),
  };
}

export function c_pow(a: Complex, n: number): Complex {
  const r = Math.pow(c_abs(a), n);
  const theta = c_arg(a) * n;
  return { re: r * Math.cos(theta), im: r * Math.sin(theta) };
}

export function formatComplex(re: number, im: number, precision: number = 3): string {
  if (Math.abs(re) < 1e-6 && Math.abs(im) < 1e-6) return '0';
  const reStr = re.toFixed(precision);
  const imAbs = Math.abs(im);
  const imStr = imAbs.toFixed(precision);

  if (Math.abs(re) < 1e-6) {
    if (Math.abs(im - 1) < 1e-4) return 'i';
    if (Math.abs(im + 1) < 1e-4) return '-i';
    return `${im < 0 ? '-' : ''}${imStr}i`;
  }
  if (Math.abs(im) < 1e-6) return reStr;

  const sign = im >= 0 ? '+' : '-';
  const unit = Math.abs(imAbs - 1) < 1e-4 ? 'i' : `${imStr}i`;
  return `${reStr} ${sign} ${unit}`;
}

export interface VectorFieldPoint {
  x: number;
  y: number;
  sx: number;
  sy: number;
  u: number;
  v: number;
  magnitude: number;
  phase: number; // in [-PI, PI]
}

/**
 * Computes vector field values across a regular grid on the viewport
 */
export function computeComplexVectorGrid(
  evalU: (x: number, y: number, scope: EvalScope) => number,
  evalV: (x: number, y: number, scope: EvalScope) => number,
  viewport: Viewport,
  scope: EvalScope,
  gridCols: number = 22,
  isPolya: boolean = false
): VectorFieldPoint[] {
  const { xMin, xMax, yMin, yMax, width, height } = viewport;
  const aspect = height / width;
  const gridRows = Math.max(10, Math.round(gridCols * aspect));

  const stepX = (xMax - xMin) / gridCols;
  const stepY = (yMax - yMin) / gridRows;

  const points: VectorFieldPoint[] = [];

  for (let i = 0; i <= gridCols; i++) {
    const x = xMin + (i + 0.5) * stepX;
    const sx = ((x - xMin) / (xMax - xMin)) * width;

    for (let j = 0; j <= gridRows; j++) {
      const y = yMin + (j + 0.5) * stepY;
      const sy = ((yMax - y) / (yMax - yMin)) * height;

      try {
        let u = evalU(x, y, scope);
        let v = evalV(x, y, scope);

        if (isPolya) {
          // Polya conjugate vector field: (u, -v)
          v = -v;
        }

        if (isNaN(u) || isNaN(v) || !isFinite(u) || !isFinite(v)) {
          continue;
        }

        const mag = Math.hypot(u, v);
        const phase = Math.atan2(v, u);

        points.push({
          x,
          y,
          sx,
          sy,
          u,
          v,
          magnitude: mag,
          phase,
        });
      } catch {
        // Skip singularity
      }
    }
  }

  return points;
}

/**
 * Phase colormap for complex arguments / vectors
 * Maps angle [-PI, PI] to a vibrant, harmonious scientific palette
 */
export function phaseToColor(phase: number, theme: ThemeConfig, alpha: number = 0.85): string {
  // Normalize angle to [0, 1]
  const norm = (phase + Math.PI) / (2 * Math.PI);
  const hue = Math.floor(norm * 360);

  // If theme is slate / dark, high lightness; if parchment, rich saturation
  if (theme.id === 'slate' || theme.id === 'engraving') {
    return `hsla(${hue}, 85%, 65%, ${alpha})`;
  } else if (theme.id === 'cartographer') {
    return `hsla(${hue}, 75%, 45%, ${alpha})`;
  } else {
    // Parchment / manuscript
    return `hsla(${hue}, 80%, 42%, ${alpha})`;
  }
}

/**
 * Fast procedural Mandelbrot set renderer directly to Canvas ImageData
 */
export function renderMandelbrotToContext(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  theme: ThemeConfig,
  maxIterations: number = 80,
  downsample: number = 1
) {
  const { xMin, xMax, yMin, yMax, width, height } = viewport;
  const renderW = Math.max(10, Math.floor(width / downsample));
  const renderH = Math.max(10, Math.floor(height / downsample));

  const offscreen = document.createElement('canvas');
  offscreen.width = renderW;
  offscreen.height = renderH;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(renderW, renderH);
  const data = imgData.data;

  const dx = (xMax - xMin) / renderW;
  const dy = (yMax - yMin) / renderH;

  const isDark = theme.id === 'slate' || theme.id === 'engraving';

  for (let py = 0; py < renderH; py++) {
    const cy = yMax - py * dy;
    const rowOffset = py * renderW * 4;

    for (let px = 0; px < renderW; px++) {
      const cx = xMin + px * dx;

      // Quick Cardioid and Period-2 bulb check for instant speedup
      const q = (cx - 0.25) * (cx - 0.25) + cy * cy;
      if (q * (q + (cx - 0.25)) <= 0.25 * cy * cy || (cx + 1) * (cx + 1) + cy * cy <= 0.0625) {
        // Inside main cardioid or period-2 bulb: color interior
        const idx = rowOffset + px * 4;
        if (isDark) {
          data[idx] = 15;
          data[idx + 1] = 23;
          data[idx + 2] = 42;
          data[idx + 3] = 230;
        } else {
          data[idx] = 28;
          data[idx + 1] = 25;
          data[idx + 2] = 23;
          data[idx + 3] = 220;
        }
        continue;
      }

      let zr = 0;
      let zi = 0;
      let zr2 = 0;
      let zi2 = 0;
      let n = 0;

      while (zr2 + zi2 <= 4.0 && n < maxIterations) {
        zi = 2 * zr * zi + cy;
        zr = zr2 - zi2 + cx;
        zr2 = zr * zr;
        zi2 = zi * zi;
        n++;
      }

      const idx = rowOffset + px * 4;

      if (n === maxIterations) {
        // Interior (set member)
        if (isDark) {
          data[idx] = 10;
          data[idx + 1] = 15;
          data[idx + 2] = 30;
          data[idx + 3] = 230;
        } else {
          data[idx] = 24;
          data[idx + 1] = 20;
          data[idx + 2] = 18;
          data[idx + 3] = 220;
        }
      } else {
        // Smooth continuous potential coloring
        const logZn = Math.log(zr2 + zi2) / 2;
        const nu = Math.log(logZn / Math.LN2) / Math.LN2;
        const smoothIter = n + 1 - nu;
        const t = smoothIter / maxIterations;

        // Rich chromatic palette
        if (isDark) {
          // Midnight Sapphire to Electric Amber
          const r = Math.sin(t * 12 + 0.5) * 127 + 128;
          const g = Math.sin(t * 12 + 2.0) * 127 + 128;
          const b = Math.sin(t * 12 + 4.0) * 127 + 128;
          data[idx] = Math.floor(r * 0.9);
          data[idx + 1] = Math.floor(g * 0.85 + 20);
          data[idx + 2] = Math.floor(b * 0.95 + 40);
          data[idx + 3] = 190;
        } else {
          // Antique Parchment Manuscript: Sepia, Indigo & Gold
          const r = Math.sin(t * 10 + 1.2) * 80 + 130;
          const g = Math.sin(t * 10 + 2.4) * 70 + 90;
          const b = Math.sin(t * 10 + 3.8) * 85 + 75;
          data[idx] = Math.floor(r);
          data[idx + 1] = Math.floor(g);
          data[idx + 2] = Math.floor(b);
          data[idx + 3] = 180;
        }
      }
    }
  }

  offCtx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = downsample > 1;
  ctx.drawImage(offscreen, 0, 0, width, height);
  ctx.restore();
}

/**
 * Fast procedural Julia set renderer for z_{n+1} = z_n^2 + c
 */
export function renderJuliaToContext(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  theme: ThemeConfig,
  cr: number = -0.123,
  ci: number = 0.745,
  maxIterations: number = 80,
  downsample: number = 1
) {
  const { xMin, xMax, yMin, yMax, width, height } = viewport;
  const renderW = Math.max(10, Math.floor(width / downsample));
  const renderH = Math.max(10, Math.floor(height / downsample));

  const offscreen = document.createElement('canvas');
  offscreen.width = renderW;
  offscreen.height = renderH;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(renderW, renderH);
  const data = imgData.data;

  const dx = (xMax - xMin) / renderW;
  const dy = (yMax - yMin) / renderH;

  const isDark = theme.id === 'slate' || theme.id === 'engraving';

  for (let py = 0; py < renderH; py++) {
    const y0 = yMax - py * dy;
    const rowOffset = py * renderW * 4;

    for (let px = 0; px < renderW; px++) {
      const x0 = xMin + px * dx;

      let zr = x0;
      let zi = y0;
      let zr2 = zr * zr;
      let zi2 = zi * zi;
      let n = 0;

      while (zr2 + zi2 <= 4.0 && n < maxIterations) {
        zi = 2 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
        zr2 = zr * zr;
        zi2 = zi * zi;
        n++;
      }

      const idx = rowOffset + px * 4;

      if (n === maxIterations) {
        if (isDark) {
          data[idx] = 12;
          data[idx + 1] = 18;
          data[idx + 2] = 32;
          data[idx + 3] = 230;
        } else {
          data[idx] = 25;
          data[idx + 1] = 22;
          data[idx + 2] = 20;
          data[idx + 3] = 220;
        }
      } else {
        const logZn = Math.log(zr2 + zi2) / 2;
        const nu = Math.log(logZn / Math.LN2) / Math.LN2;
        const smoothIter = n + 1 - nu;
        const t = smoothIter / maxIterations;

        if (isDark) {
          // Electric Teal & Emerald & Violet
          const r = Math.sin(t * 14 + 4.5) * 127 + 128;
          const g = Math.sin(t * 14 + 1.2) * 127 + 128;
          const b = Math.sin(t * 14 + 2.8) * 127 + 128;
          data[idx] = Math.floor(r * 0.9);
          data[idx + 1] = Math.floor(g * 0.95 + 20);
          data[idx + 2] = Math.floor(b * 0.9 + 30);
          data[idx + 3] = 195;
        } else {
          // Classical Florentine Crimson & Gold
          const r = Math.sin(t * 11 + 0.3) * 85 + 140;
          const g = Math.sin(t * 11 + 2.1) * 65 + 85;
          const b = Math.sin(t * 11 + 3.7) * 75 + 80;
          data[idx] = Math.floor(r);
          data[idx + 1] = Math.floor(g);
          data[idx + 2] = Math.floor(b);
          data[idx + 3] = 180;
        }
      }
    }
  }

  offCtx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = downsample > 1;
  ctx.drawImage(offscreen, 0, 0, width, height);
  ctx.restore();
}

/**
 * Newton-Raphson Fractal for z^3 - 1 = 0
 */
export function renderNewtonToContext(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  theme: ThemeConfig,
  maxIterations: number = 35,
  downsample: number = 1
) {
  const { xMin, xMax, yMin, yMax, width, height } = viewport;
  const renderW = Math.max(10, Math.floor(width / downsample));
  const renderH = Math.max(10, Math.floor(height / downsample));

  const offscreen = document.createElement('canvas');
  offscreen.width = renderW;
  offscreen.height = renderH;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(renderW, renderH);
  const data = imgData.data;

  const dx = (xMax - xMin) / renderW;
  const dy = (yMax - yMin) / renderH;

  // Roots of z^3 - 1 = 0
  const r1 = { re: 1, im: 0 };
  const r2 = { re: -0.5, im: Math.sqrt(3) / 2 };
  const r3 = { re: -0.5, im: -Math.sqrt(3) / 2 };

  const isDark = theme.id === 'slate' || theme.id === 'engraving';

  for (let py = 0; py < renderH; py++) {
    const y0 = yMax - py * dy;
    const rowOffset = py * renderW * 4;

    for (let px = 0; px < renderW; px++) {
      let zr = xMin + px * dx;
      let zi = y0;
      let iter = 0;
      let rootIdx = 0;

      while (iter < maxIterations) {
        // Newton step: z = z - (z^3 - 1) / (3*z^2) = (2*z^3 + 1) / (3*z^2)
        const zr2 = zr * zr;
        const zi2 = zi * zi;
        const mag2 = zr2 + zi2;
        if (mag2 === 0) break;

        // z^2 = (zr^2 - zi^2) + i*(2*zr*zi)
        const z2r = zr2 - zi2;
        const z2i = 2 * zr * zi;

        // z^3 = z^2 * z
        const z3r = z2r * zr - z2i * zi;
        const z3i = z2r * zi + z2i * zr;

        // num = 2*z^3 + 1
        const numR = 2 * z3r + 1;
        const numI = 2 * z3i;

        // den = 3*z^2
        const denR = 3 * z2r;
        const denI = 3 * z2i;

        const denNorm = denR * denR + denI * denI;
        if (denNorm === 0) break;

        zr = (numR * denR + numI * denI) / denNorm;
        zi = (numI * denR - numR * denI) / denNorm;

        // Proximity checks to the 3 roots
        const d1 = (zr - r1.re) ** 2 + (zi - r1.im) ** 2;
        const d2 = (zr - r2.re) ** 2 + (zi - r2.im) ** 2;
        const d3 = (zr - r3.re) ** 2 + (zi - r3.im) ** 2;

        if (d1 < 1e-4) {
          rootIdx = 1;
          break;
        }
        if (d2 < 1e-4) {
          rootIdx = 2;
          break;
        }
        if (d3 < 1e-4) {
          rootIdx = 3;
          break;
        }
        iter++;
      }

      const idx = rowOffset + px * 4;
      const shade = 1 - (iter / maxIterations) * 0.7;

      if (rootIdx === 1) {
        // Root 1 (Amber / Crimson)
        data[idx] = Math.floor((isDark ? 230 : 185) * shade);
        data[idx + 1] = Math.floor((isDark ? 110 : 70) * shade);
        data[idx + 2] = Math.floor((isDark ? 70 : 50) * shade);
        data[idx + 3] = 180;
      } else if (rootIdx === 2) {
        // Root 2 (Emerald / Jade)
        data[idx] = Math.floor((isDark ? 34 : 20) * shade);
        data[idx + 1] = Math.floor((isDark ? 197 : 125) * shade);
        data[idx + 2] = Math.floor((isDark ? 94 : 80) * shade);
        data[idx + 3] = 180;
      } else if (rootIdx === 3) {
        // Root 3 (Sapphire / Royal Blue)
        data[idx] = Math.floor((isDark ? 59 : 30) * shade);
        data[idx + 1] = Math.floor((isDark ? 130 : 75) * shade);
        data[idx + 2] = Math.floor((isDark ? 246 : 160) * shade);
        data[idx + 3] = 180;
      } else {
        data[idx] = 20;
        data[idx + 1] = 20;
        data[idx + 2] = 20;
        data[idx + 3] = 200;
      }
    }
  }

  offCtx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = downsample > 1;
  ctx.drawImage(offscreen, 0, 0, width, height);
  ctx.restore();
}
