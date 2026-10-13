import { ASTNode, Parser } from './parser';
import { EquationType, InequalityType } from '../types/graph';

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

export interface ParsedEquationInfo {
  type: EquationType;
  inequality: InequalityType;
  // For explicit y = f(x):
  evalY?: CompiledMathFn;
  // For explicit x = g(y):
  evalX?: CompiledMathFn;
  // For polar r = f(theta):
  evalR?: CompiledMathFn;
  // For implicit F(x, y) = 0: (returns difference left - right)
  evalImplicit?: (x: number, y: number, scope: EvalScope) => number;
  // For parametric (x(t), y(t)):
  evalParametricX?: CompiledMathFn;
  evalParametricY?: CompiledMathFn;
  // For variable slider:
  variableName?: string;
  variableValue?: number;
  // For point:
  pointX?: number;
  pointY?: number;
  // Display clean math
  displayFormula: string;
}

/**
 * Analyzes raw input string and determines equation type, extracting compiled functions.
 */
export function parseEquation(
  rawInput: string,
  angleUnit: 'rad' | 'deg' = 'rad'
): ParsedEquationInfo {
  const text = rawInput.trim();
  if (!text) {
    throw new Error('Empty equation');
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
  // Example: x^2 + y^2 = 25 or x^3 + y^3 - 3*x*y = 0
  const implicitMatch = text.match(/^(.+?)\s*(<=|>=|<|>|=)\s*(.+)$/);
  if (implicitMatch) {
    const lhs = implicitMatch[1];
    const op = implicitMatch[2];
    const rhs = implicitMatch[3];
    const ineq: InequalityType =
      op === '<=' ? '<=' : op === '<' ? '<' : op === '>=' ? '>=' : op === '>' ? '>' : 'none';

    const fnLhs = compileExpression(lhs, angleUnit);
    const fnRhs = compileExpression(rhs, angleUnit);

    return {
      type: 'implicit',
      inequality: ineq,
      evalImplicit: (x, y, scope) => fnLhs(x, y, 0, 0, scope) - fnRhs(x, y, 0, 0, scope),
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
    return {
      type: 'implicit',
      inequality: 'none',
      evalImplicit: (x, y, scope) => compiled(x, y, 0, 0, scope),
      displayFormula: `${text} = 0`,
    };
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
