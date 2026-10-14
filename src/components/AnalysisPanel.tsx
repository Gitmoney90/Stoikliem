import React, { useState, useMemo } from 'react';
import { GraphExpression, ThemeConfig, Viewport } from '../types/graph';
import { ParsedEquationInfo, EvalScope } from '../math/evaluator';
import {
  numericalDerivative,
  numericalSecondDerivative,
  definiteIntegral,
  computeRiemannSum,
  arcLength,
} from '../math/calculus';
import {
  symbolicDifferentiate,
  symbolicIntegrate,
  symbolicSolve,
  findAlgebraicKeyPoints,
  symbolicSimplify,
  symbolicFactor,
  symbolicExpand,
  symbolicPartFrac,
  symbolicTaylor,
  computeDefiniteIntegralWithSteps,
  SymbolicPoint,
} from '../math/casEngine';
import { MathView } from './MathView';
import {
  X,
  TrendingUp,
  Sparkles,
  FunctionSquare,
  Binary,
  Layers,
  Sliders,
  Check,
  Copy,
  PlusCircle,
  HelpCircle,
  Pin,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface AnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  expressions: GraphExpression[];
  parsedEquations: Map<string, ParsedEquationInfo>;
  activeExpressionId: string | null;
  onSelectExpression: (id: string) => void;
  viewport: Viewport;
  scope: EvalScope;
  onUpdateExpressionData: (id: string, data: Partial<GraphExpression>) => void;
  onPlotExpression?: (rawText: string, color?: string) => void;
  onPlotPoint?: (x: number, y: number, label: string, color?: string) => void;
}

type CASTab = 'symbolic' | 'solver' | 'algebra' | 'numerical';

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isOpen,
  onClose,
  theme,
  expressions,
  parsedEquations,
  activeExpressionId,
  onSelectExpression,
  viewport,
  scope,
  onUpdateExpressionData,
  onPlotExpression,
  onPlotPoint,
}) => {
  const [activeTab, setActiveTab] = useState<CASTab>('symbolic');
  const [isExpandedWidth, setIsExpandedWidth] = useState<boolean>(false);

  // Point evaluation & Riemann state
  const [evalX, setEvalX] = useState<number>(1.0);
  const [integralA, setIntegralA] = useState<number>(-2.0);
  const [integralB, setIntegralB] = useState<number>(2.0);
  const [riemannPartitions, setRiemannPartitions] = useState<number>(12);
  const [riemannType, setRiemannType] = useState<'mid' | 'left' | 'right' | 'trapezoid'>('mid');

  // Solver Tab State
  const [solverEquation, setSolverEquation] = useState<string>('a*x^2 + b*x + c = 0');
  const [solverVariable, setSolverVariable] = useState<string>('x');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Algebra Manipulation Tab State
  const [algebraExpr, setAlgebraExpr] = useState<string>('x^3 - 6*x^2 + 11*x - 6');
  const [algebraMode, setAlgebraMode] = useState<'factor' | 'expand' | 'simplify' | 'partfrac'>('factor');

  // Filter explicit visible functions
  const explExprs = expressions.filter((e) => {
    const p = parsedEquations.get(e.id);
    return e.visible && p && p.type === 'explicit' && p.evalY;
  });

  const currentExpr =
    explExprs.find((e) => e.id === activeExpressionId) || explExprs[0];

  const parsed = currentExpr ? parsedEquations.get(currentExpr.id) : null;
  const fn = parsed?.evalY ? (x: number) => parsed.evalY!(x, 0, 0, 0, scope) : null;

  // Extract raw function body for CAS (e.g. from "y = x^2 - 4" -> "x^2 - 4")
  const rawFunctionBody = useMemo(() => {
    if (!isOpen || !currentExpr) return '';
    return currentExpr.rawText.replace(/^(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, '').trim();
  }, [isOpen, currentExpr]);

  // Taylor Series & Definite Integral States
  const [taylorCenter, setTaylorCenter] = useState<number>(0);
  const [taylorOrder, setTaylorOrder] = useState<number>(4);
  const [definiteA, setDefiniteA] = useState<number>(0);
  const [definiteB, setDefiniteB] = useState<number>(2);

  // 1. Symbolic Calculus Computation
  const symbolicD1 = useMemo(() => {
    if (!isOpen || !rawFunctionBody) return null;
    return symbolicDifferentiate(rawFunctionBody, 'x', 1);
  }, [isOpen, rawFunctionBody]);

  const symbolicD2 = useMemo(() => {
    if (!isOpen || !rawFunctionBody) return null;
    return symbolicDifferentiate(rawFunctionBody, 'x', 2);
  }, [isOpen, rawFunctionBody]);

  const symbolicInt = useMemo(() => {
    if (!isOpen || !rawFunctionBody) return null;
    return symbolicIntegrate(rawFunctionBody, 'x');
  }, [isOpen, rawFunctionBody]);

  // Taylor Polynomial Approximation
  const taylorSeriesResult = useMemo(() => {
    if (!isOpen || !rawFunctionBody) return null;
    return symbolicTaylor(rawFunctionBody, 'x', taylorCenter, taylorOrder);
  }, [isOpen, rawFunctionBody, taylorCenter, taylorOrder]);

  // Definite Integral with FTC Steps
  const definiteIntegralResult = useMemo(() => {
    if (!isOpen || !rawFunctionBody) return null;
    return computeDefiniteIntegralWithSteps(rawFunctionBody, 'x', definiteA, definiteB);
  }, [isOpen, rawFunctionBody, definiteA, definiteB]);

  // 2. Exact Algebraic Key Points for Active Curve
  const algebraicKeyPoints = useMemo(() => {
    if (!isOpen || !rawFunctionBody) return { roots: [], criticalPoints: [], inflectionPoints: [] };
    return findAlgebraicKeyPoints(rawFunctionBody, 'x');
  }, [isOpen, rawFunctionBody]);

  // 3. Arbitrary Equation Solver Result
  const solverResult = useMemo(() => {
    if (!isOpen || !solverEquation.trim()) return null;
    return symbolicSolve(solverEquation, solverVariable);
  }, [isOpen, solverEquation, solverVariable]);

  // 4. Polynomial / Expression Manipulation Result
  const algebraResult = useMemo(() => {
    if (!isOpen || !algebraExpr.trim()) return null;
    switch (algebraMode) {
      case 'simplify':
        return symbolicSimplify(algebraExpr);
      case 'factor':
        return symbolicFactor(algebraExpr);
      case 'expand':
        return symbolicExpand(algebraExpr);
      case 'partfrac':
        return symbolicPartFrac(algebraExpr, 'x');
    }
  }, [isOpen, algebraExpr, algebraMode]);

  // Numerical evaluations
  const yVal = fn ? fn(evalX) : NaN;
  const d1Num = fn ? numericalDerivative(fn, evalX) : NaN;
  const d2Num = fn ? numericalSecondDerivative(fn, evalX) : NaN;
  const curvature =
    !isNaN(d1Num) && !isNaN(d2Num) ? Math.abs(d2Num) / Math.pow(1 + d1Num * d1Num, 1.5) : NaN;

  const integralVal = fn ? definiteIntegral(fn, integralA, integralB, 200) : NaN;
  const riemannResult = fn
    ? computeRiemannSum(fn, integralA, integralB, riemannPartitions, riemannType)
    : null;
  const arcLengthVal = fn ? arcLength(fn, integralA, integralB, 200) : NaN;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handlePlotResult = (exprText: string) => {
    if (onPlotExpression) {
      onPlotExpression(exprText);
    }
  };

  const handlePlotKeyPoint = (pt: SymbolicPoint) => {
    if (onPlotPoint && !isNaN(pt.xNum) && !isNaN(pt.yNum)) {
      onPlotPoint(pt.xNum, pt.yNum, pt.label || `(${pt.xNum.toFixed(2)}, ${pt.yNum.toFixed(2)})`);
    } else if (onPlotExpression && !isNaN(pt.xNum)) {
      // Plot vertical line marker or point equation
      onPlotExpression(`x = ${pt.xNum}`);
    }
  };

  // Safe early exit AFTER all hooks execute in uniform order
  if (!isOpen) return null;

  return (
    <div
      className={`fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-4 top-14 sm:top-3 w-auto ${
        isExpandedWidth ? 'sm:w-[720px]' : 'sm:w-[480px]'
      } rounded-2xl border shadow-2xl z-40 overflow-hidden flex flex-col max-h-[calc(100dvh-120px)] sm:max-h-[calc(100%-24px)] transition-all duration-200 animate-in fade-in slide-in-from-top-2`}
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.border,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0 min-h-[50px]"
        style={{
          backgroundColor: theme.bgSidebar,
          borderColor: theme.border,
        }}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <div>
            <h2
              className="text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: '"Cinzel", serif',
                color: theme.textPrimary,
              }}
            >
              Symbolic CAS & Calculus Studio
            </h2>
            <p className="text-3xs" style={{ color: theme.textSecondary }}>
              Exact closed-form differentiation, algebraic solving & polynomial CAS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Expand / Minimize Drawer Width Toggle on Desktop */}
          <button
            type="button"
            onClick={() => setIsExpandedWidth(!isExpandedWidth)}
            title={isExpandedWidth ? 'Narrow Studio Drawer (480px)' : 'Expand Studio Drawer for Multi-Column View (720px)'}
            className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
            aria-label="Toggle Drawer Width"
          >
            {isExpandedWidth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
            aria-label="Close CAS Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div
        className="px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto shrink-0 select-none"
        style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('symbolic')}
          className={`px-3 py-1.5 rounded-lg text-2xs font-semibold flex items-center gap-1.5 transition-all min-h-[36px] whitespace-nowrap active:scale-95 ${
            activeTab === 'symbolic' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: activeTab === 'symbolic' ? theme.accent : 'transparent',
            color: activeTab === 'symbolic' ? '#FFFFFF' : theme.textPrimary,
          }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Symbolic Calculus</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('solver')}
          className={`px-3 py-1.5 rounded-lg text-2xs font-semibold flex items-center gap-1.5 transition-all min-h-[36px] whitespace-nowrap active:scale-95 ${
            activeTab === 'solver' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: activeTab === 'solver' ? theme.accent : 'transparent',
            color: activeTab === 'solver' ? '#FFFFFF' : theme.textPrimary,
          }}
        >
          <Binary className="w-3.5 h-3.5" />
          <span>Exact Solver</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('algebra')}
          className={`px-3 py-1.5 rounded-lg text-2xs font-semibold flex items-center gap-1.5 transition-all min-h-[36px] whitespace-nowrap active:scale-95 ${
            activeTab === 'algebra' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: activeTab === 'algebra' ? theme.accent : 'transparent',
            color: activeTab === 'algebra' ? '#FFFFFF' : theme.textPrimary,
          }}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Polynomial CAS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('numerical')}
          className={`px-3 py-1.5 rounded-lg text-2xs font-semibold flex items-center gap-1.5 transition-all min-h-[36px] whitespace-nowrap active:scale-95 ${
            activeTab === 'numerical' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: activeTab === 'numerical' ? theme.accent : 'transparent',
            color: activeTab === 'numerical' ? '#FFFFFF' : theme.textPrimary,
          }}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Riemann Sums</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 overflow-y-auto space-y-4 text-xs font-sans flex-1">
        {/* Function Selector (Applicable to tabs analyzing current curve) */}
        {explExprs.length > 0 && activeTab !== 'algebra' && (
          <div className="p-2.5 rounded-xl border flex items-center justify-between gap-3" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
            <label className="text-2xs uppercase tracking-wider font-semibold whitespace-nowrap" style={{ color: theme.textMuted }}>
              Analyzed Function
            </label>
            <select
              value={currentExpr?.id || ''}
              onChange={(e) => onSelectExpression(e.target.value)}
              className="px-2.5 py-1 rounded-lg border text-xs font-mono max-w-[240px] truncate"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            >
              {explExprs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.rawText}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: SYMBOLIC CALCULUS (Exact Derivatives & Integrals)     */}
        {/* ============================================================ */}
        {activeTab === 'symbolic' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {currentExpr && rawFunctionBody ? (
              <>
                {/* Active Function Card */}
                <div className="p-3 rounded-xl border space-y-1.5" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <span className="text-3xs uppercase tracking-wider font-semibold" style={{ color: theme.textMuted }}>
                      Original Function f(x)
                    </span>
                    <span className="text-3xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${currentExpr.color}20`, color: currentExpr.color }}>
                      Active
                    </span>
                  </div>
                  <div className="overflow-x-auto py-1 text-sm">
                    <MathView math={`f(x) = ${rawFunctionBody}`} displayMode={false} />
                  </div>
                </div>

                {/* Exact Closed-Form First Derivative f'(x) */}
                <div className="p-3 rounded-xl border space-y-2 bg-black/[0.02] dark:bg-white/[0.02]" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                        Exact Derivative f′(x)
                      </span>
                      <span className="text-3xs font-mono opacity-60">d/dx</span>
                    </div>

                    {symbolicD1?.success && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(symbolicD1.rawText)}
                          title="Copy expression"
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          style={{ color: theme.textSecondary }}
                        >
                          {copiedText === symbolicD1.rawText ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlotResult(`y = ${symbolicD1.rawText}`)}
                          className="px-2.5 py-1 text-2xs rounded-lg font-semibold border flex items-center gap-1 shadow-2xs hover:opacity-90 active:scale-95 transition-all"
                          style={{ borderColor: theme.accent, color: theme.accent }}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Plot f′(x)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {symbolicD1?.success ? (
                    <div className="p-2.5 rounded-lg border font-mono text-xs overflow-x-auto" style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}>
                      <MathView math={`f'(x) = ${symbolicD1.latex}`} displayMode={true} />
                      <div className="text-3xs opacity-60 mt-1 font-mono">{symbolicD1.rawText}</div>
                    </div>
                  ) : (
                    <div className="text-2xs text-rose-600">{symbolicD1?.error || 'Could not compute derivative'}</div>
                  )}

                  {/* Second Derivative f''(x) */}
                  {symbolicD2?.success && (
                    <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: theme.border }}>
                      <div className="overflow-x-auto text-2xs">
                        <span className="font-semibold mr-1.5" style={{ color: theme.textSecondary }}>f″(x):</span>
                        <MathView math={symbolicD2.latex} displayMode={false} />
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlotResult(`y = ${symbolicD2.rawText}`)}
                        className="px-2 py-0.5 text-3xs rounded font-semibold border hover:opacity-80 shrink-0"
                        style={{ borderColor: theme.border, color: theme.textPrimary }}
                      >
                        + Plot f″(x)
                      </button>
                    </div>
                  )}
                </div>

                {/* Exact Closed-Form Indefinite Integral ∫f(x)dx */}
                <div className="p-3 rounded-xl border space-y-2 bg-black/[0.02] dark:bg-white/[0.02]" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                        Exact Indefinite Integral ∫ f(x) dx
                      </span>
                      <span className="text-3xs font-mono opacity-60">Anti-derivative</span>
                    </div>

                    {symbolicInt?.success && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(symbolicInt.rawText)}
                          title="Copy expression"
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          style={{ color: theme.textSecondary }}
                        >
                          {copiedText === symbolicInt.rawText ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlotResult(`y = ${symbolicInt.rawText}`)}
                          className="px-2.5 py-1 text-2xs rounded-lg font-semibold border flex items-center gap-1 shadow-2xs hover:opacity-90 active:scale-95 transition-all"
                          style={{ borderColor: theme.accent, color: theme.accent }}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Plot ∫f(x)dx</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {symbolicInt?.success ? (
                    <div className="p-2.5 rounded-lg border font-mono text-xs overflow-x-auto" style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}>
                      <MathView math={`\\int f(x) dx = ${symbolicInt.latex}`} displayMode={true} />
                      <div className="text-3xs opacity-60 mt-1 font-mono">{symbolicInt.rawText} + C</div>
                    </div>
                  ) : (
                    <div className="text-2xs text-rose-600">{symbolicInt?.error || 'Closed-form anti-derivative not found'}</div>
                  )}
                </div>

                {/* Definite Integral with Fundamental Theorem of Calculus Steps */}
                <div className="p-3 rounded-xl border space-y-2.5 bg-black/[0.02] dark:bg-white/[0.02]" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                        Definite Integral & FTC Steps: [F(b) − F(a)]
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-2xs font-mono">
                      <span>a =</span>
                      <input
                        type="number"
                        step="0.5"
                        value={definiteA}
                        onChange={(e) => setDefiniteA(parseFloat(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 rounded border text-right font-mono text-xs tabular-nums"
                        style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
                      />
                      <span>b =</span>
                      <input
                        type="number"
                        step="0.5"
                        value={definiteB}
                        onChange={(e) => setDefiniteB(parseFloat(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 rounded border text-right font-mono text-xs tabular-nums"
                        style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
                      />
                    </div>
                  </div>

                  {definiteIntegralResult?.success ? (
                    <div className="space-y-2 p-2.5 rounded-lg border text-xs font-mono" style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}>
                      <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: theme.border }}>
                        <span className="text-3xs uppercase tracking-wider opacity-60">FTC Step Breakdown:</span>
                        <span className="text-xs font-bold font-mono" style={{ color: theme.accent }}>
                          ≈ {!isNaN(definiteIntegralResult.numericVal) ? definiteIntegralResult.numericVal.toFixed(6) : 'N/A'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-2xs">
                        <div className="overflow-x-auto">
                          <MathView
                            math={`\\int_{${definiteA}}^{${definiteB}} f(x) dx = \\left[ ${definiteIntegralResult.antiderivativeLatex} \\right]_{${definiteA}}^{${definiteB}}`}
                            displayMode={false}
                          />
                        </div>

                        <div className="overflow-x-auto text-3xs opacity-85">
                          <span>= F({definiteB}) − F({definiteA}) = </span>
                          <MathView math={`(${definiteIntegralResult.fAtUpperLatex}) - (${definiteIntegralResult.fAtLowerLatex})`} displayMode={false} />
                        </div>

                        <div className="overflow-x-auto font-bold pt-0.5">
                          <span>Exact Net Area = </span>
                          <MathView math={definiteIntegralResult.resultLatex} displayMode={false} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-2xs text-stone-500">
                      {definiteIntegralResult?.error || 'Enter integration limits above to compute step breakdown'}
                    </div>
                  )}
                </div>

                {/* Taylor Series Expansion Polynomial P_n(x) */}
                <div className="p-3 rounded-xl border space-y-2.5 bg-black/[0.02] dark:bg-white/[0.02]" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-semibold text-xs block" style={{ color: theme.textPrimary }}>
                        Taylor / Maclaurin Polynomial Approximation
                      </span>
                      <span className="text-3xs font-mono opacity-60">Pn(x) series expansion</span>
                    </div>

                    <div className="flex items-center gap-2 text-2xs font-mono">
                      <span>Center a =</span>
                      <input
                        type="number"
                        step="0.5"
                        value={taylorCenter}
                        onChange={(e) => setTaylorCenter(parseFloat(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 rounded border text-right font-mono text-xs tabular-nums"
                        style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
                      />
                      <span>Order n =</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        step="1"
                        value={taylorOrder}
                        onChange={(e) => setTaylorOrder(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        className="w-12 px-1.5 py-0.5 rounded border text-right font-mono text-xs tabular-nums"
                        style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
                      />
                    </div>
                  </div>

                  {taylorSeriesResult?.success ? (
                    <div className="space-y-2 p-2.5 rounded-lg border font-mono text-xs" style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}>
                      <div className="flex items-center justify-between border-b pb-1" style={{ borderColor: theme.border }}>
                        <span className="text-3xs uppercase tracking-wider opacity-60">Degree {taylorOrder} Polynomial:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(taylorSeriesResult.rawText)}
                            title="Copy Taylor Polynomial"
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            style={{ color: theme.textSecondary }}
                          >
                            {copiedText === taylorSeriesResult.rawText ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlotResult(`y = ${taylorSeriesResult.rawText}`)}
                            className="px-2 py-0.5 text-3xs rounded-md font-semibold border flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all text-amber-700 dark:text-amber-400 bg-amber-500/10"
                            style={{ borderColor: theme.border }}
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Plot P{taylorOrder}(x)</span>
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto py-1">
                        <MathView math={`P_{${taylorOrder}}(x) = ${taylorSeriesResult.latex}`} displayMode={true} />
                      </div>
                      <div className="text-3xs opacity-60 font-mono truncate">{taylorSeriesResult.rawText}</div>
                    </div>
                  ) : (
                    <div className="text-2xs text-stone-500">
                      {taylorSeriesResult?.error || 'Enter function to generate Taylor series polynomial'}
                    </div>
                  )}
                </div>

                {/* Point Evaluation at x0 */}
                <div className="p-3 rounded-xl border space-y-2.5" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                      Instantaneous Point & Slope at x₀
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xs font-mono" style={{ color: theme.textMuted }}>x₀ =</span>
                      <input
                        type="number"
                        step="0.5"
                        value={evalX}
                        onChange={(e) => setEvalX(parseFloat(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 rounded border text-right font-mono text-xs tabular-nums"
                        style={{
                          backgroundColor: theme.bgSidebar,
                          borderColor: theme.border,
                          color: theme.textPrimary,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-2xs tabular-nums">
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                      <span className="block" style={{ color: theme.textMuted }}>f(x₀)</span>
                      <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                        {!isNaN(yVal) ? yVal.toFixed(4) : 'Undefined'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                      <span className="block" style={{ color: theme.textMuted }}>Slope f′(x₀)</span>
                      <span className="text-sm font-semibold" style={{ color: theme.accent }}>
                        {!isNaN(d1Num) ? d1Num.toFixed(4) : 'Undefined'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                      <span className="block" style={{ color: theme.textMuted }}>Curvature κ</span>
                      <span className="text-xs font-semibold" style={{ color: theme.textPrimary }}>
                        {!isNaN(curvature) ? curvature.toFixed(4) : 'Undefined'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                      <span className="block" style={{ color: theme.textMuted }}>f″(x₀)</span>
                      <span className="text-xs font-semibold" style={{ color: theme.textPrimary }}>
                        {!isNaN(d2Num) ? d2Num.toFixed(4) : 'Undefined'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentExpr) {
                          onUpdateExpressionData(currentExpr.id, {
                            showTangent: !currentExpr.showTangent,
                            tangentX: evalX,
                          });
                        }
                      }}
                      className="px-2.5 py-1 text-2xs rounded-lg font-medium border hover:opacity-80 transition-all"
                      style={{ borderColor: theme.border, color: theme.textPrimary }}
                    >
                      {currentExpr.showTangent ? 'Hide Tangent Line' : 'Show Tangent Line on Graph'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlotKeyPoint({
                        xExact: String(evalX),
                        xLatex: String(evalX),
                        xNum: evalX,
                        yExact: String(yVal),
                        yLatex: String(yVal),
                        yNum: yVal,
                        label: `Point (${evalX}, ${yVal.toFixed(2)})`
                      })}
                      className="px-2.5 py-1 text-2xs rounded-lg font-medium border hover:opacity-80 transition-all flex items-center gap-1"
                      style={{ borderColor: theme.border, color: theme.textPrimary }}
                    >
                      <Pin className="w-3 h-3" />
                      <span>Pin Point</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs" style={{ color: theme.textMuted }}>
                No active explicit curve selected. Select or add a curve like y = x^2 - 4 to perform closed-form differentiation and integration.
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: EXACT ALGEBRAIC SOLVER & KEY POINTS                   */}
        {/* ============================================================ */}
        {activeTab === 'solver' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Arbitrary Equation Solver Card */}
            <div className="p-3.5 rounded-xl border space-y-3" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                  Arbitrary Symbolic Equation Solver
                </span>
                <span className="text-3xs px-2 py-0.5 rounded font-mono" style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}>
                  CAS Engine
                </span>
              </div>

              {/* Input for equation and variable */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={solverEquation}
                  onChange={(e) => setSolverEquation(e.target.value)}
                  placeholder="e.g. a*x^2 + b*x + c = 0"
                  className="flex-1 px-3 py-1.5 rounded-lg border font-mono text-xs"
                  style={{
                    backgroundColor: theme.bgCard,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  }}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-2xs font-mono" style={{ color: theme.textMuted }}>for</span>
                  <input
                    type="text"
                    maxLength={5}
                    value={solverVariable}
                    onChange={(e) => setSolverVariable(e.target.value.trim() || 'x')}
                    className="w-10 px-1.5 py-1.5 rounded-lg border text-center font-mono text-xs font-bold"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: theme.border,
                      color: theme.textPrimary,
                    }}
                  />
                </div>
              </div>

              {/* Preset Quick Solvers */}
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Quadratic ax²+bx+c=0', eq: 'a*x^2 + b*x + c = 0', v: 'x' },
                  { label: 'Cubic x³-6x²+11x-6=0', eq: 'x^3 - 6*x^2 + 11*x - 6 = 0', v: 'x' },
                  { label: 'Trig sin(x)=1/2', eq: 'sin(x) = 1/2', v: 'x' },
                  { label: 'Circle x²+y²=25 (solve y)', eq: 'x^2 + y^2 = 25', v: 'y' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSolverEquation(preset.eq);
                      setSolverVariable(preset.v);
                    }}
                    className="px-2 py-0.5 text-3xs rounded border font-mono hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ borderColor: theme.border, color: theme.textSecondary }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Exact Solutions Display */}
              {solverResult && (
                <div className="p-3 rounded-lg border space-y-2" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                  <div className="flex items-center justify-between text-2xs font-semibold" style={{ color: theme.textSecondary }}>
                    <span>Exact Solutions for {solverResult.variable}:</span>
                    <span>{solverResult.solutions.length} Root{solverResult.solutions.length === 1 ? '' : 's'} Found</span>
                  </div>

                  {solverResult.success && solverResult.latexSolutions.length > 0 ? (
                    <div className="space-y-2">
                      {solverResult.latexSolutions.map((latexSol, idx) => {
                        const num = solverResult.numericSolutions[idx]?.numeric;
                        return (
                          <div
                            key={idx}
                            className="p-2 rounded-lg border flex items-center justify-between gap-3 overflow-x-auto"
                            style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}
                          >
                            <div className="text-xs font-mono">
                              <MathView
                                math={`${solverResult.variable}_{${idx + 1}} = ${latexSol}`}
                                displayMode={false}
                              />
                              {!isNaN(num as number) && (
                                <span className="ml-2 text-2xs opacity-60">≈ {(num as number).toFixed(4)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopy(solverResult.solutions[idx])}
                                className="p-1 rounded hover:opacity-80"
                                style={{ color: theme.textSecondary }}
                                title="Copy"
                              >
                                {copiedText === solverResult.solutions[idx] ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {!isNaN(num as number) && (
                                <button
                                  type="button"
                                  onClick={() => handlePlotResult(`x = ${num}`)}
                                  className="px-2 py-0.5 text-3xs rounded font-semibold border hover:opacity-80"
                                  style={{ borderColor: theme.accent, color: theme.accent }}
                                >
                                  Plot x = {num?.toFixed(2)}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-2xs text-rose-600">
                      {solverResult.error || 'No symbolic solutions found for the specified variable.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Exact Algebraic Analysis of Active Function */}
            {currentExpr && (
              <div className="p-3.5 rounded-xl border space-y-3" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                    Exact Algebraic Points of f(x)
                  </span>
                  <span className="text-3xs" style={{ color: theme.textMuted }}>
                    Closed-Form (Non-Pixel Scanning)
                  </span>
                </div>

                {/* Exact Roots (f(x) = 0) */}
                <div className="space-y-1.5">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Exact Roots (f(x) = 0)
                  </span>
                  {algebraicKeyPoints.roots.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5">
                      {algebraicKeyPoints.roots.map((pt, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg border flex items-center justify-between text-2xs font-mono"
                          style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}
                        >
                          <div>
                            <span className="font-bold mr-1 text-emerald-700 dark:text-emerald-400">Root {i + 1}:</span>
                            <MathView math={`x = ${pt.xLatex}`} displayMode={false} />
                            {!isNaN(pt.xNum) && <span className="opacity-60 ml-1.5">≈ {pt.xNum.toFixed(4)}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlotKeyPoint(pt)}
                            className="px-2 py-0.5 rounded text-3xs font-semibold border hover:opacity-80"
                            style={{ borderColor: theme.border, color: theme.textPrimary }}
                          >
                            + Pin on Graph
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-3xs italic" style={{ color: theme.textMuted }}>
                      No exact real algebraic roots discovered or degree &gt; 4.
                    </p>
                  )}
                </div>

                {/* Exact Critical Points (f'(x) = 0) */}
                <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: theme.border }}>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                    Exact Critical Points (f′(x) = 0)
                  </span>
                  {algebraicKeyPoints.criticalPoints.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5">
                      {algebraicKeyPoints.criticalPoints.map((pt, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg border flex items-center justify-between text-2xs font-mono"
                          style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}
                        >
                          <div>
                            <span
                              className={`px-1.5 py-0.2 rounded text-3xs font-bold mr-1.5 uppercase ${
                                pt.type === 'maximum'
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                                  : pt.type === 'minimum'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {pt.type}
                            </span>
                            <MathView math={`x = ${pt.xLatex}`} displayMode={false} />
                            {!isNaN(pt.xNum) && <span className="opacity-60 ml-1.5">({pt.xNum.toFixed(3)}, {pt.yNum.toFixed(3)})</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlotKeyPoint(pt)}
                            className="px-2 py-0.5 rounded text-3xs font-semibold border hover:opacity-80"
                            style={{ borderColor: theme.border, color: theme.textPrimary }}
                          >
                            + Pin on Graph
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-3xs italic" style={{ color: theme.textMuted }}>
                      No algebraic stationary points discovered.
                    </p>
                  )}
                </div>

                {/* Exact Inflection Points (f''(x) = 0) */}
                <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: theme.border }}>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400 block">
                    Exact Inflection Points (f″(x) = 0)
                  </span>
                  {algebraicKeyPoints.inflectionPoints.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5">
                      {algebraicKeyPoints.inflectionPoints.map((pt, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg border flex items-center justify-between text-2xs font-mono"
                          style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}
                        >
                          <div>
                            <span className="font-bold mr-1 text-sky-700 dark:text-sky-400">Inflection:</span>
                            <MathView math={`x = ${pt.xLatex}`} displayMode={false} />
                            {!isNaN(pt.xNum) && <span className="opacity-60 ml-1.5">({pt.xNum.toFixed(3)}, {pt.yNum.toFixed(3)})</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlotKeyPoint(pt)}
                            className="px-2 py-0.5 rounded text-3xs font-semibold border hover:opacity-80"
                            style={{ borderColor: theme.border, color: theme.textPrimary }}
                          >
                            + Pin on Graph
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-3xs italic" style={{ color: theme.textMuted }}>
                      No concavity inflection points found.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: POLYNOMIAL & CAS EXPRESSION MANIPULATION             */}
        {/* ============================================================ */}
        {activeTab === 'algebra' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-xl border space-y-3" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                  Polynomial & Symbolic Transformation
                </span>
                {currentExpr && (
                  <button
                    type="button"
                    onClick={() => setAlgebraExpr(rawFunctionBody)}
                    className="text-3xs underline font-semibold text-amber-700 dark:text-amber-400 hover:opacity-80"
                  >
                    Insert Active Curve f(x)
                  </button>
                )}
              </div>

              {/* Expression Input */}
              <input
                type="text"
                value={algebraExpr}
                onChange={(e) => setAlgebraExpr(e.target.value)}
                placeholder="e.g. x^3 - 6*x^2 + 11*x - 6 or (x+2)^4 or (2*x+1)/(x^2-1)"
                className="w-full px-3 py-2 rounded-lg border font-mono text-xs"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                }}
              />

              {/* Operation Selector Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'factor', label: 'Factor', desc: 'Irreducible factors' },
                  { id: 'expand', label: 'Expand', desc: 'Binomial / polynomial' },
                  { id: 'simplify', label: 'Simplify', desc: 'Combine & reduce' },
                  { id: 'partfrac', label: 'Part Frac', desc: 'Partial fractions' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setAlgebraMode(mode.id as any)}
                    className={`p-2 rounded-lg border text-left transition-all min-h-[44px] ${
                      algebraMode === mode.id
                        ? 'border-amber-600 bg-amber-500/10 font-bold'
                        : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    style={{
                      borderColor: algebraMode === mode.id ? theme.accent : theme.border,
                      color: theme.textPrimary,
                    }}
                  >
                    <div className="text-2xs font-bold">{mode.label}</div>
                    <div className="text-3xs opacity-60 leading-tight">{mode.desc}</div>
                  </button>
                ))}
              </div>

              {/* Preset Examples */}
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'x³ - 6x² + 11x - 6', val: 'x^3 - 6*x^2 + 11*x - 6', mode: 'factor' },
                  { label: '(x + 3)⁴', val: '(x + 3)^4', mode: 'expand' },
                  { label: '(2x + 1)/(x² - x - 2)', val: '(2*x + 1)/(x^2 - x - 2)', mode: 'partfrac' },
                  { label: '(x² - 4)/(x - 2)', val: '(x^2 - 4)/(x - 2)', mode: 'simplify' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setAlgebraExpr(preset.val);
                      setAlgebraMode(preset.mode as any);
                    }}
                    className="px-2 py-0.5 text-3xs rounded border font-mono hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ borderColor: theme.border, color: theme.textSecondary }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Transformation Result Box */}
              {algebraResult && (
                <div className="p-3.5 rounded-lg border space-y-2.5" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                      Result ({algebraMode}):
                    </span>
                    {algebraResult.success && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(algebraResult.rawText)}
                          className="p-1 rounded hover:opacity-80"
                          style={{ color: theme.textSecondary }}
                          title="Copy"
                        >
                          {copiedText === algebraResult.rawText ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlotResult(`y = ${algebraResult.rawText}`)}
                          className="px-2.5 py-1 text-2xs rounded-lg font-semibold border flex items-center gap-1 shadow-2xs hover:opacity-90 active:scale-95 transition-all"
                          style={{ borderColor: theme.accent, color: theme.accent }}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Plot as Curve</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {algebraResult.success ? (
                    <div className="p-3 rounded-lg border font-mono text-xs overflow-x-auto" style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}>
                      <MathView math={algebraResult.latex} displayMode={true} />
                      <div className="text-3xs opacity-60 mt-1 font-mono">{algebraResult.rawText}</div>
                    </div>
                  ) : (
                    <div className="text-2xs text-rose-600">{algebraResult.error || 'Transformation could not be completed.'}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: NUMERICAL CALCULUS (Riemann Sums & Arc Length)       */}
        {/* ============================================================ */}
        {activeTab === 'numerical' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {currentExpr && fn ? (
              <>
                {/* Definite Integral & Riemann Sums */}
                <div className="p-3.5 rounded-xl border space-y-3" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                      Definite Integral ∫ [a, b]
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateExpressionData(currentExpr.id, {
                          showIntegral: true,
                          integralA,
                          integralB,
                          riemannMode: riemannType,
                          riemannPartitions,
                        });
                      }}
                      className="px-2 py-0.5 text-2xs rounded font-medium border hover:opacity-80"
                      style={{ borderColor: theme.border, color: theme.textPrimary }}
                    >
                      Overlay on Graph
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-mono" style={{ color: theme.textMuted }}>a =</span>
                    <input
                      type="number"
                      step="0.5"
                      value={integralA}
                      onChange={(e) => setIntegralA(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 rounded border text-center font-mono text-xs tabular-nums"
                      style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
                    />
                    <span className="text-2xs font-mono" style={{ color: theme.textMuted }}>b =</span>
                    <input
                      type="number"
                      step="0.5"
                      value={integralB}
                      onChange={(e) => setIntegralB(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 rounded border text-center font-mono text-xs tabular-nums"
                      style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-2xs tabular-nums">
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                      <span className="block" style={{ color: theme.textMuted }}>Exact Integral (Simpson)</span>
                      <span className="text-sm font-semibold" style={{ color: theme.accent }}>
                        {!isNaN(integralVal) ? integralVal.toFixed(5) : 'Divergent'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                      <span className="block" style={{ color: theme.textMuted }}>Arc Length L</span>
                      <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                        {!isNaN(arcLengthVal) ? arcLengthVal.toFixed(4) : 'Undefined'}
                      </span>
                    </div>
                  </div>

                  {/* Riemann Partitions Control */}
                  <div className="pt-2 border-t flex flex-col gap-1.5" style={{ borderColor: theme.border }}>
                    <div className="flex items-center justify-between text-2xs">
                      <span style={{ color: theme.textSecondary }}>Riemann Sum Method</span>
                      <select
                        value={riemannType}
                        onChange={(e) => setRiemannType(e.target.value as any)}
                        className="px-2 py-0.5 rounded border text-2xs font-mono"
                        style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
                      >
                        <option value="mid">Midpoint</option>
                        <option value="left">Left Endpoint</option>
                        <option value="right">Right Endpoint</option>
                        <option value="trapezoid">Trapezoid Rule</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-2xs font-mono" style={{ color: theme.textMuted }}>N = {riemannPartitions}</span>
                      <input
                        type="range"
                        min="4"
                        max="60"
                        step="2"
                        value={riemannPartitions}
                        onChange={(e) => setRiemannPartitions(parseInt(e.target.value, 10))}
                        className="flex-1 accent-amber-600"
                      />
                      <span className="text-2xs font-mono tabular-nums font-semibold" style={{ color: theme.textPrimary }}>
                        ≈ {riemannResult?.sum.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs" style={{ color: theme.textMuted }}>
                Select an active explicit curve to calculate numerical Riemann sums and arc lengths.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
