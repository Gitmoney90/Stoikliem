import nerdamer from 'nerdamer';
import katex from 'katex';

// Type-safe reference to nerdamer bundle
const cas: any = nerdamer;

/**
 * Safely extracts LaTeX string from a nerdamer object or expression
 */
function safeToTeX(node: any): string {
  try {
    if (node && typeof node.toTeX === 'function') {
      return node.toTeX();
    }
    return String(node || '');
  } catch {
    return String(node || '');
  }
}

export interface SymbolicResult {
  rawText: string;
  latex: string;
  success: boolean;
  error?: string;
  plottableFn?: (x: number) => number;
}

export interface SymbolicSolveResult {
  variable: string;
  solutions: string[];
  latexSolutions: string[];
  numericSolutions: { exact: string; numeric: number; latex: string }[];
  success: boolean;
  error?: string;
}

export interface SymbolicPoint {
  xExact: string;
  xLatex: string;
  xNum: number;
  yExact: string;
  yLatex: string;
  yNum: number;
  label?: string;
  type?: 'root' | 'minimum' | 'maximum' | 'inflection' | 'saddle' | 'critical';
}

/**
 * Normalizes input math expressions (e.g. replacing 'y =' or unicode powers)
 */
export function normalizeCASInput(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();

  // Strip leading 'y =' or 'f(x) ='
  cleaned = cleaned.replace(/^(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, '');

  // Replace unicode superscripts
  const superscripts: Record<string, string> = {
    '²': '^2',
    '³': '^3',
    '⁴': '^4',
    '⁵': '^5',
    '⁶': '^6',
    '⁷': '^7',
    '⁸': '^8',
    '⁹': '^9',
    '⁰': '^0',
  };
  for (const [uni, repl] of Object.entries(superscripts)) {
    cleaned = cleaned.split(uni).join(repl);
  }

  // Replace π with pi
  cleaned = cleaned.replace(/π/g, 'pi');

  // Replace ** with ^
  cleaned = cleaned.replace(/\*\*/g, '^');

  return cleaned.trim();
}

/**
 * Safely converts an expression or nerdamer object to LaTeX using nerdamer's toTeX()
 */
export function toLatex(expr: string): string {
  try {
    const n = cas(expr);
    return safeToTeX(n);
  } catch {
    return expr;
  }
}

/**
 * Renders LaTeX string to an HTML string using KaTeX
 */
export function renderLatexToHtml(latexStr: string, displayMode: boolean = false): string {
  try {
    return katex.renderToString(latexStr, {
      displayMode,
      throwOnError: false,
    });
  } catch {
    return `<span class="font-mono">${latexStr}</span>`;
  }
}

/**
 * Builds a fast, client-safe numeric evaluation function (x: number) => number
 */
export function buildPlottableFunction(expr: string, variable: string = 'x'): (x: number) => number {
  try {
    const compiled = cas(expr).buildFunction([variable]);
    return (val: number) => {
      try {
        const res = compiled(val);
        if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
          return res;
        }
        return NaN;
      } catch {
        return NaN;
      }
    };
  } catch {
    return () => NaN;
  }
}

/**
 * Computes exact symbolic derivative f'(x)
 */
export function symbolicDifferentiate(
  expression: string,
  variable: string = 'x',
  order: number = 1
): SymbolicResult {
  try {
    const clean = normalizeCASInput(expression);
    if (!clean) {
      return { rawText: '', latex: '', success: false, error: 'Empty expression' };
    }

    let diffCmd = clean;
    for (let i = 0; i < order; i++) {
      diffCmd = `diff(${diffCmd}, ${variable})`;
    }

    const n = cas(diffCmd);
    const textResult = n.toString();
    const latexResult = safeToTeX(n);
    const plottableFn = buildPlottableFunction(textResult, variable);

    return {
      rawText: textResult,
      latex: latexResult,
      success: true,
      plottableFn,
    };
  } catch (err: any) {
    return {
      rawText: '',
      latex: '',
      success: false,
      error: err?.message || 'Symbolic differentiation failed',
    };
  }
}

/**
 * Computes exact closed-form indefinite integral ∫f(x)dx
 */
export function symbolicIntegrate(
  expression: string,
  variable: string = 'x'
): SymbolicResult {
  try {
    const clean = normalizeCASInput(expression);
    if (!clean) {
      return { rawText: '', latex: '', success: false, error: 'Empty expression' };
    }

    const n = cas(`integrate(${clean}, ${variable})`);
    const textResult = n.toString();
    const baseLatex = safeToTeX(n);
    const latexResult = `${baseLatex} + C`;
    const plottableFn = buildPlottableFunction(textResult, variable);

    return {
      rawText: textResult,
      latex: latexResult,
      success: true,
      plottableFn,
    };
  } catch (err: any) {
    return {
      rawText: '',
      latex: '',
      success: false,
      error: err?.message || 'Symbolic integration failed or closed form not found',
    };
  }
}

/**
 * Solves an equation or root problem symbolically: e.g. equation = 0 or left = right
 */
export function symbolicSolve(
  equationOrExpr: string,
  variable: string = 'x'
): SymbolicSolveResult {
  try {
    let eq = normalizeCASInput(equationOrExpr);
    if (!eq) {
      return {
        variable,
        solutions: [],
        latexSolutions: [],
        numericSolutions: [],
        success: false,
        error: 'Empty equation',
      };
    }

    // If there is an equals sign, handle both sides
    let solverTarget = eq;
    if (eq.includes('=')) {
      const parts = eq.split('=');
      if (parts.length === 2) {
        solverTarget = `(${parts[0].trim()}) - (${parts[1].trim()})`;
      }
    }

    // Call nerdamer solve
    const sol = cas.solve(solverTarget, variable);
    const solStr = sol.toString();

    // sol is either an array or comma-separated solutions list
    let list: string[] = [];
    try {
      // Nerdamer returns "[sol1, sol2]"
      if (solStr.startsWith('[') && solStr.endsWith(']')) {
        const inner = solStr.slice(1, -1).trim();
        if (inner.length > 0) {
          list = splitTopLevel(inner, ',');
        }
      } else if (solStr.trim().length > 0) {
        list = [solStr.trim()];
      }
    } catch {
      list = [solStr];
    }

    const latexSolutions: string[] = [];
    const numericSolutions: { exact: string; numeric: number; latex: string }[] = [];

    for (const item of list) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      let ltx = trimmed;
      let numVal = NaN;

      try {
        const nItem = cas(trimmed);
        ltx = safeToTeX(nItem);
        // Try evaluating numerically
        const evaluated = Number((cas(trimmed).evaluate() as any).text('decimals'));
        if (!isNaN(evaluated) && isFinite(evaluated)) {
          numVal = evaluated;
        }
      } catch {
        // Fallback
      }

      latexSolutions.push(ltx);
      if (!isNaN(numVal)) {
        numericSolutions.push({
          exact: trimmed,
          numeric: numVal,
          latex: ltx,
        });
      }
    }

    return {
      variable,
      solutions: list,
      latexSolutions,
      numericSolutions,
      success: true,
    };
  } catch (err: any) {
    return {
      variable,
      solutions: [],
      latexSolutions: [],
      numericSolutions: [],
      success: false,
      error: err?.message || 'Symbolic solving failed',
    };
  }
}

/**
 * Finds exact algebraic roots, critical points, and inflection points
 */
export function findAlgebraicKeyPoints(
  expression: string,
  variable: string = 'x'
): {
  roots: SymbolicPoint[];
  criticalPoints: SymbolicPoint[];
  inflectionPoints: SymbolicPoint[];
} {
  try {
    const clean = normalizeCASInput(expression);
    if (!clean) return { roots: [], criticalPoints: [], inflectionPoints: [] };

    const evalOriginal = buildPlottableFunction(clean, variable);

    // 1. Exact Roots: solve(f(x) = 0)
    const rootsSolve = symbolicSolve(clean, variable);
    const roots: SymbolicPoint[] = [];
    rootsSolve.numericSolutions.forEach((sol) => {
      roots.push({
        xExact: sol.exact,
        xLatex: sol.latex,
        xNum: sol.numeric,
        yExact: '0',
        yLatex: '0',
        yNum: 0,
        label: `Root (${variable} = ${sol.exact})`,
        type: 'root',
      });
    });

    // 2. Exact Critical Points: solve(f'(x) = 0)
    const diff1 = symbolicDifferentiate(clean, variable, 1);
    const diff2 = symbolicDifferentiate(clean, variable, 2);
    const evalD2 = diff2.success ? buildPlottableFunction(diff2.rawText, variable) : null;

    const criticalPoints: SymbolicPoint[] = [];
    if (diff1.success) {
      const cpSolve = symbolicSolve(diff1.rawText, variable);
      cpSolve.numericSolutions.forEach((sol) => {
        const yVal = evalOriginal(sol.numeric);
        let classification: 'minimum' | 'maximum' | 'saddle' | 'critical' = 'critical';
        if (evalD2) {
          const d2Val = evalD2(sol.numeric);
          if (d2Val > 1e-7) classification = 'minimum';
          else if (d2Val < -1e-7) classification = 'maximum';
          else if (Math.abs(d2Val) <= 1e-7) classification = 'saddle';
        }

        criticalPoints.push({
          xExact: sol.exact,
          xLatex: sol.latex,
          xNum: sol.numeric,
          yExact: isNaN(yVal) ? 'NaN' : yVal.toFixed(4),
          yLatex: isNaN(yVal) ? 'NaN' : yVal.toFixed(4),
          yNum: yVal,
          label: `${classification.toUpperCase()} (${variable} = ${sol.exact})`,
          type: classification,
        });
      });
    }

    // 3. Exact Inflection Points: solve(f''(x) = 0)
    const inflectionPoints: SymbolicPoint[] = [];
    if (diff2.success) {
      const ipSolve = symbolicSolve(diff2.rawText, variable);
      ipSolve.numericSolutions.forEach((sol) => {
        const yVal = evalOriginal(sol.numeric);
        inflectionPoints.push({
          xExact: sol.exact,
          xLatex: sol.latex,
          xNum: sol.numeric,
          yExact: isNaN(yVal) ? 'NaN' : yVal.toFixed(4),
          yLatex: isNaN(yVal) ? 'NaN' : yVal.toFixed(4),
          yNum: yVal,
          label: `Inflection Point (${variable} = ${sol.exact})`,
          type: 'inflection',
        });
      });
    }

    return { roots, criticalPoints, inflectionPoints };
  } catch (err) {
    console.warn('findAlgebraicKeyPoints non-fatal error:', err);
    return { roots: [], criticalPoints: [], inflectionPoints: [] };
  }
}

/**
 * Symbolic Simplification
 */
export function symbolicSimplify(expression: string): SymbolicResult {
  try {
    const clean = normalizeCASInput(expression);
    const n = cas(`simplify(${clean})`);
    return {
      rawText: n.toString(),
      latex: safeToTeX(n),
      success: true,
      plottableFn: buildPlottableFunction(n.toString()),
    };
  } catch (err: any) {
    return {
      rawText: '',
      latex: '',
      success: false,
      error: err?.message || 'Simplification failed',
    };
  }
}

/**
 * Polynomial Factoring
 */
export function symbolicFactor(expression: string): SymbolicResult {
  try {
    const clean = normalizeCASInput(expression);
    const n = cas(`factor(${clean})`);
    return {
      rawText: n.toString(),
      latex: safeToTeX(n),
      success: true,
      plottableFn: buildPlottableFunction(n.toString()),
    };
  } catch (err: any) {
    return {
      rawText: '',
      latex: '',
      success: false,
      error: err?.message || 'Factoring failed',
    };
  }
}

/**
 * Binomial / Polynomial Expansion
 */
export function symbolicExpand(expression: string): SymbolicResult {
  try {
    const clean = normalizeCASInput(expression);
    const n = cas(`expand(${clean})`);
    return {
      rawText: n.toString(),
      latex: safeToTeX(n),
      success: true,
      plottableFn: buildPlottableFunction(n.toString()),
    };
  } catch (err: any) {
    return {
      rawText: '',
      latex: '',
      success: false,
      error: err?.message || 'Expansion failed',
    };
  }
}

/**
 * Partial Fraction Decomposition
 */
export function symbolicPartFrac(expression: string, variable: string = 'x'): SymbolicResult {
  try {
    const clean = normalizeCASInput(expression);
    const n = cas(`partfrac(${clean}, ${variable})`);
    return {
      rawText: n.toString(),
      latex: safeToTeX(n),
      success: true,
      plottableFn: buildPlottableFunction(n.toString(), variable),
    };
  } catch (err: any) {
    return {
      rawText: '',
      latex: '',
      success: false,
      error: err?.message || 'Partial fraction decomposition failed',
    };
  }
}

/**
 * Computes Taylor Polynomial Approximation
 */
export function symbolicTaylor(
  expression: string,
  variable: string = 'x',
  center: number = 0,
  order: number = 4
): SymbolicResult {
  try {
    const clean = normalizeCASInput(expression);
    if (!clean) return { rawText: '', latex: '', success: false, error: 'Empty expression' };

    let resultNode: any;
    try {
      resultNode = cas(`taylor(${clean}, ${variable}, ${center}, ${order})`);
    } catch {
      // Fallback manual differentiation sum
      let sumStr = '';
      let currentExpr = clean;
      let fact = 1;
      for (let k = 0; k <= order; k++) {
        if (k > 0) {
          fact *= k;
          currentExpr = cas(`diff(${currentExpr}, ${variable})`).toString();
        }
        const valAtCenter = cas(currentExpr).sub(variable, String(center)).evaluate().toString();
        if (valAtCenter !== '0') {
          const term =
            k === 0
              ? valAtCenter
              : `((${valAtCenter}) / ${fact}) * (${variable} - (${center}))^${k}`;
          sumStr = sumStr ? `${sumStr} + ${term}` : term;
        }
      }
      resultNode = cas(sumStr || '0');
    }

    const textResult = resultNode.toString();
    const latexResult = safeToTeX(resultNode);
    return {
      rawText: textResult,
      latex: latexResult,
      success: true,
      plottableFn: buildPlottableFunction(textResult, variable),
    };
  } catch (err: any) {
    return {
      rawText: '',
      latex: '',
      success: false,
      error: err?.message || 'Taylor series computation failed',
    };
  }
}

export interface DefiniteIntegralSteps {
  antiderivative: string;
  antiderivativeLatex: string;
  fAtUpper: string;
  fAtUpperLatex: string;
  fAtLower: string;
  fAtLowerLatex: string;
  resultExact: string;
  resultLatex: string;
  numericVal: number;
  success: boolean;
  error?: string;
}

/**
 * Computes Definite Integral with Fundamental Theorem of Calculus steps [F(b) - F(a)]
 */
export function computeDefiniteIntegralWithSteps(
  expression: string,
  variable: string = 'x',
  a: number = 0,
  b: number = 1
): DefiniteIntegralSteps {
  try {
    const clean = normalizeCASInput(expression);
    if (!clean) throw new Error('Empty expression');

    const anti = cas(`integrate(${clean}, ${variable})`);
    const antiStr = anti.toString();
    const antiLatex = safeToTeX(anti);

    const atB = cas(antiStr).sub(variable, String(b)).evaluate();
    const atA = cas(antiStr).sub(variable, String(a)).evaluate();

    const diff = cas(`(${atB.toString()}) - (${atA.toString()})`);
    const num = Number((diff.evaluate() as any).text('decimals'));

    return {
      antiderivative: antiStr,
      antiderivativeLatex: antiLatex,
      fAtUpper: atB.toString(),
      fAtUpperLatex: safeToTeX(atB),
      fAtLower: atA.toString(),
      fAtLowerLatex: safeToTeX(atA),
      resultExact: diff.toString(),
      resultLatex: safeToTeX(diff),
      numericVal: isNaN(num) ? NaN : num,
      success: true,
    };
  } catch (err: any) {
    return {
      antiderivative: '',
      antiderivativeLatex: '',
      fAtUpper: '',
      fAtUpperLatex: '',
      fAtLower: '',
      fAtLowerLatex: '',
      resultExact: '',
      resultLatex: '',
      numericVal: NaN,
      success: false,
      error: err?.message || 'Definite integral computation failed',
    };
  }
}

/**
 * Splits a string by delimiter at top level of parentheses/brackets
 */
function splitTopLevel(str: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(' || char === '[' || char === '{') depth++;
    else if (char === ')' || char === ']' || char === '}') depth--;

    if (char === delimiter && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}
