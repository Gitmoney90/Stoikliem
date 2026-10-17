import React, { useState } from 'react';
import { GraphExpression, ThemeConfig } from '../types/graph';
import { ParsedEquationInfo, EvalScope } from '../math/evaluator';
import { numericalDerivative } from '../math/calculus';
import { X, Table, Copy, Check, PlusCircle } from 'lucide-react';

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  expressions: GraphExpression[];
  parsedEquations: Map<string, ParsedEquationInfo>;
  scope: EvalScope;
  onAddPointExpressions: (points: { x: number; y: number; label: string }[]) => void;
}

export const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  onClose,
  theme,
  expressions,
  parsedEquations,
  scope,
  onAddPointExpressions,
}) => {
  const [selectedExprId, setSelectedExprId] = useState<string>(
    expressions[0]?.id || ''
  );
  const [xStart, setXStart] = useState<number>(-5);
  const [xStep, setXStep] = useState<number>(1);
  const [xEnd, setXEnd] = useState<number>(5);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentExpr =
    expressions.find((e) => e.id === selectedExprId) || expressions[0];
  const parsed = currentExpr ? parsedEquations.get(currentExpr.id) : null;
  const fn = parsed?.evalY
    ? (x: number) => parsed.evalY!(x, 0, 0, 0, scope)
    : parsed?.branchesY && parsed.branchesY.length > 0
    ? (x: number) => parsed.branchesY![0](x, 0, 0, 0, scope)
    : null;

  // Generate table rows
  const rows: { x: number; y: number; d1: number }[] = [];
  if (fn && xStep > 0 && xStart <= xEnd) {
    const maxRows = 200;
    let count = 0;
    for (let x = xStart; x <= xEnd + 1e-9 && count < maxRows; x += xStep) {
      const y = fn(x);
      const d1 = numericalDerivative(fn, x);
      rows.push({ x: parseFloat(x.toFixed(6)), y, d1 });
      count++;
    }
  }

  const handleCopyCSV = () => {
    let csv = 'x,y,dy_dx\n';
    rows.forEach((r) => {
      csv += `${r.x},${isNaN(r.y) ? 'undefined' : r.y},${isNaN(r.d1) ? 'undefined' : r.d1}\n`;
    });
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlotPoints = () => {
    const valid = rows
      .filter((r) => !isNaN(r.y) && isFinite(r.y))
      .slice(0, 20)
      .map((r) => ({ x: r.x, y: r.y, label: `(${r.x}, ${r.y.toFixed(2)})` }));
    onAddPointExpressions(valid);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
        }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-3.5 sm:py-4 border-b flex items-center justify-between shrink-0 min-h-[52px]"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Table className="w-5 h-5 shrink-0" style={{ color: theme.accent }} />
            <h2
              className="text-sm sm:text-base font-bold tracking-tight truncate"
              style={{
                fontFamily: '"Cinzel", "Source Serif 4", serif',
                color: theme.textPrimary,
              }}
            >
              Table of Function Values
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
            aria-label="Close Table"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 border-b flex flex-wrap items-center gap-3 text-xs font-sans shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
              Target Function
            </label>
            <select
              value={currentExpr?.id || ''}
              onChange={(e) => setSelectedExprId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono"
              style={{
                backgroundColor: theme.bgSidebar,
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            >
              {expressions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.rawText}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <div>
              <label className="block text-2xs" style={{ color: theme.textMuted }}>x Start</label>
              <input
                type="number"
                step="1"
                value={xStart}
                onChange={(e) => setXStart(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 rounded border text-xs tabular-nums"
                style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
              />
            </div>
            <div>
              <label className="block text-2xs" style={{ color: theme.textMuted }}>Step</label>
              <input
                type="number"
                step="0.5"
                min="0.01"
                value={xStep}
                onChange={(e) => setXStep(Math.max(0.01, parseFloat(e.target.value) || 1))}
                className="w-16 px-2 py-1 rounded border text-xs tabular-nums"
                style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
              />
            </div>
            <div>
              <label className="block text-2xs" style={{ color: theme.textMuted }}>x End</label>
              <input
                type="number"
                step="1"
                value={xEnd}
                onChange={(e) => setXEnd(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 rounded border text-xs tabular-nums"
                style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {fn ? (
            <table className="w-full text-xs font-mono tabular-nums text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: theme.border, color: theme.textMuted }}>
                  <th className="py-2 px-3 font-semibold">x</th>
                  <th className="py-2 px-3 font-semibold">y = f(x)</th>
                  <th className="py-2 px-3 font-semibold">dy/dx</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ borderColor: theme.border }}
                  >
                    <td className="py-2 px-3 font-semibold" style={{ color: theme.textPrimary }}>
                      {row.x}
                    </td>
                    <td className="py-2 px-3" style={{ color: isNaN(row.y) ? theme.textMuted : theme.accent }}>
                      {!isNaN(row.y) && isFinite(row.y) ? row.y.toFixed(5) : 'Undefined'}
                    </td>
                    <td className="py-2 px-3" style={{ color: theme.textSecondary }}>
                      {!isNaN(row.d1) && isFinite(row.d1) ? row.d1.toFixed(5) : 'Undefined'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs" style={{ color: theme.textMuted }}>
              Select an explicit function y = f(x) to evaluate value points.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="p-4 border-t flex items-center justify-between shrink-0"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <button
            onClick={handleCopyCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ borderColor: theme.border, color: theme.textPrimary }}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied CSV' : 'Copy CSV'}</span>
          </button>

          <button
            onClick={handlePlotPoints}
            disabled={!fn || rows.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs hover:opacity-90 transition-all disabled:opacity-50"
            style={{
              backgroundColor: theme.textPrimary,
              color: theme.bgCanvas,
            }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Plot Points on Graph</span>
          </button>
        </div>
      </div>
    </div>
  );
};
