import React, { useState } from 'react';
import { ThemeConfig } from '../types/graph';
import { CLASSIC_PRESETS, CurvePreset } from '../math/presets';
import { X, BookOpen, Compass, ArrowRight } from 'lucide-react';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onLoadPreset: (preset: CurvePreset) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onLoadPreset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = [
    'All',
    'Implicit Curves',
    'Polar Classics',
    'Parametric Curves',
    'Calculus & Transcendental',
  ];

  const filtered =
    selectedCategory === 'All'
      ? CLASSIC_PRESETS
      : CLASSIC_PRESETS.filter((p) => p.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[88vh] animate-in fade-in zoom-in-95 duration-150"
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
          <div className="flex items-center gap-2.5 sm:gap-3">
            <BookOpen className="w-5 h-5 shrink-0" style={{ color: theme.accent }} />
            <div>
              <h2
                className="text-sm sm:text-base font-bold tracking-tight"
                style={{
                  fontFamily: '"Cinzel", "Source Serif 4", serif',
                  color: theme.textPrimary,
                }}
              >
                Classical Mathematical Curves
              </h2>
              <p className="text-2xs sm:text-xs line-clamp-1" style={{ color: theme.textSecondary }}>
                Historical treatises & renowned geometrical loci from Archimedes to modern algebra
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
            aria-label="Close presets"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div
          className="px-6 py-2.5 border-b flex items-center gap-2 overflow-x-auto shrink-0"
          style={{ borderColor: theme.border }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'shadow-xs font-semibold' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedCategory === cat ? theme.accent : 'transparent',
                color: selectedCategory === cat ? '#FFFFFF' : theme.textSecondary,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Presets Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                onLoadPreset(preset);
                onClose();
              }}
              className="p-4 rounded-xl border cursor-pointer group transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between"
              style={{
                backgroundColor: theme.bgSidebar,
                borderColor: theme.border,
              }}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3
                    className="font-bold text-sm tracking-tight group-hover:text-amber-700 transition-colors"
                    style={{
                      fontFamily: '"Source Serif 4", serif',
                      color: theme.textPrimary,
                    }}
                  >
                    {preset.name}
                  </h3>
                  <span
                    className="text-2xs font-mono px-2 py-0.5 rounded shrink-0"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      color: theme.textSecondary,
                    }}
                  >
                    {preset.historicalPeriod}
                  </span>
                </div>

                <div className="text-2xs font-serif italic mb-2" style={{ color: theme.accent }}>
                  {preset.discoverer}
                </div>

                <p className="text-xs line-clamp-2 mb-3 leading-relaxed" style={{ color: theme.textSecondary }}>
                  {preset.description}
                </p>

                {/* Expressions snippet */}
                <div className="p-2 rounded font-mono text-2xs space-y-1 bg-black/5 dark:bg-white/5">
                  {preset.expressions.map((e, idx) => (
                    <div key={idx} className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                      <span className="truncate" style={{ color: theme.textPrimary }}>
                        {e.rawText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs font-semibold group-hover:text-amber-700 transition-colors" style={{ borderColor: theme.border, color: theme.textPrimary }}>
                <span>Load Treatise Locus</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
