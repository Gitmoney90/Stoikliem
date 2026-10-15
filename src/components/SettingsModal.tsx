import React from 'react';
import { ThemeConfig, ThemeId, GridMode } from '../types/graph';
import { THEMES } from '../math/themes';
import { X, Compass, Palette, Eye } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeConfig;
  onSelectTheme: (themeId: ThemeId) => void;
  gridMode: GridMode;
  onSelectGridMode: (mode: GridMode) => void;
  showMinorGrid: boolean;
  onToggleMinorGrid: (show: boolean) => void;
  angleUnit: 'rad' | 'deg';
  onSelectAngleUnit: (unit: 'rad' | 'deg') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  gridMode,
  onSelectGridMode,
  showMinorGrid,
  onToggleMinorGrid,
  angleUnit,
  onSelectAngleUnit,
}) => {
  if (!isOpen) return null;

  const themesList = Object.values(THEMES);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: currentTheme.bgCard,
          borderColor: currentTheme.border,
        }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-3.5 sm:py-4 border-b flex items-center justify-between shrink-0 min-h-[52px]"
          style={{
            backgroundColor: currentTheme.bgSidebar,
            borderColor: currentTheme.border,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5" style={{ color: currentTheme.accent }} />
            <h2
              className="text-sm sm:text-base font-bold tracking-tight"
              style={{
                fontFamily: '"Cinzel", "Source Serif 4", serif',
                color: currentTheme.textPrimary,
              }}
            >
              Cartography & Graph Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: currentTheme.textSecondary }}
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans">
          {/* Aesthetic Themes */}
          <div>
            <label className="flex items-center gap-2 text-2xs uppercase tracking-wider font-bold mb-3" style={{ color: currentTheme.textMuted }}>
              <Palette className="w-3.5 h-3.5" />
              <span>Classical Treatise Theme</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {themesList.map((th) => (
                <div
                  key={th.id}
                  onClick={() => onSelectTheme(th.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    currentTheme.id === th.id ? 'ring-2' : 'hover:opacity-85'
                  }`}
                  style={{
                    backgroundColor: th.bgCanvas,
                    borderColor: currentTheme.id === th.id ? currentTheme.accent : th.border,
                  }}
                >
                  <div className="font-semibold text-xs mb-1" style={{ color: th.textPrimary }}>
                    {th.name}
                  </div>
                  <p className="text-2xs leading-relaxed line-clamp-2" style={{ color: th.textSecondary }}>
                    {th.description}
                  </p>
                  <div className="flex gap-1 mt-2.5">
                    {th.curvePalette.slice(0, 5).map((c, i) => (
                      <span key={i} className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coordinate Grid System & Plane Type */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-2xs uppercase tracking-wider font-bold" style={{ color: currentTheme.textMuted }}>
                Mathematical Plane Type & Coordinate System
              </label>
              <span className="text-3xs px-2 py-0.5 rounded-full font-mono font-semibold" style={{ backgroundColor: `${currentTheme.accent}20`, color: currentTheme.accent }}>
                {gridMode === 'complex'
                  ? 'ℂ Argand Plane'
                  : gridMode === 'complex_vector'
                  ? '𝔉 Vector Field'
                  : gridMode === 'polar'
                  ? 'Polar (r, θ)'
                  : gridMode === 'trig'
                  ? 'Trigonometric (π)'
                  : 'Cartesian (x, y)'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSelectGridMode('cartesian')}
                className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                  gridMode === 'cartesian' ? 'font-semibold shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: gridMode === 'cartesian' ? currentTheme.accent : 'transparent',
                  borderColor: currentTheme.border,
                  color: gridMode === 'cartesian' ? '#FFFFFF' : currentTheme.textPrimary,
                }}
              >
                <div className="text-xs font-semibold">Cartesian</div>
                <div className="text-3xs opacity-80">(x, y) Real Axes</div>
              </button>

              <button
                type="button"
                onClick={() => onSelectGridMode('complex')}
                className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                  gridMode === 'complex' ? 'font-semibold shadow-xs ring-1 ring-amber-400/40' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: gridMode === 'complex' ? currentTheme.accent : 'transparent',
                  borderColor: currentTheme.border,
                  color: gridMode === 'complex' ? '#FFFFFF' : currentTheme.textPrimary,
                }}
              >
                <div className="text-xs font-semibold flex items-center justify-center gap-1">
                  <span>ℂ Complex Plane</span>
                </div>
                <div className="text-3xs opacity-80">Re(z) & Im(z) Argand</div>
              </button>

              <button
                type="button"
                onClick={() => onSelectGridMode('complex_vector')}
                className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                  gridMode === 'complex_vector' ? 'font-semibold shadow-xs ring-1 ring-cyan-400/40' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: gridMode === 'complex_vector' ? currentTheme.accent : 'transparent',
                  borderColor: currentTheme.border,
                  color: gridMode === 'complex_vector' ? '#FFFFFF' : currentTheme.textPrimary,
                }}
              >
                <div className="text-xs font-semibold">𝔉 Vector Field</div>
                <div className="text-3xs opacity-80">Flow & Polya Needles</div>
              </button>

              <button
                type="button"
                onClick={() => onSelectGridMode('polar')}
                className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                  gridMode === 'polar' ? 'font-semibold shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: gridMode === 'polar' ? currentTheme.accent : 'transparent',
                  borderColor: currentTheme.border,
                  color: gridMode === 'polar' ? '#FFFFFF' : currentTheme.textPrimary,
                }}
              >
                <div className="text-xs font-semibold">Polar Grid</div>
                <div className="text-3xs opacity-80">(r, θ) Concentric</div>
              </button>

              <button
                type="button"
                onClick={() => onSelectGridMode('trig')}
                className={`py-2 px-2.5 rounded-lg border text-center transition-all col-span-2 sm:col-span-2 ${
                  gridMode === 'trig' ? 'font-semibold shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: gridMode === 'trig' ? currentTheme.accent : 'transparent',
                  borderColor: currentTheme.border,
                  color: gridMode === 'trig' ? '#FFFFFF' : currentTheme.textPrimary,
                }}
              >
                <div className="text-xs font-semibold">Trigonometric Grid</div>
                <div className="text-3xs opacity-80">Horizontal Multiples of π (π/4, π/2, π, 2π)</div>
              </button>
            </div>
          </div>

          {/* Angles and Minor Lines */}
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: currentTheme.border }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold block" style={{ color: currentTheme.textPrimary }}>
                  Angular Units
                </span>
                <span className="text-2xs" style={{ color: currentTheme.textMuted }}>
                  Affects trigonometric evaluation in sin, cos, tan
                </span>
              </div>
              <div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: currentTheme.border }}>
                <button
                  type="button"
                  onClick={() => onSelectAngleUnit('rad')}
                  className={`px-3 py-1 rounded text-2xs font-semibold ${
                    angleUnit === 'rad' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: angleUnit === 'rad' ? currentTheme.bgSidebar : 'transparent',
                    color: currentTheme.textPrimary,
                  }}
                >
                  Radians
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAngleUnit('deg')}
                  className={`px-3 py-1 rounded text-2xs font-semibold ${
                    angleUnit === 'deg' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: angleUnit === 'deg' ? currentTheme.bgSidebar : 'transparent',
                    color: currentTheme.textPrimary,
                  }}
                >
                  Degrees
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold block" style={{ color: currentTheme.textPrimary }}>
                  Minor Coordinate Subdivisions
                </span>
                <span className="text-2xs" style={{ color: currentTheme.textMuted }}>
                  Fine intermediate tick lines between major integers
                </span>
              </div>
              <input
                type="checkbox"
                checked={showMinorGrid}
                onChange={(e) => onToggleMinorGrid(e.target.checked)}
                className="accent-amber-600 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
