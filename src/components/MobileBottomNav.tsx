import React, { useState } from 'react';
import { ThemeConfig, GridMode } from '../types/graph';
import {
  Compass,
  Sliders,
  BookOpen,
  Network,
  Menu,
  X,
  Share2,
  Table,
  Radio,
  Globe,
  Download,
  User as UserIcon,
  Calculator,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ScrollText,
  ShieldCheck,
  Box,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MainWorkspaceTab } from '../types/graph';

interface MobileBottomNavProps {
  theme: ThemeConfig;
  expressionsCount: number;
  gridMode?: GridMode;
  onSelectGridMode?: (mode: GridMode) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isAnalysisOpen: boolean;
  onToggleAnalysis: () => void;
  onOpenPresets: () => void;
  onOpenGraphTheory: () => void;
  onOpenTable: () => void;
  onOpenSettings: () => void;
  onOpenShareSubmission: () => void;
  onOpenGallery: () => void;
  onOpenP2PRoom: () => void;
  isP2PConnected: boolean;
  onOpenAuth: () => void;
  onOpenExport: () => void;
  isKeypadOpen: boolean;
  onToggleKeypad: () => void;
  onOpenResearch: () => void;
  onOpenProofProver?: () => void;
  activeMainTab?: MainWorkspaceTab;
  onSelectMainTab?: (tab: MainWorkspaceTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  theme,
  expressionsCount,
  gridMode = 'cartesian',
  onSelectGridMode,
  isSidebarOpen,
  onToggleSidebar,
  isAnalysisOpen,
  onToggleAnalysis,
  onOpenPresets,
  onOpenGraphTheory,
  onOpenTable,
  onOpenSettings,
  onOpenShareSubmission,
  onOpenGallery,
  onOpenP2PRoom,
  isP2PConnected,
  onOpenAuth,
  onOpenExport,
  isKeypadOpen,
  onToggleKeypad,
  onOpenResearch,
  onOpenProofProver,
  activeMainTab = 'studio',
  onSelectMainTab,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile } = useAuth();

  return (
    <>
      {/* Mobile Action Sheet Drawer / Popover Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div
            className="relative z-10 w-full rounded-t-2xl border-t shadow-2xl p-4 flex flex-col max-h-[80dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            style={{
              backgroundColor: theme.bgSidebar,
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
          >
            {/* Drawer Handle & Header */}
            <div className="flex items-center justify-between pb-3 border-b mb-3" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5" style={{ color: theme.accent }} />
                <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: '"Cinzel", serif' }}>
                  Stoikliem Tools & Archives
                </span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ color: theme.textSecondary }}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Account / Profile Card */}
            <div
              onClick={() => {
                setIsMenuOpen(false);
                onOpenAuth();
              }}
              className="p-3 mb-3 rounded-xl border flex items-center justify-between cursor-pointer hover:opacity-95 transition-all"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border text-base" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
                  {profile?.avatarUrl || user?.photoURL ? (
                    <img
                      src={profile?.avatarUrl || user?.photoURL || ''}
                      alt={profile?.displayName || 'User'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{profile?.avatarEmoji || '📐'}</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold">
                    {user ? `@${profile?.username || user.displayName || user.email?.split('@')[0]}` : 'Sign In / Profile'}
                  </div>
                  <div className="text-2xs" style={{ color: theme.textSecondary }}>
                    {user ? (profile?.academicTitle || 'Scholar · Tap to edit dossier') : 'Sync graphs & build your profile'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </div>

            {/* Quick Coordinate Plane Switcher */}
            {onSelectGridMode && (
              <div
                className="mb-3 p-2.5 rounded-xl border flex flex-col gap-2"
                style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
              >
                <div className="flex items-center justify-between text-3xs uppercase font-bold tracking-wider" style={{ color: theme.textSecondary }}>
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-500" />
                    <span>Coordinate Plane Type</span>
                  </div>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                    {gridMode === 'complex'
                      ? 'ℂ Complex'
                      : gridMode === 'complex_vector'
                      ? '𝔉 Vector Field'
                      : gridMode === 'polar'
                      ? '◎ Polar'
                      : gridMode === 'trig'
                      ? '∿ Trig'
                      : '☩ Cartesian'}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-2xs">
                  {[
                    { id: 'cartesian', label: '☩ Cartesian' },
                    { id: 'complex', label: 'ℂ Complex' },
                    { id: 'complex_vector', label: '𝔉 Vector' },
                    { id: 'polar', label: '◎ Polar' },
                    { id: 'trig', label: '∿ Trig' },
                  ].map((p) => {
                    const isSelected = gridMode === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelectGridMode(p.id as GridMode);
                          setIsMenuOpen(false);
                        }}
                        className={`py-2 px-1 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                            : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Grid (Thumb-Friendly Android Buttons) */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Share Graph CTA */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenShareSubmission();
                }}
                className="min-h-[48px] p-3 rounded-xl flex items-center gap-2.5 font-semibold text-xs transition-transform active:scale-98 shadow-xs"
                style={{
                  backgroundColor: theme.textPrimary,
                  color: theme.bgCanvas,
                }}
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Share Submission</span>
              </button>

              {/* Submissions Archive */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onSelectMainTab) {
                    onSelectMainTab('submissions');
                  } else {
                    onOpenGallery();
                  }
                }}
                className="min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 font-medium text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                }}
              >
                <Globe className="w-4 h-4 shrink-0" style={{ color: theme.accent }} />
                <span className="truncate">Submissions Archive</span>
              </button>

              {/* Research & Theorems Annals */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onSelectMainTab) {
                    onSelectMainTab('theorems');
                  } else {
                    onOpenResearch();
                  }
                }}
                className="min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 font-medium text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                }}
              >
                <ScrollText className="w-4 h-4 shrink-0 text-indigo-500" />
                <div className="flex flex-col text-left">
                  <span className="truncate">Theorems & Annals</span>
                  <span className="text-3xs text-indigo-600 dark:text-indigo-400 font-semibold">Research</span>
                </div>
              </button>

              {/* Client Zero-API Proof Prover & Verifier */}
              {onOpenProofProver && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenProofProver();
                  }}
                  className="min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 font-medium text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    backgroundColor: theme.bgCard,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  }}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <div className="flex flex-col text-left">
                    <span className="truncate">Proof Prover</span>
                    <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-semibold">Zero-API Verifier</span>
                  </div>
                </button>
              )}

              {/* 4D HyperSpace (HyperCube & Hypersphere) */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onSelectMainTab?.('hyperspace');
                }}
                className="min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 font-medium text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                }}
              >
                <Box className="w-4 h-4 shrink-0 text-cyan-500" />
                <div className="flex flex-col text-left">
                  <span className="truncate">4D HyperSpace</span>
                  <span className="text-3xs text-cyan-600 dark:text-cyan-400 font-semibold">Tesseract & S³</span>
                </div>
              </button>

              {/* Cartography & Grid Settings */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenSettings();
                }}
                className="min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 font-medium text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                }}
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span className="truncate">Grid & Theme</span>
              </button>

              {/* Table of Values */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenTable();
                }}
                className="min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 font-medium text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                }}
              >
                <Table className="w-4 h-4 shrink-0" />
                <span className="truncate">Table of Values</span>
              </button>

              {/* P2P Live Room */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenP2PRoom();
                }}
                className="min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 font-medium text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: isP2PConnected ? '#16A34A' : theme.border,
                  color: theme.textPrimary,
                }}
              >
                <Radio className={`w-4 h-4 shrink-0 ${isP2PConnected ? 'text-emerald-500 animate-pulse' : ''}`} />
                <div className="flex flex-col text-left">
                  <span className="truncate">P2P Peer Room</span>
                  {isP2PConnected && <span className="text-3xs text-emerald-600 font-semibold">Connected</span>}
                </div>
              </button>

              {/* Export & Download */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenExport();
                }}
                className="min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 font-medium text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                }}
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="truncate">Export & Image</span>
              </button>
            </div>

            {/* Quick Virtual Keypad Bar */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onToggleKeypad();
              }}
              className="min-h-[44px] w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 opacity-70" />
                <span>Virtual Math Keypad</span>
              </div>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: theme.bgSidebar }}>
                {isKeypadOpen ? 'Active (Open)' : 'Hidden'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Fixed Bottom Navigation Bar for Non-Desktop (Android Mobile Browsers) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden flex items-stretch border-t shadow-lg select-none backdrop-blur-md"
        style={{
          backgroundColor: theme.bgSidebar,
          borderColor: theme.border,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="Mobile Bottom Navigation"
      >
        {/* Tab 1: Studio Canvas / Equations */}
        <button
          onClick={() => {
            if (activeMainTab !== 'studio' && onSelectMainTab) {
              onSelectMainTab('studio');
            } else {
              onToggleSidebar();
            }
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[52px] active:scale-95 ${
            activeMainTab === 'studio' ? 'font-bold' : ''
          }`}
          style={{
            color: activeMainTab === 'studio' ? theme.accent : theme.textSecondary,
          }}
          aria-label="Studio Canvas"
        >
          <div className="relative flex items-center justify-center">
            <span className="font-serif italic font-bold text-sm">f(x)</span>
            {expressionsCount > 0 && (
              <span
                className="absolute -top-1 -right-3 text-3xs font-mono font-bold px-1 rounded-full text-white"
                style={{ backgroundColor: theme.accent }}
              >
                {expressionsCount}
              </span>
            )}
          </div>
          <span className="text-3xs tracking-tight">Studio</span>
        </button>

        {/* Tab 2: Theorems & Vlog Annals Tab */}
        <button
          onClick={() => (onSelectMainTab ? onSelectMainTab('theorems') : onOpenResearch())}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[52px] active:scale-95 ${
            activeMainTab === 'theorems' ? 'font-bold' : ''
          }`}
          style={{
            color: activeMainTab === 'theorems' ? '#6366F1' : theme.textSecondary,
          }}
          aria-label="Theorems & Vlog Publications"
        >
          <ScrollText className="w-4 h-4 text-indigo-500" />
          <span className="text-3xs tracking-tight">Theorems</span>
        </button>

        {/* Tab 3: Community Submissions Tab */}
        <button
          onClick={() => (onSelectMainTab ? onSelectMainTab('submissions') : onOpenGallery())}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[52px] active:scale-95 ${
            activeMainTab === 'submissions' ? 'font-bold' : ''
          }`}
          style={{
            color: activeMainTab === 'submissions' ? '#F59E0B' : theme.textSecondary,
          }}
          aria-label="Submissions Archive"
        >
          <Globe className="w-4 h-4 text-amber-500" />
          <span className="text-3xs tracking-tight">Submissions</span>
        </button>

        {/* Tab 4: Symbolic CAS & Calculus Studio Drawer */}
        <button
          onClick={onToggleAnalysis}
          className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[52px] active:scale-95"
          style={{
            color: isAnalysisOpen ? theme.accent : theme.textSecondary,
          }}
          aria-label="Symbolic CAS & Calculus Studio"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-3xs tracking-tight">CAS/Calc</span>
        </button>

        {/* Tab 5: Mobile Actions Menu (Presets, Theory, Cartography, P2P) */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[52px] active:scale-95"
          style={{ color: isMenuOpen ? theme.accent : theme.textSecondary }}
          aria-label="More Features"
        >
          <Menu className="w-4 h-4" />
          <span className="text-3xs tracking-tight">More</span>
        </button>
      </nav>
    </>
  );
};
