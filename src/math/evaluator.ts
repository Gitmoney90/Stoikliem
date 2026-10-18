import { ASTNode, Parser, normalizeMathInput } from './parser';
import { EquationType, InequalityType } from '../types/graph';
import nerdamer from 'nerdamer';

export type EvalScope = Record<string, number>;

// Gamma function Lanczos approximation for factorial
function gamma(z: number): number {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  z -= 1;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.138571095836526,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let x = p[0];
  for (let i = 1; i < p.length; i++) {
    x += p[i] / (z + i);
  }
  const t = z + p.length - 1.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function factorial(n: number): number {
  if (n < 0) return NaN;
  if (Number.isInteger(n) && n <= 170) {
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }
  return gamma(n + 1);
}

// Convert AST node to high-performance JavaScript code string
export function astToJS(node: ASTNode, angleUnit: 'rad' | 'deg' = 'rad'): string {
  switch (node.type) {
    case 'Number':
      return String(node.value);

    case 'Variable': {
      const v = node.name.toLowerCase();
      if (v === 'x') return 'x';
      if (v === 'y') return 'y';
      if (v === 'z') return 'z';
      if (v === 't') return 't';
      if (v === 'theta' || v === 'th') return 'theta';
      if (v === 'r') return 'r';
      // Slider or user variable from scope
      return `(scope["${node.name}"] ?? 0)`;
    }

    case 'Unary': {
      if (node.op === '-') {
        return `(-(${astToJS(node.argument, angleUnit)}))`;
      }
      if (node.op === '!') {
        return `fact(${astToJS(node.argument, angleUnit)})`;
      }
      return astToJS(node.argument, angleUnit);
    }

    case 'Binary': {
      const left = astToJS(node.left, angleUnit);
      const right = astToJS(node.right, angleUnit);
      if (node.op === '+') return `(${left} + ${right})`;
      if (node.op === '-') return `(${left} - ${right})`;
      if (node.op === '*') return `(${left} * ${right})`;
      if (node.op === '/') return `(${left} / ${right})`;
      if (node.op === '%') return `(${left} % ${right})`;
      if (node.op === '^') return `Math.pow(${left}, ${right})`;
      return `(${left} + ${right})`;
    }

    case 'Comparison': {
      const left = astToJS(node.left, angleUnit);
      const right = astToJS(node.right, angleUnit);
      if (node.op === '=') return `(Math.abs(${left} - ${right}) < 1e-7 ? 1 : 0)`;
      return `(${left} ${node.op} ${right} ? 1 : 0)`;
    }

    case 'FunctionCall': {
      const name = node.name.toLowerCase();
      const args = node.args.map((a) => astToJS(a, angleUnit));

      // Handle trig angle conversion if in degree mode
      const toRad = angleUnit === 'deg' ? ' * (Math.PI / 180)' : '';
      const fromRad = angleUnit === 'deg' ? ' * (180 / Math.PI)' : '';

      switch (name) {
        case 'sin': return `Math.sin(${args[0]}${toRad})`;
        case 'cos': return `Math.cos(${args[0]}${toRad})`;
        case 'tan': return `Math.tan(${args[0]}${toRad})`;
        case 'sec': return `(1 / Math.cos(${args[0]}${toRad}))`;
        case 'csc': return `(1 / Math.sin(${args[0]}${toRad}))`;
        case 'cot': return `(1 / Math.tan(${args[0]}${toRad}))`;

        case 'asin': return `(Math.asin(${args[0]})${fromRad})`;
        case 'acos': return `(Math.acos(${args[0]})${fromRad})`;
        case 'atan': return `(Math.atan(${args[0]})${fromRad})`;
        case 'atan2': return `(Math.atan2(${args[0]}, ${args[1]})${fromRad})`;

        case 'sinh': return `Math.sinh(${args[0]})`;
        case 'cosh': return `Math.cosh(${args[0]})`;
        case 'tanh': return `Math.tanh(${args[0]})`;

        case 'exp': return `Math.exp(${args[0]})`;
        case 'ln':
        case 'log': return `Math.log(${args[0]})`;
        case 'log10': return `Math.log10(${args[0]})`;
        case 'log2': return `Math.log2(${args[0]})`;

        case 'sqrt': return `Math.sqrt(${args[0]})`;
        case 'cbrt': return `Math.cbrt(${args[0]})`;
        case 'abs': return `Math.abs(${args[0]})`;
        case 'sign': return `Math.sign(${args[0]})`;
        case 'floor': return `Math.floor(${args[0]})`;
        case 'ceil': return `Math.ceil(${args[0]})`;
        case 'round': return `Math.round(${args[0]})`;

        case 'min': return `Math.min(${args.join(', ')})`;
        case 'max': return `Math.max(${args.join(', ')})`;
        case 'fact': return `fact(${args[0]})`;
        case 'gamma': return `gamma(${args[0]})`;

        default:
          return `(scope["${node.name}"] ? scope["${node.name}"](${args.join(', ')}) : 0)`;
      }
    }
  }
}

export type CompiledMathFn = (
  x: number,
  y: number,
  t: number,
  theta: number,
  scope: EvalScope
) => number;

/**
 * Compiles mathematical expression string into a lightning-fast native function.
 */
export function compileExpression(
  exprStr: string,
  angleUnit: 'rad' | 'deg' = 'rad'
): CompiledMathFn {
  const parser = new Parser(exprStr);
  const ast = parser.parse();
  const code = astToJS(ast, angleUnit);

  // Expose helper functions within scope
  const fnBody = `
    return function(x, y, t, theta, scope) {
      try {
        var res = ${code};
        return isNaN(res) ? NaN : res;
      } catch (e) {
        return NaN;
      }
    };
  `;

  // Safely construct function with fact and gamma in closure
  const creator = new Function('fact', 'gamma', fnBody);
  return creator(factorial, gamma);
}

export type Compiled3DFn = (x: number, y: number, z: number, scope?: EvalScope) => number;

export function compile3DExpression(
  exprStr: string,
  angleUnit: 'rad' | 'deg' = 'rad'
): Compiled3DFn {
  const normalized = normalizeMathInput(exprStr);
  const parser = new Parser(normalized);
  const ast = parser.parse();
  const code = astToJS(ast, angleUnit);

  const fnBody = `
    return function(x, y, z, scope) {
      scope = scope || {};
      try {
        var res = ${code};
        return isNaN(res) ? NaN : res;
      } catch (e) {
        return NaN;
      }
    };
  `;

  const creator = new Function('fact', 'gamma', fnBody);
  return creator(factorial, gamma);
}

export interface ParsedEquationInfo {
  type: EquationType;
  inequality: InequalityType;
  // For explicit y = f(x):
  evalY?: CompiledMathFn;
  // Multiple explicit Y branches (e.g. y = ±x or y = ±sqrt(x)):
  branchesY?: CompiledMathFn[];
  // For explicit x = g(y):
  evalX?: CompiledMathFn;
  // Multiple explicit X branches (e.g. x = ±2):
  branchesX?: CompiledMathFn[];
  // For polar r = f(theta):
  evalR?: CompiledMathFn;
  // For implicit F(x, y) = 0: (returns difference left - right)
  evalImplicit?: (x: number, y: number, scope: EvalScope) => number;
  // For parametric (x(t), y(t)):
  evalParametricX?: CompiledMathFn;
  evalParametricY?: CompiledMathFn;
  // For complex vector fields:
  evalVectorU?: (x: number, y: number, scope: EvalScope) => number;
  evalVectorV?: (x: number, y: number, scope: EvalScope) => number;
  // For fractals:
  fractalType?: 'mandelbrot' | 'julia' | 'newton';
  // For variable slider:
  variableName?: string;
  variableValue?: number;
  // For point:
  pointX?: number;
  pointY?: number;
  // For systems of equations:
  subEquations?: ParsedEquationInfo[];
  systemSolutions?: { x: number; y: number; label: string }[];
  // Display clean math
  displayFormula: string;
}

export function getSquareFreeTarget(expr: string): string {
  try {
    const factored = (nerdamer as any).factor(expr).toString();
    let cleaned = factored;
    let prev = '';
    while (prev !== cleaned) {
      prev = cleaned;
      cleaned = cleaned.replace(/\)\s*\^\s*([0-9]+)/g, ')');
    }
    return cleaned;
  } catch {
    return expr;
  }
}

export function isLinearSolution(solStr: string, varName: 'x' | 'y'): boolean {
  try {
    const d1 = (nerdamer as any).diff(solStr, varName).toString();
    const d2 = (nerdamer as any).diff(d1, varName).toString();
    return d2 === '0';
  } catch {
    return false;
  }
}

export function hasSquareRoot(expr: string): boolean {
  return /\b(?:sqrt|cbrt)\b|\^\s*\(?\s*1\/[0-9]+/i.test(expr);
}

export function isSimplePolynomial(expr: string): boolean {
  if (/\b(?:sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|exp|ln|log|sqrt|cbrt)\b/i.test(expr)) {
    return false;
  }
  if (/\^\s*\(?\s*[0-9]*\.[0-9]+/i.test(expr) || /\^\s*\(?\s*[0-9]+\s*\/\s*[0-9]+/i.test(expr)) {
    return false;
  }
  return true;
}

export function splitSystemEquations(input: string): string[] {
  const text = input.trim();
  const unwrapped = text.startsWith('{') && text.endsWith('}') ? text.slice(1, -1).trim() : text;

  // Don't split if it is a parametric pair like x = cos(t), y = sin(t)
  const isParametricPair =
    /^(?:x\s*=\s*.+?,\s*y\s*=\s*.+)$/i.test(unwrapped) &&
    /\b(?:t|theta|th)\b/i.test(unwrapped);
  if (isParametricPair) {
    return [unwrapped];
  }

  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < unwrapped.length; i++) {
    const ch = unwrapped[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;

    // Split on ;, newline, &, or comma outside brackets
    if (depth === 0 && (ch === ';' || ch === '\n' || ch === '&' || ch === ',')) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function solveSystemEquations(eqs: string[]): { x: number; y: number; label: string }[] {
  try {
    const sol = (nerdamer as any).solveSystem(eqs);
    const points: { x: number; y: number; label: string }[] = [];
    if (sol && sol.elements) {
      sol.elements.forEach((dict: any) => {
        if (dict._entries) {
          let xVal = NaN;
          let yVal = NaN;
          const xStr = dict._entries.get('x')?.toString();
          const yStr = dict._entries.get('y')?.toString();
          if (xStr && !/\bi\b/.test(xStr)) {
            try { xVal = parseFloat((nerdamer(xStr) as any).text('decimal')); } catch { xVal = parseFloat(xStr); }
          }
          if (yStr && !/\bi\b/.test(yStr)) {
            try { yVal = parseFloat((nerdamer(yStr) as any).text('decimal')); } catch { yVal = parseFloat(yStr); }
          }
          if (!isNaN(xVal) && !isNaN(yVal) && isFinite(xVal) && isFinite(yVal)) {
            // Avoid duplicates
            if (!points.some(p => Math.abs(p.x - xVal) < 1e-5 && Math.abs(p.y - yVal) < 1e-5)) {
              points.push({ x: xVal, y: yVal, label: `(${xVal.toFixed(3)}, ${yVal.toFixed(3)})` });
            }
          }
        }
      });
    }
    return points;
  } catch {
    return [];
  }
}

/**
 * Decomposes algebraic equations into explicit branches for Y and X using computer algebra.
 * E.g., x^2 = y^2 -> y = x, y = -x (linear lines)
 *       y^2 = x   -> x = y^2 (explicit horizontal parabola)
 *       x^2 = 4   -> x = 2, x = -2 (vertical lines)
 *       (x-y)^2=0 -> y = x (linear line)
 */
export function solveEquationBranches(
  targetExpr: string,
  angleUnit: 'rad' | 'deg' = 'rad'
): {
  branchesY: CompiledMathFn[];
  branchesX: CompiledMathFn[];
  rawY: string[];
  rawX: string[];
  isAllLinear: boolean;
  squareFreeTarget: string;
  singlePolyY?: string;
  singlePolyX?: string;
} {
  const branchesY: CompiledMathFn[] = [];
  const branchesX: CompiledMathFn[] = [];
  const rawY: string[] = [];
  const rawX: string[] = [];

  const squareFreeTarget = getSquareFreeTarget(targetExpr);

  const extractSolutions = (target: string, varName: 'y' | 'x'): string[] => {
    try {
      const res = (nerdamer as any).solve(target, varName);
      let list: string[] = [];
      if (res && res.elements && Array.isArray(res.elements)) {
        list = res.elements.map((e: any) => e.toString());
      } else {
        const str = res ? res.toString() : '';
        if (str.startsWith('{') && str.endsWith('}')) {
          list = str.slice(1, -1).split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (str.startsWith('[') && str.endsWith(']')) {
          list = str.slice(1, -1).split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (str.trim().length > 0) {
          list = [str.trim()];
        }
      }

      return list.filter((item) => {
        const trimmed = item.trim();
        if (!trimmed) return false;
        // Filter out imaginary solutions containing `i` or parameterized families `_n`
        if (/\bi\b/.test(trimmed) || /_n\b/.test(trimmed)) return false;
        // Filter out circular / unsolved references
        const regexSelf = new RegExp(`\\b${varName}\\b`, 'i');
        if (regexSelf.test(trimmed)) return false;
        return true;
      });
    } catch {
      return [];
    }
  };

  const solY = extractSolutions(squareFreeTarget, 'y');
  for (const s of solY) {
    try {
      const fn = compileExpression(s, angleUnit);
      branchesY.push(fn);
      rawY.push(s);
    } catch {
      // Continue
    }
  }

  const solX = extractSolutions(squareFreeTarget, 'x');
  for (const s of solX) {
    if (branchesY.length > 0 && (hasVariable(s, 'y') || hasVariable(s, 'Y'))) {
      continue;
    }
    try {
      const fn = compileExpression(s, angleUnit);
      branchesX.push(fn);
      rawX.push(s);
    } catch {
      // Continue
    }
  }

  const allLinearY = solY.length > 0 && solY.every((s) => isLinearSolution(s, 'x'));
  const allLinearX = solX.length > 0 && solX.every((s) => isLinearSolution(s, 'y'));
  const isAllLinear = (allLinearY && (branchesX.length === 0 || allLinearX)) ||
                      (allLinearX && (branchesY.length === 0 || allLinearY));

  // Check if one variable can be written as a single polynomial in the other without square roots (e.g. y^2 = x -> x = y^2)
  let singlePolyX: string | undefined = undefined;
  if (solX.length === 1 && !hasSquareRoot(solX[0]) && isSimplePolynomial(solX[0])) {
    singlePolyX = solX[0];
  }
  let singlePolyY: string | undefined = undefined;
  if (solY.length === 1 && !hasSquareRoot(solY[0]) && isSimplePolynomial(solY[0])) {
    singlePolyY = solY[0];
  }

  return {
    branchesY,
    branchesX,
    rawY,
    rawX,
    isAllLinear,
    squareFreeTarget,
    singlePolyY,
    singlePolyX,
  };
}

const equationParseCache = new Map<string, ParsedEquationInfo>();

export function clearEquationCache(): void {
  equationParseCache.clear();
}

/**
 * Analyzes raw input string and determines equation type, extracting compiled functions.
 * Uses an in-memory cache to eliminate CAS re-evaluation lag during interactive slider animations.
 */
export function parseEquation(
  rawInput: string,
  angleUnit: 'rad' | 'deg' = 'rad'
): ParsedEquationInfo {
  const cacheKey = `${rawInput.trim()}__${angleUnit}`;
  const cached = equationParseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = parseEquationInternal(rawInput, angleUnit);
  if (equationParseCache.size > 300) {
    equationParseCache.clear();
  }
  equationParseCache.set(cacheKey, result);
  return result;
}

function parseEquationInternal(
  rawInput: string,
  angleUnit: 'rad' | 'deg' = 'rad'
): ParsedEquationInfo {
  const text = normalizeMathInput(rawInput).trim();
  if (!text) {
    throw new Error('Empty equation');
  }

  // Check for System of Equations: e.g. "2*x + y = 5, x - y = 1" or "{ x^2 = y^2; y = 2 }"
  const subEqTexts = splitSystemEquations(text);
  if (subEqTexts.length >= 2) {
    const subEquations = subEqTexts.map((eqStr) => parseEquation(eqStr, angleUnit));
    const systemSolutions = solveSystemEquations(subEqTexts);
    return {
      type: 'system',
      inequality: 'none',
      subEquations,
      systemSolutions,
      displayFormula: subEqTexts.join('  &  '),
    };
  }

  // Check for ± in y = ± f(x)
  const pmYMatch = text.match(/^y\s*=\s*±\s*(.+)$/i);
  if (pmYMatch) {
    const rhs = pmYMatch[1].trim();
    const branchPos = compileExpression(`+(${rhs})`, angleUnit);
    const branchNeg = compileExpression(`-(${rhs})`, angleUnit);
    return {
      type: 'explicit',
      inequality: 'none',
      evalY: branchPos,
      branchesY: [branchPos, branchNeg],
      evalImplicit: (x, y, scope) => {
        const val = branchPos(x, 0, 0, 0, scope);
        return Math.min(Math.abs(y - val), Math.abs(y + val));
      },
      displayFormula: `y = ±${rhs}`,
    };
  }

  // Check for ± in x = ± g(y)
  const pmXMatch = text.match(/^x\s*=\s*±\s*(.+)$/i);
  if (pmXMatch) {
    const rhs = pmXMatch[1].trim();
    const branchPos = compileExpression(`+(${rhs})`, angleUnit);
    const branchNeg = compileExpression(`-(${rhs})`, angleUnit);
    return {
      type: 'explicit',
      inequality: 'none',
      evalX: branchPos,
      branchesX: [branchPos, branchNeg],
      displayFormula: `x = ±${rhs}`,
    };
  }

  // 0. Check for Fractals
  if (/^(?:fractal\s*:\s*)?mandelbrot/i.test(text)) {
    return {
      type: 'fractal',
      inequality: 'none',
      fractalType: 'mandelbrot',
      displayFormula: 'Mandelbrot: z_{n+1} = z_n^2 + c',
    };
  }

  if (/^(?:fractal\s*:\s*)?julia/i.test(text)) {
    return {
      type: 'fractal',
      inequality: 'none',
      fractalType: 'julia',
      displayFormula: 'Julia Curve: z_{n+1} = z_n^2 + c',
    };
  }

  if (/^(?:fractal\s*:\s*)?newton/i.test(text)) {
    return {
      type: 'fractal',
      inequality: 'none',
      fractalType: 'newton',
      displayFormula: "Newton Fractal: z^3 - 1 = 0",
    };
  }

  // 1. Check for Point: e.g. (2, 3) or ( -1.5, 4.2 )
  const pointMatch = text.match(/^\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)$/);
  if (pointMatch) {
    return {
      type: 'point',
      inequality: 'none',
      pointX: parseFloat(pointMatch[1]),
      pointY: parseFloat(pointMatch[2]),
      displayFormula: text,
    };
  }

  // 2. Check for Parametric tuple: e.g. ( cos(t), sin(t) )
  const parametricTuple = text.match(/^\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
  if (parametricTuple && (text.includes('t') || text.includes('T'))) {
    const fnX = compileExpression(parametricTuple[1], angleUnit);
    const fnY = compileExpression(parametricTuple[2], angleUnit);
    return {
      type: 'parametric',
      inequality: 'none',
      evalParametricX: fnX,
      evalParametricY: fnY,
      displayFormula: `(${parametricTuple[1]}, ${parametricTuple[2]})`,
    };
  }

  // 2b. Check for Complex Vector Field: V = (u, v), F(x, y) = (u, v), or (u(x, y), v(x, y))
  const vectorFieldMatch = text.match(/^(?:(?:[Vv]|[Ff](?:\s*\(\s*[xy,\s]*\))?)\s*=\s*)?\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
  if (vectorFieldMatch && (hasVariable(text, 'x') || hasVariable(text, 'y'))) {
    const fnU = compileExpression(vectorFieldMatch[1], angleUnit);
    const fnV = compileExpression(vectorFieldMatch[2], angleUnit);
    return {
      type: 'complex_vector',
      inequality: 'none',
      evalVectorU: (x, y, scope) => fnU(x, y, 0, 0, scope),
      evalVectorV: (x, y, scope) => fnV(x, y, 0, 0, scope),
      displayFormula: `V(x, y) = (${vectorFieldMatch[1]}, ${vectorFieldMatch[2]})`,
    };
  }

  // 2c. Check for Complex function f(z) = ... or w = ...
  const complexFuncMatch = text.match(/^(?:f\s*\(\s*z\s*\)|w)\s*=\s*(.+)$/i);
  if (complexFuncMatch) {
    const rhs = complexFuncMatch[1].trim();
    // Default approximations for common complex analytic mappings
    if (/^z\s*\^\s*2\s*-\s*1$/i.test(rhs)) {
      return {
        type: 'complex_vector',
        inequality: 'none',
        evalVectorU: (x, y) => x * x - y * y - 1,
        evalVectorV: (x, y) => 2 * x * y,
        displayFormula: `f(z) = z^2 - 1`,
      };
    } else if (/^1\s*\/\s*z$/i.test(rhs)) {
      return {
        type: 'complex_vector',
        inequality: 'none',
        evalVectorU: (x, y) => {
          const r2 = x * x + y * y;
          return r2 === 0 ? 0 : x / r2;
        },
        evalVectorV: (x, y) => {
          const r2 = x * x + y * y;
          return r2 === 0 ? 0 : -y / r2;
        },
        displayFormula: `f(z) = 1/z (Dipole Polya)`,
      };
    } else if (/^z\s*\^\s*2$/i.test(rhs)) {
      return {
        type: 'complex_vector',
        inequality: 'none',
        evalVectorU: (x, y) => x * x - y * y,
        evalVectorV: (x, y) => 2 * x * y,
        displayFormula: `f(z) = z^2`,
      };
    } else if (/^exp\s*\(\s*z\s*\)$/i.test(rhs)) {
      return {
        type: 'complex_vector',
        inequality: 'none',
        evalVectorU: (x, y) => Math.exp(x) * Math.cos(y),
        evalVectorV: (x, y) => Math.exp(x) * Math.sin(y),
        displayFormula: `f(z) = e^z`,
      };
    }
  }

  // 3. Check for Parametric separated by comma: x = cos(t), y = sin(t)
  if (text.toLowerCase().startsWith('x=') || text.toLowerCase().startsWith('x =')) {
    const parts = text.split(',');
    if (parts.length === 2 && parts[1].trim().toLowerCase().startsWith('y')) {
      const xPart = parts[0].replace(/^x\s*=\s*/i, '');
      const yPart = parts[1].replace(/^\s*y\s*=\s*/i, '');
      return {
        type: 'parametric',
        inequality: 'none',
        evalParametricX: compileExpression(xPart, angleUnit),
        evalParametricY: compileExpression(yPart, angleUnit),
        displayFormula: `x=${xPart}, y=${yPart}`,
      };
    }
  }

  // 4. Check for Variable assignment / slider: single letter or name = constant
  // e.g., a = 2.5 or k = -1
  const varSliderMatch = text.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*([+-]?\d+(?:\.\d+)?)$/);
  if (varSliderMatch) {
    const varName = varSliderMatch[1];
    // Exclude x, y, r, t, theta from being static sliders
    if (!['x', 'y', 'r', 't', 'theta', 'th'].includes(varName.toLowerCase())) {
      return {
        type: 'slider',
        inequality: 'none',
        variableName: varName,
        variableValue: parseFloat(varSliderMatch[2]),
        displayFormula: `${varName} = ${varSliderMatch[2]}`,
      };
    }
  }

  // 5. Check for Polar equations: r = f(theta) or r <= f(theta)
  const polarMatch = text.match(/^r\s*(<=|>=|<|>|=)\s*(.+)$/i);
  if (polarMatch) {
    const op = polarMatch[1];
    const rhs = polarMatch[2];
    const ineq: InequalityType =
      op === '<=' ? '<=' : op === '<' ? '<' : op === '>=' ? '>=' : op === '>' ? '>' : 'none';
    const compiled = compileExpression(rhs, angleUnit);
    return {
      type: 'polar',
      inequality: ineq,
      evalR: compiled,
      displayFormula: text,
    };
  }

  // 6. Check for Explicit y with Inequalities: y < f(x), y <= f(x), y > f(x), y >= f(x)
  const yIneqMatch = text.match(/^y\s*(<=|>=|<|>)\s*(.+)$/i);
  if (yIneqMatch) {
    const op = yIneqMatch[1] as InequalityType;
    const rhs = yIneqMatch[2];
    const compiled = compileExpression(rhs, angleUnit);
    return {
      type: 'explicit',
      inequality: op,
      evalY: compiled,
      displayFormula: text,
    };
  }

  // 7. Check for Explicit y = f(x)
  const yExplicitMatch = text.match(/^y\s*=\s*(.+)$/i);
  if (yExplicitMatch) {
    const rhs = yExplicitMatch[1];
    // Check if right hand side has 'y' in it: e.g. y = x^2 + y^2 -> Implicit!
    if (hasVariable(rhs, 'y')) {
      // Treat as implicit: y - (rhs) = 0
      const fnLeft = compileExpression('y', angleUnit);
      const fnRight = compileExpression(rhs, angleUnit);
      return {
        type: 'implicit',
        inequality: 'none',
        evalImplicit: (x, y, scope) => fnLeft(x, y, 0, 0, scope) - fnRight(x, y, 0, 0, scope),
        displayFormula: text,
      };
    }
    const compiled = compileExpression(rhs, angleUnit);
    return {
      type: 'explicit',
      inequality: 'none',
      evalY: compiled,
      displayFormula: text,
    };
  }

  // 8. Check for Explicit x = g(y)
  const xExplicitMatch = text.match(/^x\s*=\s*(.+)$/i);
  if (xExplicitMatch) {
    const rhs = xExplicitMatch[1];
    if (hasVariable(rhs, 'x')) {
      // Treat as implicit: x - (rhs) = 0
      const fnLeft = compileExpression('x', angleUnit);
      const fnRight = compileExpression(rhs, angleUnit);
      return {
        type: 'implicit',
        inequality: 'none',
        evalImplicit: (x, y, scope) => fnLeft(x, y, 0, 0, scope) - fnRight(x, y, 0, 0, scope),
        displayFormula: text,
      };
    }
    const compiled = compileExpression(rhs, angleUnit);
    return {
      type: 'explicit',
      inequality: 'none',
      evalX: compiled,
      displayFormula: text,
    };
  }

  // 9. Check for General Implicit equations: f(x, y) = g(x, y) or f(x, y) <= g(x, y)
  // Example: x^2 + y^2 = 25 or x^2 = y^2 or x^3 + y^3 - 3*x*y = 0
  const implicitMatch = text.match(/^(.+?)\s*(<=|>=|<|>|=)\s*(.+)$/);
  if (implicitMatch) {
    const lhs = implicitMatch[1].trim();
    const op = implicitMatch[2].trim();
    const rhs = implicitMatch[3].trim();
    const ineq: InequalityType =
      op === '<=' ? '<=' : op === '<' ? '<' : op === '>=' ? '>=' : op === '>' ? '>' : 'none';

    const fnLhs = compileExpression(lhs, angleUnit);
    const fnRhs = compileExpression(rhs, angleUnit);
    const evalImplicit = (x: number, y: number, scope: EvalScope) =>
      fnLhs(x, y, 0, 0, scope) - fnRhs(x, y, 0, 0, scope);

    // If this is an equality equation (=), solve for explicit branches using computer algebra
    if (ineq === 'none') {
      const target = `(${lhs}) - (${rhs})`;
      const {
        branchesY,
        branchesX,
        isAllLinear,
        squareFreeTarget,
        singlePolyY,
        singlePolyX,
      } = solveEquationBranches(target, angleUnit);

      // 1. If all solutions are linear lines (e.g. x^2 = y^2, y^2 = x^2, x^2 = 4, y^2 = 9, x*y = 0, (x-y)^2 = 0)
      if (isAllLinear && (branchesY.length > 0 || branchesX.length > 0)) {
        return {
          type: 'explicit',
          inequality: 'none',
          evalY: branchesY[0],
          branchesY,
          evalX: branchesX[0],
          branchesX,
          evalImplicit,
          displayFormula: text,
        };
      }

      // 2. If one variable can be written as a single unconstrained polynomial without square roots (e.g. y^2 = x -> x = y^2)
      if (singlePolyX && !hasSquareRoot(singlePolyX)) {
        const fnX = compileExpression(singlePolyX, angleUnit);
        return {
          type: 'explicit',
          inequality: 'none',
          evalX: fnX,
          branchesX: [fnX],
          evalImplicit,
          displayFormula: text,
        };
      }
      if (singlePolyY && !hasSquareRoot(singlePolyY)) {
        const fnY = compileExpression(singlePolyY, angleUnit);
        return {
          type: 'explicit',
          inequality: 'none',
          evalY: fnY,
          branchesY: [fnY],
          evalImplicit,
          displayFormula: text,
        };
      }

      // 3. For non-linear implicit curves (circles, ellipses, hyperbolas, periodic trigonometric curves, algebraic hearts):
      // Use squareFreeTarget so that even-power equations like (x^2+y^2-4)^2 = 0 or (x-y)^2 = 0 have normal zero crossings in Marching Squares!
      try {
        const fnSqFree = compileExpression(squareFreeTarget, angleUnit);
        return {
          type: 'implicit',
          inequality: ineq,
          evalImplicit: (x, y, scope) => fnSqFree(x, y, 0, 0, scope),
          displayFormula: text,
        };
      } catch {
        return {
          type: 'implicit',
          inequality: ineq,
          evalImplicit,
          displayFormula: text,
        };
      }
    }

    return {
      type: 'implicit',
      inequality: ineq,
      evalImplicit,
      displayFormula: text,
    };
  }

  // 10. Bare expression: e.g. "sin(x)" or "x^2 - 4" -> Defaults to explicit y = f(x)
  // Check if expression contains only y -> x = g(y)
  if (hasVariable(text, 'y') && !hasVariable(text, 'x')) {
    return {
      type: 'explicit',
      inequality: 'none',
      evalX: compileExpression(text, angleUnit),
      displayFormula: `x = ${text}`,
    };
  }

  // If contains theta -> polar r = f(theta)
  if (hasVariable(text, 'theta') || hasVariable(text, 'th')) {
    return {
      type: 'polar',
      inequality: 'none',
      evalR: compileExpression(text, angleUnit),
      displayFormula: `r = ${text}`,
    };
  }

  // If contains both x and y -> implicit f(x, y) = 0
  if (hasVariable(text, 'x') && hasVariable(text, 'y')) {
    const compiled = compileExpression(text, angleUnit);
    const {
      branchesY,
      branchesX,
      isAllLinear,
      squareFreeTarget,
      singlePolyY,
      singlePolyX,
    } = solveEquationBranches(text, angleUnit);

    if (isAllLinear && (branchesY.length > 0 || branchesX.length > 0)) {
      return {
        type: 'explicit',
        inequality: 'none',
        evalY: branchesY[0],
        branchesY,
        evalX: branchesX[0],
        branchesX,
        evalImplicit: (x, y, scope) => compiled(x, y, 0, 0, scope),
        displayFormula: `${text} = 0`,
      };
    }

    if (singlePolyX && !hasSquareRoot(singlePolyX)) {
      const fnX = compileExpression(singlePolyX, angleUnit);
      return {
        type: 'explicit',
        inequality: 'none',
        evalX: fnX,
        branchesX: [fnX],
        evalImplicit: (x, y, scope) => compiled(x, y, 0, 0, scope),
        displayFormula: `${text} = 0`,
      };
    }
    if (singlePolyY && !hasSquareRoot(singlePolyY)) {
      const fnY = compileExpression(singlePolyY, angleUnit);
      return {
        type: 'explicit',
        inequality: 'none',
        evalY: fnY,
        branchesY: [fnY],
        evalImplicit: (x, y, scope) => compiled(x, y, 0, 0, scope),
        displayFormula: `${text} = 0`,
      };
    }

    try {
      const fnSqFree = compileExpression(squareFreeTarget, angleUnit);
      return {
        type: 'implicit',
        inequality: 'none',
        evalImplicit: (x, y, scope) => fnSqFree(x, y, 0, 0, scope),
        displayFormula: `${text} = 0`,
      };
    } catch {
      return {
        type: 'implicit',
        inequality: 'none',
        evalImplicit: (x, y, scope) => compiled(x, y, 0, 0, scope),
        displayFormula: `${text} = 0`,
      };
    }
  }

  // Otherwise explicit y = f(x)
  return {
    type: 'explicit',
    inequality: 'none',
    evalY: compileExpression(text, angleUnit),
    displayFormula: `y = ${text}`,
  };
}

function hasVariable(expr: string, varName: string): boolean {
  const regex = new RegExp(`\\b${varName}\\b`, 'i');
  return regex.test(expr);
}
