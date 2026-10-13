import React, { useState } from 'react';
import { GraphExpression, ThemeConfig, Viewport } from '../types/graph';
import { ParsedEquationInfo, EvalScope } from '../math/evaluator';
import {
  numericalDerivative,
  numericalSecondDerivative,
  definiteIntegral,
  computeRiemannSum,
  arcLength,
  findRootsInInterval,
  findExtremaInInterval,
} from '../math/calculus';
import { X, TrendingUp, Compass, Hash, Sparkles } from 'lucide-react';

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
}

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
}) => {
  const [evalX, setEvalX] = useState<number>(1.0);
  const [integralA, setIntegralA] = useState<number>(-2.0);
  const [integralB, setIntegralB] = useState<number>(2.0);
  const [riemannPartitions, setRiemannPartitions] = useState<number>(12);
  const [riemannType, setRiemannType] = useState<'mid' | 'left' | 'right' | 'trapezoid'>('mid');

  if (!isOpen) return null;

  // Filter explicit visible functions
  const explExprs = expressions.filter((e) => {
    const p = parsedEquations.get(e.id);
    return e.visible && p && p.type === 'explicit' && p.evalY;
  });

  const currentExpr =
    explExprs.find((e) => e.id === activeExpressionId) || explExprs[0];

  const parsed = currentExpr ? parsedEquations.get(currentExpr.id) : null;
  const fn = parsed?.evalY ? (x: number) => parsed.evalY!(x, 0, 0, 0, scope) : null;

  // Calculus calculations
  const yVal = fn ? fn(evalX) : NaN;
  const d1 = fn ? numericalDerivative(fn, evalX) : NaN;
  const d2 = fn ? numericalSecondDerivative(fn, evalX) : NaN;
  const curvature =
    !isNaN(d1) && !isNaN(d2) ? Math.abs(d2) / Math.pow(1 + d1 * d1, 1.5) : NaN;

  const integralVal = fn ? definiteIntegral(fn, integralA, integralB, 200) : NaN;
  const riemannResult = fn
    ? computeRiemannSum(fn, integralA, integralB, riemannPartitions, riemannType)
    : null;
  const arcLengthVal = fn ? arcLength(fn, integralA, integralB, 200) : NaN;

  // Zeros & Extrema in current window
  const roots = fn ? findRootsInInterval(fn, viewport.xMin, viewport.xMax, 250) : [];
  const extrema = fn ? findExtremaInInterval(fn, viewport.xMin, viewport.xMax, 200) : [];

  return (
    <div
      className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-4 top-14 sm:top-16 w-auto sm:w-96 rounded-2xl border shadow-2xl z-20 overflow-hidden flex flex-col max-h-[72dvh] sm:max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.border,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0 min-h-[48px]"
        style={{
          backgroundColor: theme.bgSidebar,
          borderColor: theme.border,
        }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: theme.accent }} />
          <h2
            className="text-xs font-bold uppercase tracking-wider"
            style={{
              fontFamily: '"Cinzel", serif',
              color: theme.textPrimary,
            }}
          >
            Calculus Studio
          </h2>
        </div>
        <button
          onClick={onClose}
          className="min-w-[38px] min-h-[38px] flex items-center justify-center p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ color: theme.textSecondary }}
          aria-label="Close Calculus Studio"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 overflow-y-auto space-y-4 text-xs font-sans">
        {/* Function Selector */}
        <div>
          <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
            Active Function
          </label>
          <select
            value={currentExpr?.id || ''}
            onChange={(e) => onSelectExpression(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono"
            style={{
              backgroundColor: theme.bgSidebar,
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
          >
            {explExprs.map((e) => (
              <option key={e.id} value={e.id}>
                {e.rawText}
              </option>
            ))}
            {explExprs.length === 0 && <option value="">No explicit curve available</option>}
          </select>
        </div>

        {fn ? (
          <>
            {/* Differential Calculus at Point x0 */}
            <div className="p-3 rounded-xl border space-y-2.5" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                  Point & Derivatives at x₀
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
                    {!isNaN(d1) ? d1.toFixed(4) : 'Undefined'}
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
                    {!isNaN(d2) ? d2.toFixed(4) : 'Undefined'}
                  </span>
                </div>
              </div>
            </div>

            {/* Definite Integral & Riemann Sums */}
            <div className="p-3 rounded-xl border space-y-2.5" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                  Definite Integral ∫ [a, b]
                </span>
                <button
                  onClick={() => {
                    if (currentExpr) {
                      onUpdateExpressionData(currentExpr.id, {
                        showIntegral: true,
                        integralA,
                        integralB,
                        riemannMode: riemannType,
                        riemannPartitions,
                      });
                    }
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

            {/* Viewport Critical Points (Roots & Extrema) */}
            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: theme.border }}>
              <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                Critical Points in Viewport
              </span>

              {roots.length > 0 && (
                <div>
                  <span className="text-2xs text-emerald-600 font-semibold uppercase tracking-wider block mb-1">
                    Zeros / Roots (f(x) = 0)
                  </span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-2xs tabular-nums">
                    {roots.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        x = {r.toFixed(4)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extrema.length > 0 && (
                <div>
                  <span className="text-2xs text-amber-600 font-semibold uppercase tracking-wider block mb-1">
                    Local Extrema (f′(x) = 0)
                  </span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-2xs tabular-nums">
                    {extrema.map((ex, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded border ${
                          ex.type === 'maximum'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {ex.type === 'maximum' ? 'Max' : 'Min'}: ({ex.x.toFixed(3)}, {ex.y.toFixed(3)})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {roots.length === 0 && extrema.length === 0 && (
                <p className="text-2xs" style={{ color: theme.textMuted }}>
                  No roots or local extrema found in current window span.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="py-8 text-center" style={{ color: theme.textMuted }}>
            Please select an active explicit curve y = f(x) to perform calculus analysis.
          </div>
        )}
      </div>
    </div>
  );
};
