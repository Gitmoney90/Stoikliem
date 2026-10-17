import { Viewport, InequalityType } from '../types/graph';
import { EvalScope } from './evaluator';

export interface ContourSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Executes high-performance Marching Squares to find the 0-level contour of F(x, y) = 0
 * or shaded regions for F(x, y) <= 0 or F(x, y) >= 0.
 */
export function computeImplicitContour(
  evalFn: (x: number, y: number, scope: EvalScope) => number,
  viewport: Viewport,
  scope: EvalScope,
  cellSizePx: number = 1.8
): {
  segments: ContourSegment[];
  shadingPixels?: Uint8ClampedArray; // for implicit inequalities
  gridWidth: number;
  gridHeight: number;
} {
  const { xMin, xMax, yMin, yMax, width, height } = viewport;

  // Determine grid resolution based on cellSize in screen pixels (high fidelity limit)
  const cols = Math.max(16, Math.min(800, Math.ceil(width / cellSizePx)));
  const rows = Math.max(16, Math.min(800, Math.ceil(height / cellSizePx)));

  const dx = (xMax - xMin) / cols;
  const dy = (yMax - yMin) / rows;

  // 1. Evaluate field grid
  // Grid size is (cols + 1) x (rows + 1)
  const gridW = cols + 1;
  const gridH = rows + 1;
  const field = new Float64Array(gridW * gridH);

  for (let r = 0; r <= rows; r++) {
    // Screen Y: 0 is top (yMax), rows is bottom (yMin)
    const yVal = yMax - r * dy;
    const rOffset = r * gridW;

    for (let c = 0; c <= cols; c++) {
      const xVal = xMin + c * dx;
      let val = evalFn(xVal, yVal, scope);

      if (isNaN(val)) {
        val = 1e9;
      }
      // Precision zero handling: if exact zero, use small infinitesimal positive offset
      // Avoid alternating signs which create spurious zero-crossings along diagonal lines
      if (val === 0 || Math.abs(val) < 1e-14) {
        val = 1e-14;
      }
      // Clamp extreme infinities to avoid NaN during interpolation
      if (val > 1e12) val = 1e12;
      if (val < -1e12) val = -1e12;

      field[rOffset + c] = val;
    }
  }

  // 2. March through all cells and generate line segments
  const segments: ContourSegment[] = [];

  // Corner indices in cell (c, r):
  // 0: top-left (c, r)
  // 1: top-right (c+1, r)
  // 2: bottom-right (c+1, r+1)
  // 3: bottom-left (c, r+1)

  for (let r = 0; r < rows; r++) {
    const r0 = r * gridW;
    const r1 = (r + 1) * gridW;

    const screenY0 = r * (height / rows);
    const screenY1 = (r + 1) * (height / rows);

    for (let c = 0; c < cols; c++) {
      const screenX0 = c * (width / cols);
      const screenX1 = (c + 1) * (width / cols);

      const v0 = field[r0 + c];       // TL
      const v1 = field[r0 + c + 1];   // TR
      const v2 = field[r1 + c + 1];   // BR
      const v3 = field[r1 + c];       // BL

      // Skip cell if gradient is impossibly steep (likely an asymptote discontinuity e.g. 1/x)
      const maxDiff = Math.max(
        Math.abs(v0 - v1),
        Math.abs(v1 - v2),
        Math.abs(v2 - v3),
        Math.abs(v3 - v0)
      );
      if (maxDiff > 1e8) continue;

      // 4-bit mask for signs: 1 if positive, 0 if negative
      let cellCase = 0;
      if (v0 > 0) cellCase |= 8; // Bit 3: TL
      if (v1 > 0) cellCase |= 4; // Bit 2: TR
      if (v2 > 0) cellCase |= 2; // Bit 1: BR
      if (v3 > 0) cellCase |= 1; // Bit 0: BL

      // Cases 0 and 15 have all corners with same sign: no zero-crossing
      if (cellCase === 0 || cellCase === 15) continue;

      // Edge interpolation helper:
      // Top edge between (screenX0, screenY0) and (screenX1, screenY0)
      const topEdge = () => {
        const denom = v1 - v0;
        const t = Math.abs(denom) < 1e-12 ? 0.5 : Math.max(0, Math.min(1, -v0 / denom));
        return { x: screenX0 + t * (screenX1 - screenX0), y: screenY0 };
      };

      // Right edge between (screenX1, screenY0) and (screenX1, screenY1)
      const rightEdge = () => {
        const denom = v2 - v1;
        const t = Math.abs(denom) < 1e-12 ? 0.5 : Math.max(0, Math.min(1, -v1 / denom));
        return { x: screenX1, y: screenY0 + t * (screenY1 - screenY0) };
      };

      // Bottom edge between (screenX0, screenY1) and (screenX1, screenY1)
      const bottomEdge = () => {
        const denom = v2 - v3;
        const t = Math.abs(denom) < 1e-12 ? 0.5 : Math.max(0, Math.min(1, -v3 / denom));
        return { x: screenX0 + t * (screenX1 - screenX0), y: screenY1 };
      };

      // Left edge between (screenX0, screenY0) and (screenX0, screenY1)
      const leftEdge = () => {
        const denom = v3 - v0;
        const t = Math.abs(denom) < 1e-12 ? 0.5 : Math.max(0, Math.min(1, -v0 / denom));
        return { x: screenX0, y: screenY0 + t * (screenY1 - screenY0) };
      };

      switch (cellCase) {
        // 1 corner positive / 3 negative
        case 1: { // BL
          const p1 = leftEdge();
          const p2 = bottomEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }
        case 2: { // BR
          const p1 = bottomEdge();
          const p2 = rightEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }
        case 4: { // TR
          const p1 = topEdge();
          const p2 = rightEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }
        case 8: { // TL
          const p1 = topEdge();
          const p2 = leftEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }

        // 2 adjacent corners positive
        case 3: { // BL, BR -> bottom horizontal
          const p1 = leftEdge();
          const p2 = rightEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }
        case 6: { // TR, BR -> right vertical
          const p1 = topEdge();
          const p2 = bottomEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }
        case 9: { // TL, BL -> left vertical
          const p1 = topEdge();
          const p2 = bottomEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }
        case 12: { // TL, TR -> top horizontal
          const p1 = leftEdge();
          const p2 = rightEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }

        // 3 corners positive / 1 corner negative
        case 14: { // Only BL is negative (TL, TR, BR positive)
          const p1 = leftEdge();
          const p2 = bottomEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }
        case 13: { // Only BR is negative
          const p1 = bottomEdge();
          const p2 = rightEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }
        case 11: { // Only TR is negative
          const p1 = topEdge();
          const p2 = rightEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }
        case 7: { // Only TL is negative
          const p1 = topEdge();
          const p2 = leftEdge();
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          break;
        }

        // Saddle cases (opposite corners)
        case 5: { // TL and BR positive, TR and BL negative
          const xMid = xMin + (c + 0.5) * dx;
          const yMid = yMax - (r + 0.5) * dy;
          const vCenter = evalFn(xMid, yMid, scope);
          const ptTop = topEdge();
          const ptRight = rightEdge();
          const ptBottom = bottomEdge();
          const ptLeft = leftEdge();
          const maxMagnitude = Math.max(Math.abs(v0), Math.abs(v1), Math.abs(v2), Math.abs(v3));

          // Compute exact bilinear saddle point (Asymptotic Decider)
          const denom = v0 - v1 + v2 - v3;
          let uSaddle = 0.5;
          let vSaddle = 0.5;
          let saddleVal = vCenter;
          if (Math.abs(denom) > 1e-12) {
            uSaddle = Math.max(0.02, Math.min(0.98, (v0 - v3) / denom));
            vSaddle = Math.max(0.02, Math.min(0.98, (v0 - v1) / denom));
            saddleVal = (v0 * v2 - v1 * v3) / denom;
          }

          // If center or saddle point indicates an intersecting crossing (such as x² = y² or x*y = 0):
          // Connect all 4 edges to the true saddle intersection center so the X-junction is continuous and unbroken!
          if (Math.abs(saddleVal) < 0.40 * maxMagnitude || Math.abs(vCenter) < 1e-5) {
            const pCenter = {
              x: screenX0 + uSaddle * (screenX1 - screenX0),
              y: screenY0 + vSaddle * (screenY1 - screenY0),
            };
            segments.push({ x1: ptTop.x, y1: ptTop.y, x2: pCenter.x, y2: pCenter.y });
            segments.push({ x1: ptBottom.x, y1: ptBottom.y, x2: pCenter.x, y2: pCenter.y });
            segments.push({ x1: ptLeft.x, y1: ptLeft.y, x2: pCenter.x, y2: pCenter.y });
            segments.push({ x1: ptRight.x, y1: ptRight.y, x2: pCenter.x, y2: pCenter.y });
          } else if (saddleVal > 0) {
            segments.push({ x1: ptTop.x, y1: ptTop.y, x2: ptLeft.x, y2: ptLeft.y });
            segments.push({ x1: ptBottom.x, y1: ptBottom.y, x2: ptRight.x, y2: ptRight.y });
          } else {
            segments.push({ x1: ptTop.x, y1: ptTop.y, x2: ptRight.x, y2: ptRight.y });
            segments.push({ x1: ptBottom.x, y1: ptBottom.y, x2: ptLeft.x, y2: ptLeft.y });
          }
          break;
        }
        case 10: { // TR and BL positive, TL and BR negative
          const xMid = xMin + (c + 0.5) * dx;
          const yMid = yMax - (r + 0.5) * dy;
          const vCenter = evalFn(xMid, yMid, scope);
          const ptTop = topEdge();
          const ptRight = rightEdge();
          const ptBottom = bottomEdge();
          const ptLeft = leftEdge();
          const maxMagnitude = Math.max(Math.abs(v0), Math.abs(v1), Math.abs(v2), Math.abs(v3));

          // Compute exact bilinear saddle point (Asymptotic Decider)
          const denom = v0 - v1 + v2 - v3;
          let uSaddle = 0.5;
          let vSaddle = 0.5;
          let saddleVal = vCenter;
          if (Math.abs(denom) > 1e-12) {
            uSaddle = Math.max(0.02, Math.min(0.98, (v0 - v3) / denom));
            vSaddle = Math.max(0.02, Math.min(0.98, (v0 - v1) / denom));
            saddleVal = (v0 * v2 - v1 * v3) / denom;
          }

          if (Math.abs(saddleVal) < 0.40 * maxMagnitude || Math.abs(vCenter) < 1e-5) {
            const pCenter = {
              x: screenX0 + uSaddle * (screenX1 - screenX0),
              y: screenY0 + vSaddle * (screenY1 - screenY0),
            };
            segments.push({ x1: ptTop.x, y1: ptTop.y, x2: pCenter.x, y2: pCenter.y });
            segments.push({ x1: ptBottom.x, y1: ptBottom.y, x2: pCenter.x, y2: pCenter.y });
            segments.push({ x1: ptLeft.x, y1: ptLeft.y, x2: pCenter.x, y2: pCenter.y });
            segments.push({ x1: ptRight.x, y1: ptRight.y, x2: pCenter.x, y2: pCenter.y });
          } else if (saddleVal > 0) {
            segments.push({ x1: ptTop.x, y1: ptTop.y, x2: ptRight.x, y2: ptRight.y });
            segments.push({ x1: ptBottom.x, y1: ptBottom.y, x2: ptLeft.x, y2: ptLeft.y });
          } else {
            segments.push({ x1: ptTop.x, y1: ptTop.y, x2: ptLeft.x, y2: ptLeft.y });
            segments.push({ x1: ptBottom.x, y1: ptBottom.y, x2: ptRight.x, y2: ptRight.y });
          }
          break;
        }
      }
    }
  }

  return {
    segments,
    gridWidth: cols,
    gridHeight: rows,
  };
}

/**
 * Draws the computed marching squares segments onto the 2D canvas context.
 */
export function renderContourSegments(
  ctx: CanvasRenderingContext2D,
  segments: ContourSegment[],
  color: string,
  lineWidth: number = 2
) {
  if (segments.length === 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders implicit inequality shading (e.g. x^2 + y^2 <= 25)
 */
export function renderImplicitShading(
  ctx: CanvasRenderingContext2D,
  evalFn: (x: number, y: number, scope: EvalScope) => number,
  inequality: InequalityType,
  viewport: Viewport,
  scope: EvalScope,
  fillColorRgba: string,
  cellSizePx: number = 4
) {
  if (inequality === 'none') return;

  const { xMin, xMax, yMin, yMax, width, height } = viewport;
  const cols = Math.max(16, Math.min(300, Math.ceil(width / cellSizePx)));
  const rows = Math.max(16, Math.min(300, Math.ceil(height / cellSizePx)));

  const dx = (xMax - xMin) / cols;
  const dy = (yMax - yMin) / rows;
  const cellW = width / cols;
  const cellH = height / rows;

  ctx.save();
  ctx.fillStyle = fillColorRgba;

  const isSatisfied = (val: number) => {
    if (isNaN(val)) return false;
    if (inequality === '<' || inequality === '<=') return val <= 0;
    if (inequality === '>' || inequality === '>=') return val >= 0;
    return false;
  };

  for (let r = 0; r < rows; r++) {
    const yVal = yMax - (r + 0.5) * dy;
    const sy = r * cellH;

    for (let c = 0; c < cols; c++) {
      const xVal = xMin + (c + 0.5) * dx;
      const val = evalFn(xVal, yVal, scope);

      if (isSatisfied(val)) {
        ctx.fillRect(c * cellW, sy, cellW + 0.5, cellH + 0.5);
      }
    }
  }

  ctx.restore();
}
