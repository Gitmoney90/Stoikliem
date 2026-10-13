import React from 'react';
import { GraphExpression, ThemeConfig } from '../types/graph';
import { ParsedEquationInfo } from '../math/evaluator';
import { ExpressionItem } from './ExpressionItem';
import { VirtualKeypad } from './VirtualKeypad';
import { Plus, ChevronLeft, ChevronRight, Sliders, Hash } from 'lucide-react';

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
}) => {
  return (
    <aside
      className={`relative flex flex-col h-full border-r transition-all duration-300 z-10 shrink-0 ${
        isOpen ? 'w-80 md:w-96' : 'w-0 overflow-hidden border-r-0'
      }`}
      style={{
        backgroundColor: theme.bgSidebar,
        borderColor: theme.border,
      }}
    >
      {/* Sidebar Header Toolbar */}
      <div
        className="p-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: theme.border }}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAddExpression('function')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-transform active:scale-95 hover:opacity-90"
            style={{
              backgroundColor: theme.accent,
              color: '#FFFFFF',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>

          <button
            onClick={() => onAddExpression('slider')}
            title="Add Parameter Slider"
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
            style={{
              borderColor: theme.border,
              color: theme.textSecondary,
            }}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Slider</span>
          </button>
        </div>

        <span
          className="text-xs font-mono tabular-nums px-2 py-0.5 rounded"
          style={{ color: theme.textMuted }}
        >
          {expressions.length} {expressions.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Expression Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {expressions.map((expr) => (
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
          />
        ))}

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
  );
};
