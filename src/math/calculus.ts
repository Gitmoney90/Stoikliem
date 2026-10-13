import { EvalScope } from './evaluator';
import { Viewport, DetectedPoint } from '../types/graph';

export type RealFunction = (x: number) => number;

/**
 * Centered finite difference numerical derivative:
 * f'(x) ≈ (f(x+h) - f(x-h)) / (2h)
 */
export function numericalDerivative(fn: RealFunction, x: number, h: number = 1e-5): number {
  const y1 = fn(x + h);
  const y0 = fn(x - h);
  if (isNaN(y1) || isNaN(y0)) return NaN;
  return (y1 - y0) / (2 * h);
}

/**
 * Centered finite difference second derivative:
 * f''(x) ≈ (f(x+h) - 2f(x) + f(x-h)) / (h^2)
 */
export function numericalSecondDerivative(fn: RealFunction, x: number, h: number = 1e-4): number {
  const y1 = fn(x + h);
  const ym = fn(x);
  const y0 = fn(x - h);
  if (isNaN(y1) || isNaN(ym) || isNaN(y0)) return NaN;
  return (y1 - 2 * ym + y0) / (h * h);
}

/**
 * Definite integral calculation using Adaptive Simpson's Rule.
 */
export function definiteIntegral(fn: RealFunction, a: number, b: number, n: number = 200): number {
  if (a === b) return 0;
  if (a > b) return -definiteIntegral(fn, b, a, n);

  // Ensure n is even
  const steps = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / steps;

  let sum = fn(a) + fn(b);
  if (isNaN(sum)) sum = 0;

  for (let i = 1; i < steps; i++) {
    const x = a + i * h;
    const y = fn(x);
    if (!isNaN(y) && isFinite(y)) {
      sum += (i % 2 === 0 ? 2 : 4) * y;
    }
  }

  return (h / 3) * sum;
}

/**
 * Computes Riemann Sum values for visualization and numerical estimation.
 */
export function computeRiemannSum(
  fn: RealFunction,
  a: number,
  b: number,
  n: number,
  mode: 'left' | 'right' | 'mid' | 'trapezoid'
): { sum: number; rectangles: { x: number; y: number; width: number; height: number; y2?: number }[] } {
  const [xStart, xEnd] = a <= b ? [a, b] : [b, a];
  const deltaX = (xEnd - xStart) / n;
  let total = 0;
  const rectangles: { x: number; y: number; width: number; height: number; y2?: number }[] = [];

  for (let i = 0; i < n; i++) {
    const leftX = xStart + i * deltaX;
    const rightX = leftX + deltaX;

    let evalPoint = leftX;
    if (mode === 'right') evalPoint = rightX;
    else if (mode === 'mid') evalPoint = leftX + deltaX / 2;

    if (mode === 'trapezoid') {
      const yLeft = fn(leftX);
      const yRight = fn(rightX);
      const h1 = isNaN(yLeft) || !isFinite(yLeft) ? 0 : yLeft;
      const h2 = isNaN(yRight) || !isFinite(yRight) ? 0 : yRight;
      total += 0.5 * (h1 + h2) * deltaX;
      rectangles.push({ x: leftX, y: h1, width: deltaX, height: h1, y2: h2 });
    } else {
      const yVal = fn(evalPoint);
      const height = isNaN(yVal) || !isFinite(yVal) ? 0 : yVal;
      total += height * deltaX;
      rectangles.push({ x: leftX, y: height, width: deltaX, height });
    }
  }

  if (a > b) total = -total;
  return { sum: total, rectangles };
}

/**
 * Computes Arc Length over interval [a, b]:
 * L = \int_a^b \sqrt{1 + (f'(x))^2} dx
 */
export function arcLength(fn: RealFunction, a: number, b: number, n: number = 200): number {
  const integrand = (x: number) => {
    const df = numericalDerivative(fn, x);
    if (isNaN(df)) return 0;
    return Math.sqrt(1 + df * df);
  };
  return definiteIntegral(integrand, Math.min(a, b), Math.max(a, b), n);
}

/**
 * Automatically finds roots (zeros) within viewport using bisection on sign changes.
 */
export function findRootsInInterval(
  fn: RealFunction,
  xMin: number,
  xMax: number,
  samples: number = 400
): number[] {
  const roots: number[] = [];
  const dx = (xMax - xMin) / samples;
  let prevX = xMin;
  let prevY = fn(prevX);

  for (let i = 1; i <= samples; i++) {
    const currX = xMin + i * dx;
    const currY = fn(currX);

    if (isNaN(prevY) || !isFinite(prevY) || isNaN(currY) || !isFinite(currY)) {
      prevX = currX;
      prevY = currY;
      continue;
    }

    // Check for exact zero
    if (Math.abs(currY) < 1e-10) {
      if (!roots.some((r) => Math.abs(r - currX) < 1e-4)) {
        roots.push(currX);
      }
    } else if (prevY * currY < 0 && Math.abs(currY - prevY) < 100) {
      // Sign change detected without massive discontinuity
      // Refine with bisection
      let lo = prevX;
      let hi = currX;
      for (let iter = 0; iter < 24; iter++) {
        const mid = (lo + hi) / 2;
        const midY = fn(mid);
        if (Math.abs(midY) < 1e-12) {
          lo = mid;
          break;
        }
        if (prevY * midY <= 0) {
          hi = mid;
        } else {
          lo = mid;
          prevY = midY;
        }
      }
      const root = (lo + hi) / 2;
      if (!roots.some((r) => Math.abs(r - root) < 1e-4)) {
        roots.push(root);
      }
    }

    prevX = currX;
    prevY = currY;
  }

  return roots;
}

/**
 * Finds local extrema (minima & maxima) by finding zeros of the first derivative.
 */
export function findExtremaInInterval(
  fn: RealFunction,
  xMin: number,
  xMax: number,
  samples: number = 300
): { x: number; y: number; type: 'minimum' | 'maximum' }[] {
  const d1 = (x: number) => numericalDerivative(fn, x);
  const criticalPoints = findRootsInInterval(d1, xMin, xMax, samples);
  const extrema: { x: number; y: number; type: 'minimum' | 'maximum' }[] = [];

  for (const cx of criticalPoints) {
    const yVal = fn(cx);
    if (isNaN(yVal) || !isFinite(yVal)) continue;

    const d2 = numericalSecondDerivative(fn, cx);
    if (!isNaN(d2) && Math.abs(d2) > 1e-7) {
      extrema.push({
        x: cx,
        y: yVal,
        type: d2 > 0 ? 'minimum' : 'maximum',
      });
    }
  }

  return extrema;
}

/**
 * Finds intersection points between two real functions.
 */
export function findIntersections(
  fn1: RealFunction,
  fn2: RealFunction,
  xMin: number,
  xMax: number,
  samples: number = 300
): { x: number; y: number }[] {
  const diffFn = (x: number) => fn1(x) - fn2(x);
  const roots = findRootsInInterval(diffFn, xMin, xMax, samples);

  return roots.map((x) => ({
    x,
    y: (fn1(x) + fn2(x)) / 2,
  })).filter((pt) => !isNaN(pt.y) && isFinite(pt.y));
}
