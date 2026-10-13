import React, { useState } from 'react';
import { ThemeConfig } from '../types/graph';
import { ChevronDown, ChevronUp, Delete } from 'lucide-react';

interface VirtualKeypadProps {
  theme: ThemeConfig;
  isOpen: boolean;
  onToggle: () => void;
  onInsertText: (str: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

type KeypadTab = 'main' | 'functions' | 'calculus' | 'symbols';

export const VirtualKeypad: React.FC<VirtualKeypadProps> = ({
  theme,
  isOpen,
  onToggle,
  onInsertText,
  onBackspace,
  onClear,
}) => {
  const [activeTab, setActiveTab] = useState<KeypadTab>('main');

  if (!isOpen) {
    return (
      <div
        className="border-t p-2 flex items-center justify-between transition-colors select-none shrink-0"
        style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}
      >
        <button
          onClick={onToggle}
          className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ color: theme.textSecondary }}
        >
          <span className="font-serif italic font-bold">f(x)</span>
          <span>Virtual Keypad</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="border-t p-3 select-none transition-colors shrink-0 flex flex-col gap-2"
      style={{
        backgroundColor: theme.bgSidebar,
        borderColor: theme.border,
      }}
    >
      {/* Header and Category Tabs */}
      <div className="flex items-center justify-between gap-1 pb-1">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('main')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] flex items-center justify-center ${
              activeTab === 'main' ? 'shadow-xs font-bold' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === 'main' ? theme.bgCard : 'transparent',
              color: theme.textPrimary,
            }}
          >
            123
          </button>
          <button
            onClick={() => setActiveTab('functions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] flex items-center justify-center ${
              activeTab === 'functions' ? 'shadow-xs font-bold' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === 'functions' ? theme.bgCard : 'transparent',
              color: theme.textPrimary,
            }}
          >
            Functions
          </button>
          <button
            onClick={() => setActiveTab('calculus')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] flex items-center justify-center ${
              activeTab === 'calculus' ? 'shadow-xs font-bold' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === 'calculus' ? theme.bgCard : 'transparent',
              color: theme.textPrimary,
            }}
          >
            Calculus
          </button>
          <button
            onClick={() => setActiveTab('symbols')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] flex items-center justify-center ${
              activeTab === 'symbols' ? 'shadow-xs font-bold' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === 'symbols' ? theme.bgCard : 'transparent',
              color: theme.textPrimary,
            }}
          >
            Symbols
          </button>
        </div>

        <button
          onClick={onToggle}
          title="Minimize Keypad"
          className="min-w-[36px] min-h-[36px] p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-70 hover:opacity-100 flex items-center justify-center"
          style={{ color: theme.textSecondary }}
          aria-label="Minimize Keypad"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Main Tab (Numbers & Primary Operations) */}
      {activeTab === 'main' && (
        <div className="grid grid-cols-6 gap-1.5 text-xs font-mono">
          <KeyBtn theme={theme} label="x" action={() => onInsertText('x')} />
          <KeyBtn theme={theme} label="y" action={() => onInsertText('y')} />
          <KeyBtn theme={theme} label="7" action={() => onInsertText('7')} />
          <KeyBtn theme={theme} label="8" action={() => onInsertText('8')} />
          <KeyBtn theme={theme} label="9" action={() => onInsertText('9')} />
          <KeyBtn theme={theme} label="÷" action={() => onInsertText('/')} />

          <KeyBtn theme={theme} label="x²" action={() => onInsertText('^2')} />
          <KeyBtn theme={theme} label="xʸ" action={() => onInsertText('^')} />
          <KeyBtn theme={theme} label="4" action={() => onInsertText('4')} />
          <KeyBtn theme={theme} label="5" action={() => onInsertText('5')} />
          <KeyBtn theme={theme} label="6" action={() => onInsertText('6')} />
          <KeyBtn theme={theme} label="×" action={() => onInsertText('*')} />

          <KeyBtn theme={theme} label="√" action={() => onInsertText('sqrt(')} />
          <KeyBtn theme={theme} label="π" action={() => onInsertText('pi')} />
          <KeyBtn theme={theme} label="1" action={() => onInsertText('1')} />
          <KeyBtn theme={theme} label="2" action={() => onInsertText('2')} />
          <KeyBtn theme={theme} label="3" action={() => onInsertText('3')} />
          <KeyBtn theme={theme} label="-" action={() => onInsertText('-')} />

          <KeyBtn theme={theme} label="(" action={() => onInsertText('(')} />
          <KeyBtn theme={theme} label=")" action={() => onInsertText(')')} />
          <KeyBtn theme={theme} label="0" action={() => onInsertText('0')} />
          <KeyBtn theme={theme} label="." action={() => onInsertText('.')} />
          <KeyBtn theme={theme} label="=" action={() => onInsertText('=')} />
          <KeyBtn theme={theme} label="+" action={() => onInsertText('+')} />
        </div>
      )}

      {/* Functions Tab (Trigonometry, Exponentials & Logarithms) */}
      {activeTab === 'functions' && (
        <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
          <KeyBtn theme={theme} label="sin" action={() => onInsertText('sin(')} />
          <KeyBtn theme={theme} label="cos" action={() => onInsertText('cos(')} />
          <KeyBtn theme={theme} label="tan" action={() => onInsertText('tan(')} />
          <KeyBtn theme={theme} label="ln" action={() => onInsertText('ln(')} />
          <KeyBtn theme={theme} label="log" action={() => onInsertText('log10(')} />

          <KeyBtn theme={theme} label="asin" action={() => onInsertText('asin(')} />
          <KeyBtn theme={theme} label="acos" action={() => onInsertText('acos(')} />
          <KeyBtn theme={theme} label="atan" action={() => onInsertText('atan(')} />
          <KeyBtn theme={theme} label="exp" action={() => onInsertText('exp(')} />
          <KeyBtn theme={theme} label="e" action={() => onInsertText('e')} />

          <KeyBtn theme={theme} label="sinh" action={() => onInsertText('sinh(')} />
          <KeyBtn theme={theme} label="cosh" action={() => onInsertText('cosh(')} />
          <KeyBtn theme={theme} label="tanh" action={() => onInsertText('tanh(')} />
          <KeyBtn theme={theme} label="|x|" action={() => onInsertText('abs(')} />
          <KeyBtn theme={theme} label="x!" action={() => onInsertText('!')} />

          <KeyBtn theme={theme} label="sec" action={() => onInsertText('sec(')} />
          <KeyBtn theme={theme} label="csc" action={() => onInsertText('csc(')} />
          <KeyBtn theme={theme} label="cot" action={() => onInsertText('cot(')} />
          <KeyBtn theme={theme} label="min" action={() => onInsertText('min(')} />
          <KeyBtn theme={theme} label="max" action={() => onInsertText('max(')} />
        </div>
      )}

      {/* Calculus Tab */}
      {activeTab === 'calculus' && (
        <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
          <KeyBtn theme={theme} label="t" action={() => onInsertText('t')} />
          <KeyBtn theme={theme} label="θ" action={() => onInsertText('theta')} />
          <KeyBtn theme={theme} label="r" action={() => onInsertText('r')} />
          <KeyBtn theme={theme} label="a" action={() => onInsertText('a')} />

          <KeyBtn theme={theme} label="∫ a,b" action={() => onInsertText('')} title="Enable Integral in Calculus Studio" />
          <KeyBtn theme={theme} label="d/dx" action={() => onInsertText('')} title="Enable Derivative in Calculus Studio" />
          <KeyBtn theme={theme} label="<" action={() => onInsertText('<')} />
          <KeyBtn theme={theme} label=">" action={() => onInsertText('>')} />

          <KeyBtn theme={theme} label="≤" action={() => onInsertText('<=')} />
          <KeyBtn theme={theme} label="≥" action={() => onInsertText('>=')} />
          <KeyBtn theme={theme} label="," action={() => onInsertText(', ')} />
          <KeyBtn theme={theme} label="⌫" action={onBackspace} />
        </div>
      )}

      {/* Symbols & Constants Tab */}
      {activeTab === 'symbols' && (
        <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
          <KeyBtn theme={theme} label="π" action={() => onInsertText('pi')} />
          <KeyBtn theme={theme} label="e" action={() => onInsertText('e')} />
          <KeyBtn theme={theme} label="τ" action={() => onInsertText('tau')} />
          <KeyBtn theme={theme} label="φ" action={() => onInsertText('phi')} />
          <KeyBtn theme={theme} label="θ" action={() => onInsertText('theta')} />

          <KeyBtn theme={theme} label="k" action={() => onInsertText('k')} />
          <KeyBtn theme={theme} label="m" action={() => onInsertText('m')} />
          <KeyBtn theme={theme} label="b" action={() => onInsertText('b')} />
          <KeyBtn theme={theme} label="c" action={() => onInsertText('c')} />
          <KeyBtn theme={theme} label="n" action={() => onInsertText('n')} />

          <KeyBtn theme={theme} label="^3" action={() => onInsertText('^3')} />
          <KeyBtn theme={theme} label="^4" action={() => onInsertText('^4')} />
          <KeyBtn theme={theme} label="%" action={() => onInsertText('%')} />
          <KeyBtn theme={theme} label="Clear" action={onClear} />
          <KeyBtn theme={theme} label="⌫" action={onBackspace} />
        </div>
      )}
    </div>
  );
};

const KeyBtn: React.FC<{
  theme: ThemeConfig;
  label: string;
  action: () => void;
  title?: string;
}> = ({ theme, label, action, title }) => (
  <button
    type="button"
    onClick={action}
    title={title}
    className="h-10 sm:h-8 min-h-[40px] sm:min-h-[32px] flex items-center justify-center rounded-lg sm:rounded border transition-all active:scale-95 shadow-2xs hover:opacity-90 text-xs sm:text-xs font-semibold sm:font-normal"
    style={{
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      color: theme.textPrimary,
    }}
  >
    {label}
  </button>
);
