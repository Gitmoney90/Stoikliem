import React from 'react';
import { GraphExpression, ThemeConfig } from '../types/graph';
import { ParsedEquationInfo } from '../math/evaluator';
import { ExpressionItem } from './ExpressionItem';
import { VirtualKeypad } from './VirtualKeypad';
import { Plus, Sliders, Hash, X } from 'lucide-react';

interface SidebarProps {
  expressions: GraphExpression[];
  parsedEquations: Map<string, ParsedEquationInfo>;
  activeExpressionId: string | null;
  theme: ThemeConfig;
  isOpen: boolean;
  onToggleSidebar: () => void;
  onSelectExpression: (id: string) => void;
  onAddExpression: (typeHint?: 'function' | 'slider' | 'parametric' | 'polar') => void;
  onUpdateText: (id: string, text: string) => void;
  onToggleVisible: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onDeleteExpression: (id: string) => void;
  onDuplicateExpression: (id: string) => void;
  onUpdateExpressionData: (id: string, data: Partial<GraphExpression>) => void;
  isKeypadOpen: boolean;
  onToggleKeypad: () => void;
  onInsertKeypadText: (str: string) => void;
  onKeypadBackspace: () => void;
  onKeypadClear: () => void;
  onOpenCAS?: (id: string) => void;
  onAddExpressionWithText?: (rawText: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  expressions,
  parsedEquations,
  activeExpressionId,
  theme,
  isOpen,
  onToggleSidebar,
  onSelectExpression,
  onAddExpression,
  onUpdateText,
  onToggleVisible,
  onChangeColor,
  onDeleteExpression,
  onDuplicateExpression,
  onUpdateExpressionData,
  isKeypadOpen,
  onToggleKeypad,
  onInsertKeypadText,
  onKeypadBackspace,
  onKeypadClear,
  onOpenCAS,
  onAddExpressionWithText,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
          onClick={onToggleSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 md:z-10 w-[88vw] max-w-[360px] md:w-80 lg:w-96 h-full border-r shadow-2xl md:shadow-none flex flex-col transition-all duration-300 shrink-0 ${
          isOpen
            ? 'translate-x-0 md:w-80 lg:w-96'
            : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0 pointer-events-none md:pointer-events-auto'
        }`}
        style={{
          backgroundColor: theme.bgSidebar,
          borderColor: theme.border,
        }}
      >
        {/* Sidebar Header Toolbar */}
        <div
          className="p-3 border-b flex items-center justify-between shrink-0 min-h-[52px]"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddExpression('function')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-xs transition-transform active:scale-95 hover:opacity-90 min-h-[40px]"
              style={{
                backgroundColor: theme.accent,
                color: '#FFFFFF',
              }}
              aria-label="Add Equation Item"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>

            <button
              onClick={() => onAddExpression('slider')}
              title="Add Parameter Slider"
              className="px-3 py-2 text-xs font-medium rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 min-h-[40px] active:scale-95"
              style={{
                borderColor: theme.border,
                color: theme.textSecondary,
              }}
              aria-label="Add Slider"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Slider</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono tabular-nums px-2 py-0.5 rounded"
              style={{ color: theme.textMuted }}
            >
              {expressions.length} {expressions.length === 1 ? 'item' : 'items'}
            </span>

            {/* Mobile Close Button */}
            <button
              onClick={onToggleSidebar}
              className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: theme.textSecondary }}
              aria-label="Close Curves Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Mathematical Template Chips Strip */}
        <div
          className="px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto shrink-0 select-none text-2xs"
          style={{ borderColor: theme.border, backgroundColor: theme.bgCard }}
        >
          <span className="text-3xs uppercase tracking-wider font-semibold opacity-60 shrink-0 mr-1">
            Quick:
          </span>
          {[
            { label: 'sin(x)', text: 'y = sin(x)' },
            { label: 'x² - 4', text: 'y = x^2 - 4' },
            { label: 'e^(-x²)', text: 'y = exp(-x^2)' },
            { label: '1/x', text: 'y = 1/x' },
            { label: 'ln(x)', text: 'y = ln(x)' },
            { label: 'x³ - 3x', text: 'y = x^3 - 3*x' },
            { label: 'x²+y²=25', text: 'x^2 + y^2 = 25' },
            { label: 'r = 1+cos(θ)', text: 'r = 1 + cos(theta)' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onAddExpressionWithText ? onAddExpressionWithText(item.text) : onAddExpression('function')}
              title={`Quickly plot ${item.label}`}
              className="px-2 py-0.5 rounded-md border font-mono whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all text-3xs"
              style={{
                borderColor: theme.border,
                color: theme.textSecondary,
                backgroundColor: theme.bgSidebar,
              }}
            >
              +{item.label}
            </button>
          ))}
        </div>

      {/* Expression Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {(() => {
          const existingSliderVars = new Set(
            expressions
              .filter((e) => e.type === 'slider' || e.variableName)
              .map((e) => e.variableName || '')
          );

          const handleAddSliderForVar = (v: string) => {
            if (onAddExpressionWithText) {
              onAddExpressionWithText(`${v} = 1`);
            } else {
              onAddExpression('slider');
            }
          };

          return expressions.map((expr) => (
            <ExpressionItem
              key={expr.id}
              expression={expr}
              parsedInfo={parsedEquations.get(expr.id)}
              isActive={expr.id === activeExpressionId}
              theme={theme}
              onSelect={() => onSelectExpression(expr.id)}
              onChangeText={(text) => onUpdateText(expr.id, text)}
              onToggleVisible={() => onToggleVisible(expr.id)}
              onChangeColor={(col) => onChangeColor(expr.id, col)}
              onDelete={() => onDeleteExpression(expr.id)}
              onDuplicate={() => onDuplicateExpression(expr.id)}
              onUpdateExpression={(data) => onUpdateExpressionData(expr.id, data)}
              onFocusInput={() => onSelectExpression(expr.id)}
              onOpenCAS={() => onOpenCAS?.(expr.id)}
              existingSliderVars={existingSliderVars}
              onAddSlider={handleAddSliderForVar}
            />
          ));
        })()}

        {expressions.length === 0 && (
          <div
            className="py-12 text-center text-xs flex flex-col items-center justify-center gap-2"
            style={{ color: theme.textMuted }}
          >
            <Hash className="w-8 h-8 opacity-30" />
            <p>No active mathematical curves.</p>
            <button
              onClick={() => onAddExpression('function')}
              className="text-amber-700 underline font-medium"
            >
              Add your first equation
            </button>
          </div>
        )}
      </div>

      {/* Virtual Keypad Dock */}
      <VirtualKeypad
        theme={theme}
        isOpen={isKeypadOpen}
        onToggle={onToggleKeypad}
        onInsertText={onInsertKeypadText}
        onBackspace={onKeypadBackspace}
        onClear={onKeypadClear}
      />
    </aside>
    </>
  );
};
