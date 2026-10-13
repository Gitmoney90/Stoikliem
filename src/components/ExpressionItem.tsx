import React, { useState } from 'react';
import { GraphExpression, ThemeConfig } from '../types/graph';
import { ParsedEquationInfo } from '../math/evaluator';
import {
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  MoreVertical,
  Sliders,
  TrendingUp,
} from 'lucide-react';

interface ExpressionItemProps {
  expression: GraphExpression;
  parsedInfo?: ParsedEquationInfo;
  isActive: boolean;
  theme: ThemeConfig;
  onSelect: () => void;
  onChangeText: (newText: string) => void;
  onToggleVisible: () => void;
  onChangeColor: (newColor: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdateExpression: (updated: Partial<GraphExpression>) => void;
  onFocusInput: () => void;
}

export const ExpressionItem: React.FC<ExpressionItemProps> = ({
  expression,
  parsedInfo,
  isActive,
  theme,
  onSelect,
  onChangeText,
  onToggleVisible,
  onChangeColor,
  onDelete,
  onDuplicate,
  onUpdateExpression,
  onFocusInput,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCalculusSettings, setShowCalculusSettings] = useState(false);

  const isSlider = expression.type === 'slider' || parsedInfo?.type === 'slider';
  const isParametric = expression.type === 'parametric' || parsedInfo?.type === 'parametric';
  const isPolar = expression.type === 'polar' || parsedInfo?.type === 'polar';
  const isExplicit = expression.type === 'explicit' || parsedInfo?.type === 'explicit';

  // Toggle animation for sliders
  const handleTogglePlay = () => {
    onUpdateExpression({ isPlaying: !expression.isPlaying });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateExpression({ sliderValue: val });
  };

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl border p-3 transition-all select-none ${
        isActive ? 'ring-1' : 'opacity-95'
      }`}
      style={{
        backgroundColor: theme.bgCard,
        borderColor: isActive ? theme.accent : theme.border,
        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
      }}
    >
      {/* Top Line: Color, Visibility, Input, Menu */}
      <div className="flex items-center gap-2.5">
        {/* Color Dot Button */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            title="Change curve color"
            className="w-5 h-5 rounded-full border border-black/10 transition-transform hover:scale-110 shrink-0"
            style={{ backgroundColor: expression.color }}
          />

          {showColorPicker && (
            <div
              className="absolute left-0 top-7 p-2 rounded-lg border shadow-lg z-30 flex gap-1.5 flex-wrap w-36"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {theme.curvePalette.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => {
                    onChangeColor(col);
                    setShowColorPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-black/10 transition-transform hover:scale-115"
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Visibility Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
          title={expression.visible ? 'Hide curve' : 'Show curve'}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
          style={{ color: expression.visible ? theme.textPrimary : theme.textMuted }}
        >
          {expression.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 opacity-50" />}
        </button>

        {/* Mathematical Equation Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={expression.rawText}
            onChange={(e) => onChangeText(e.target.value)}
            onFocus={onFocusInput}
            placeholder="e.g. y = sin(x), x^2+y^2=25, (cos(t), sin(t)), r = 2cos(4theta)"
            className="w-full px-2 py-1 text-sm bg-transparent border-0 outline-none font-mono focus:ring-0"
            style={{
              color: theme.textPrimary,
              fontFamily: '"Source Serif 4", "JetBrains Mono", serif',
            }}
          />
        </div>

        {/* Actions Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-7 w-40 rounded-lg border shadow-lg z-30 py-1 text-xs"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  onDuplicate();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ color: theme.textPrimary }}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              {isExplicit && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCalculusSettings(!showCalculusSettings);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ color: theme.textPrimary }}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Calculus Overlays</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Syntax Error Hint */}
      {expression.error && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-500 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{expression.error}</span>
        </div>
      )}

      {/* Dynamic Slider Controls */}
      {isSlider && (
        <div className="mt-2.5 pt-2 border-t flex flex-col gap-2" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between text-xs font-mono">
            <span style={{ color: theme.textSecondary }}>
              Variable: <strong style={{ color: theme.textPrimary }}>{expression.variableName || 'a'}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTogglePlay}
                title={expression.isPlaying ? 'Pause Animation' : 'Play Animation'}
                className="p-1 rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderColor: theme.border, color: theme.textPrimary }}
              >
                {expression.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <input
                type="number"
                step={expression.sliderStep || 0.1}
                value={expression.sliderValue ?? 0}
                onChange={handleSliderChange}
                className="w-16 px-1.5 py-0.5 rounded border text-right font-mono text-xs tabular-nums"
                style={{
                  backgroundColor: theme.bgSidebar,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono tabular-nums" style={{ color: theme.textMuted }}>
              {expression.sliderMin ?? -10}
            </span>
            <input
              type="range"
              min={expression.sliderMin ?? -10}
              max={expression.sliderMax ?? 10}
              step={expression.sliderStep ?? 0.1}
              value={expression.sliderValue ?? 0}
              onChange={handleSliderChange}
              className="flex-1 accent-amber-600 cursor-pointer"
            />
            <span className="text-2xs font-mono tabular-nums" style={{ color: theme.textMuted }}>
              {expression.sliderMax ?? 10}
            </span>
          </div>
        </div>
      )}

      {/* Parametric Interval Bounds */}
      {isParametric && (
        <div className="mt-2 pt-2 border-t flex items-center gap-3 text-xs font-mono" style={{ borderColor: theme.border }}>
          <span style={{ color: theme.textSecondary }}>Parameter t:</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              value={expression.tMin ?? 0}
              onChange={(e) => onUpdateExpression({ tMin: parseFloat(e.target.value) || 0 })}
              className="w-14 px-1 py-0.5 rounded border text-center text-xs tabular-nums"
              style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
            />
            <span style={{ color: theme.textMuted }}>≤ t ≤</span>
            <input
              type="number"
              step="0.5"
              value={parseFloat((expression.tMax ?? 6.283).toFixed(2))}
              onChange={(e) => onUpdateExpression({ tMax: parseFloat(e.target.value) || 0 })}
              className="w-14 px-1 py-0.5 rounded border text-center text-xs tabular-nums"
              style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
            />
          </div>
        </div>
      )}

      {/* Polar Interval Bounds */}
      {isPolar && (
        <div className="mt-2 pt-2 border-t flex items-center gap-3 text-xs font-mono" style={{ borderColor: theme.border }}>
          <span style={{ color: theme.textSecondary }}>Angle θ:</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              value={expression.thetaMin ?? 0}
              onChange={(e) => onUpdateExpression({ thetaMin: parseFloat(e.target.value) || 0 })}
              className="w-14 px-1 py-0.5 rounded border text-center text-xs tabular-nums"
              style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
            />
            <span style={{ color: theme.textMuted }}>≤ θ ≤</span>
            <input
              type="number"
              step="0.5"
              value={parseFloat((expression.thetaMax ?? 6.283).toFixed(2))}
              onChange={(e) => onUpdateExpression({ thetaMax: parseFloat(e.target.value) || 0 })}
              className="w-14 px-1 py-0.5 rounded border text-center text-xs tabular-nums"
              style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
            />
          </div>
        </div>
      )}

      {/* Calculus Overlays Drawer */}
      {showCalculusSettings && isExplicit && (
        <div
          className="mt-2.5 pt-2 border-t flex flex-col gap-2 text-xs"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ color: theme.textPrimary }}>Calculus Overlays</span>
            <button
              onClick={() => setShowCalculusSettings(false)}
              className="text-2xs underline"
              style={{ color: theme.textMuted }}
            >
              Close
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!expression.showDerivative}
              onChange={(e) => onUpdateExpression({ showDerivative: e.target.checked })}
              className="accent-amber-600 rounded"
            />
            <span style={{ color: theme.textSecondary }}>First Derivative f′(x) [Dashed]</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!expression.showTangent}
              onChange={(e) => onUpdateExpression({ showTangent: e.target.checked })}
              className="accent-amber-600 rounded"
            />
            <span style={{ color: theme.textSecondary }}>Tangent Line at x =</span>
            <input
              type="number"
              step="0.1"
              value={expression.tangentX ?? 1}
              onChange={(e) => onUpdateExpression({ tangentX: parseFloat(e.target.value) || 0 })}
              className="w-12 px-1 py-0.5 rounded border text-center text-xs tabular-nums"
              style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!expression.showIntegral}
              onChange={(e) => onUpdateExpression({ showIntegral: e.target.checked })}
              className="accent-amber-600 rounded"
            />
            <span style={{ color: theme.textSecondary }}>Definite Integral Area [a, b]</span>
          </label>
        </div>
      )}
    </div>
  );
};
