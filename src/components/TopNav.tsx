import React, { useState, useEffect, useRef } from 'react';
import { ThemeConfig, ThemeId, GridMode } from '../types/graph';
import { useAuth } from '../context/AuthContext';
import {
  Share2,
  Compass,
  Table,
  Sliders,
  BookOpen,
  Globe,
  User as UserIcon,
  LogIn,
  Radio,
  Network,
  Sparkles,
  ScrollText,
  Moon,
  Sun,
  Download,
  ChevronDown,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface TopNavProps {
  theme: ThemeConfig;
  themeId?: ThemeId;
  gridMode?: GridMode;
  onSelectGridMode?: (mode: GridMode) => void;
  activeMainTab?: 'studio' | 'theorems' | 'submissions';
  onSelectMainTab?: (tab: 'studio' | 'theorems' | 'submissions') => void;
  onToggleTheme?: () => void;
  onOpenPresets: () => void;
  onToggleAnalysis: () => void;
  isAnalysisOpen: boolean;
  onOpenTable: () => void;
  onOpenSettings: () => void;
  onOpenShareSubmission: () => void;
  onOpenExport?: () => void;
  onOpenGallery: () => void;
  onOpenAuth: () => void;
  onOpenP2PRoom: () => void;
  isP2PConnected: boolean;
  onOpenGraphTheory: () => void;
  onOpenResearch: () => void;
  onOpenProofProver?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  theme,
  themeId,
  gridMode = 'cartesian',
  onSelectGridMode,
  activeMainTab = 'studio',
  onSelectMainTab,
  onToggleTheme,
  onOpenPresets,
  onToggleAnalysis,
  isAnalysisOpen,
  onOpenTable,
  onOpenSettings,
  onOpenShareSubmission,
  onOpenExport,
  onOpenGallery,
  onOpenAuth,
  onOpenP2PRoom,
  isP2PConnected,
  onOpenGraphTheory,
  onOpenResearch,
  onOpenProofProver,
}) => {
  const { user, profile } = useAuth();
  const [isPlaneMenuOpen, setIsPlaneMenuOpen] = useState(false);
  const planeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (planeMenuRef.current && !planeMenuRef.current.contains(e.target as Node)) {
        setIsPlaneMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  return (
    <header
      className="flex items-center justify-between gap-3 sm:gap-8 px-3 sm:px-6 py-2 sm:py-3 border-b z-20 shrink-0 select-none transition-colors min-h-[50px] sm:min-h-[56px]"
      style={{
        backgroundColor: theme.bgSidebar,
        borderColor: theme.border,
      }}
    >
      {/* Zone 1: Single Brand Wordmark in Classical Mathematical Typography */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <a
          href="./"
          className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap truncate shrink-0 transition-opacity hover:opacity-80"
          style={{
            fontFamily: '"Cinzel", "Source Serif 4", serif',
            color: theme.textPrimary,
          }}
        >
          Stoikliem Graphica
        </a>
      </div>

      {/* Zone 2: Desktop Workspace Tabs and Auxiliary Tools */}
      <nav className="hidden md:flex items-center gap-2 lg:gap-3 text-xs font-medium">
        {/* Workspace Tab 1: Graph Studio */}
        <button
          onClick={() => onSelectMainTab?.('studio')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all whitespace-nowrap shrink-0 border ${
            activeMainTab === 'studio'
              ? 'font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-2xs'
              : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
          }`}
          style={{ color: activeMainTab === 'studio' ? undefined : theme.textPrimary }}
        >
          <span className="font-serif italic font-bold">f(x)</span>
          <span>Studio Canvas</span>
        </button>

        {/* Workspace Tab 2: Theorems & Vlog Publications */}
        <button
          onClick={() => (onSelectMainTab ? onSelectMainTab('theorems') : onOpenResearch())}
          title="Full Vlog Theorem Publications, Comments, Likes & Direct Peer P2P"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all whitespace-nowrap shrink-0 border ${
            activeMainTab === 'theorems'
              ? 'font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/40 shadow-2xs'
              : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
          }`}
          style={{ color: activeMainTab === 'theorems' ? undefined : theme.textPrimary }}
        >
          <ScrollText className="w-3.5 h-3.5 text-indigo-500" />
          <span>Theorems & Vlogs</span>
          <span className="px-1.5 py-0.2 rounded text-3xs font-mono font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
            Annals
          </span>
        </button>

        {/* Workspace Tab 3: Submissions Archive */}
        <button
          onClick={() => (onSelectMainTab ? onSelectMainTab('submissions') : onOpenGallery())}
          title="Community Graph Submissions & Personal Locus Archive"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all whitespace-nowrap shrink-0 border ${
            activeMainTab === 'submissions'
              ? 'font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-2xs'
              : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
          }`}
          style={{ color: activeMainTab === 'submissions' ? undefined : theme.textPrimary }}
        >
          <Globe className="w-3.5 h-3.5 text-amber-500" />
          <span>Submissions Archive</span>
        </button>

        <span className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-1" />

        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1 opacity-75 hover:opacity-100"
          style={{ color: theme.textSecondary }}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Presets</span>
        </button>

        <button
          onClick={onToggleAnalysis}
          title="Symbolic Computer Algebra System (CAS), Exact Derivatives, Integrals & Algebraic Solver"
          className={`flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 hover:underline py-1 ${
            isAnalysisOpen ? 'font-bold' : 'opacity-75 hover:opacity-100'
          }`}
          style={{ color: isAnalysisOpen ? theme.accent : theme.textSecondary }}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>CAS & Calculus</span>
        </button>

        <button
          onClick={onOpenGraphTheory}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1 opacity-75 hover:opacity-100"
          style={{ color: theme.textSecondary }}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Graph Theory</span>
        </button>

        {onOpenProofProver && (
          <button
            onClick={onOpenProofProver}
            title="Local Zero-API Proof Prover & Automated Theorem Verifier (Tableaux & Induction)"
            className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1 opacity-80 hover:opacity-100"
            style={{ color: theme.textSecondary }}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Proof Prover</span>
            <span className="px-1 py-0.2 rounded text-3xs font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              Zero-API
            </span>
          </button>
        )}

        {/* P2P Room Link with Live Status */}
        <button
          onClick={onOpenP2PRoom}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1 opacity-75 hover:opacity-100"
          style={{ color: isP2PConnected ? '#16A34A' : theme.textSecondary }}
        >
          <Radio className={`w-3.5 h-3.5 ${isP2PConnected ? 'animate-pulse text-emerald-600' : ''}`} />
          <span>P2P Room</span>
          {isP2PConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block ml-0.5" />
          )}
        </button>

        {/* Plane Type & Cartography Dropdown */}
        <div className="relative" ref={planeMenuRef}>
          <button
            onClick={() => {
              if (onSelectGridMode) {
                setIsPlaneMenuOpen(!isPlaneMenuOpen);
              } else {
                onOpenSettings();
              }
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all whitespace-nowrap shrink-0 border ${
              gridMode === 'complex' || gridMode === 'complex_vector'
                ? 'font-semibold border-amber-500/40 bg-amber-500/10'
                : 'border-transparent hover:border-black/10 dark:hover:border-white/10'
            }`}
            style={{
              color:
                gridMode === 'complex' || gridMode === 'complex_vector'
                  ? '#D97706'
                  : theme.textSecondary,
            }}
            title="Switch Plane Type (Cartesian, Complex Plane, Vector Field, Polar, Trig)"
          >
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-medium">
              {gridMode === 'complex'
                ? 'Plane: Complex ℂ'
                : gridMode === 'complex_vector'
                ? 'Plane: Vector Field 𝔉'
                : gridMode === 'polar'
                ? 'Plane: Polar'
                : gridMode === 'trig'
                ? 'Plane: Trig (π)'
                : 'Plane: Cartesian'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {isPlaneMenuOpen && (
            <div
              className="absolute top-full right-0 mt-2 w-56 p-1.5 rounded-xl border shadow-2xl z-50 flex flex-col gap-0.5 text-xs animate-in fade-in zoom-in-95 duration-100"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            >
              <div className="px-2 py-1 text-3xs uppercase tracking-wider font-bold opacity-60 border-b pb-1 mb-0.5" style={{ borderColor: theme.border }}>
                Select Coordinate Plane
              </div>

              {[
                { id: 'cartesian', label: '☩ Cartesian Plane', sub: '(x, y) Standard Axes' },
                { id: 'complex', label: 'ℂ Complex Plane', sub: 'Re(z) & Im(z) Argand diagram' },
                { id: 'complex_vector', label: '𝔉 Complex Vector Field', sub: 'Polya flow & phase needles' },
                { id: 'polar', label: '◎ Polar Coordinates', sub: '(r, θ) Concentric Circles' },
                { id: 'trig', label: '∿ Trigonometric Grid', sub: 'Multiples of π' },
              ].map((p) => {
                const isSelected = gridMode === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectGridMode?.(p.id as GridMode);
                      setIsPlaneMenuOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors ${
                      isSelected ? 'font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs">{p.label}</span>
                      <span className="text-3xs opacity-65">{p.sub}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  </button>
                );
              })}

              <div className="border-t my-1" style={{ borderColor: theme.border }} />

              <button
                type="button"
                onClick={() => {
                  setIsPlaneMenuOpen(false);
                  onOpenSettings();
                }}
                className="px-2 py-1 rounded text-3xs font-medium text-left hover:underline opacity-80 hover:opacity-100 flex items-center gap-1.5"
                style={{ color: theme.accent }}
              >
                <Sliders className="w-3 h-3" />
                <span>More Grid, Theme & Cartography Settings...</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Zone 3: Actions & Account Affordance */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Dark Mode / Manuscript Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={
              themeId === 'slate' || themeId === 'engraving'
                ? 'Switch to Parchment Manuscript (Light Mode)'
                : 'Switch to Royal Slate Blackboard (Dark Mode)'
            }
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 min-h-[40px] sm:min-h-[38px] active:scale-95"
            style={{
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
            aria-label="Toggle Dark Mode"
          >
            {themeId === 'slate' || themeId === 'engraving' ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="hidden lg:inline text-2xs">Parchment</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500" />
                <span className="hidden lg:inline text-2xs">Slate Dark</span>
              </>
            )}
          </button>
        )}

        {/* User Account / Profile Dossier */}
        <button
          onClick={onOpenAuth}
          title={
            user
              ? `Profile: @${profile?.username || user.displayName || user.email} (${profile?.academicTitle || 'Scholar'})`
              : 'Sign In'
          }
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors whitespace-nowrap min-h-[40px] sm:min-h-[38px] active:scale-95"
          style={{
            borderColor: theme.border,
            color: theme.textPrimary,
          }}
          aria-label={user ? 'User Profile' : 'Sign In'}
        >
          {user ? (
            <>
              {profile?.avatarUrl || user.photoURL ? (
                <img
                  src={profile?.avatarUrl || user.photoURL || ''}
                  alt={profile?.displayName || user.displayName || 'User'}
                  className="w-5 h-5 sm:w-4 sm:h-4 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-sm sm:text-xs leading-none">
                  {profile?.avatarEmoji || '📐'}
                </span>
              )}
              <span className="hidden sm:inline font-mono truncate max-w-[110px] font-semibold">
                @{profile?.username || user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </>
          )}
        </button>

        {/* Export / Figures Modal Button */}
        {onOpenExport && (
          <button
            onClick={onOpenExport}
            title="Export high-res PNG, transparent raster, SVG vector & LaTeX figures"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 min-h-[40px] sm:min-h-[38px] active:scale-95"
            style={{
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
            aria-label="Export Figures"
          >
            <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        )}

        {/* Primary CTA: Share Submission */}
        <button
          onClick={onOpenShareSubmission}
          className="px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 hover:opacity-90 active:scale-95 min-h-[40px] sm:min-h-[38px]"
          style={{
            backgroundColor: theme.textPrimary,
            color: theme.bgCanvas,
          }}
          aria-label="Share Submission"
        >
          <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden xs:inline">Share</span>
          <span className="hidden sm:inline">Submission</span>
        </button>
      </div>
    </header>
  );
};
