import React from 'react';
import { ThemeConfig } from '../types/graph';
import { Download, Compass, Table, Sliders, BookOpen, Layers } from 'lucide-react';

interface TopNavProps {
  theme: ThemeConfig;
  onOpenPresets: () => void;
  onToggleAnalysis: () => void;
  isAnalysisOpen: boolean;
  onOpenTable: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  theme,
  onOpenPresets,
  onToggleAnalysis,
  isAnalysisOpen,
  onOpenTable,
  onOpenSettings,
  onOpenExport,
}) => {
  return (
    <header
      className="flex items-center justify-between gap-8 px-6 py-3.5 border-b z-20 shrink-0 select-none transition-colors"
      style={{
        backgroundColor: theme.bgSidebar,
        borderColor: theme.border,
      }}
    >
      {/* Zone 1: Single Brand Wordmark in Classical Mathematical Typography */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0 transition-opacity hover:opacity-80"
          style={{
            fontFamily: '"Cinzel", "Source Serif 4", serif',
            color: theme.textPrimary,
          }}
        >
          Principia Graphica
        </a>
      </div>

      {/* Zone 2: 4-5 Concise Single-Line Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1"
          style={{ color: theme.textSecondary }}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Classic Presets</span>
        </button>

        <button
          onClick={onToggleAnalysis}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1 ${
            isAnalysisOpen ? 'font-semibold' : ''
          }`}
          style={{ color: isAnalysisOpen ? theme.accent : theme.textSecondary }}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Calculus Studio</span>
        </button>

        <button
          onClick={onOpenTable}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1"
          style={{ color: theme.textSecondary }}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Value Table</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1"
          style={{ color: theme.textSecondary }}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Cartography & Grid</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenExport}
          className="px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: theme.textPrimary,
            color: theme.bgCanvas,
          }}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Graphic</span>
        </button>
      </div>
    </header>
  );
};
