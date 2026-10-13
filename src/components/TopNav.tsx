import React from 'react';
import { ThemeConfig } from '../types/graph';
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
} from 'lucide-react';

interface TopNavProps {
  theme: ThemeConfig;
  onOpenPresets: () => void;
  onToggleAnalysis: () => void;
  isAnalysisOpen: boolean;
  onOpenTable: () => void;
  onOpenSettings: () => void;
  onOpenShareSubmission: () => void;
  onOpenGallery: () => void;
  onOpenAuth: () => void;
  onOpenP2PRoom: () => void;
  isP2PConnected: boolean;
  onOpenGraphTheory: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  theme,
  onOpenPresets,
  onToggleAnalysis,
  isAnalysisOpen,
  onOpenTable,
  onOpenSettings,
  onOpenShareSubmission,
  onOpenGallery,
  onOpenAuth,
  onOpenP2PRoom,
  isP2PConnected,
  onOpenGraphTheory,
}) => {
  const { user, profile } = useAuth();

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
          href="./"
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
          onClick={onOpenGraphTheory}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1"
          style={{ color: theme.textSecondary }}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Graph Theory</span>
        </button>

        {/* P2P Room Link with Live Status */}
        <button
          onClick={onOpenP2PRoom}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1"
          style={{ color: isP2PConnected ? '#16A34A' : theme.textSecondary }}
        >
          <Radio className={`w-3.5 h-3.5 ${isP2PConnected ? 'animate-pulse text-emerald-600' : ''}`} />
          <span>P2P Room</span>
          {isP2PConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block ml-0.5" />
          )}
        </button>

        <button
          onClick={onOpenGallery}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:underline py-1"
          style={{ color: theme.textSecondary }}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Submissions Archive</span>
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

      {/* Zone 3: 1 Primary Action (Share Submission) + Account Affordance */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Graph Theory Quick Button on Mobile */}
        <button
          onClick={onOpenGraphTheory}
          className="md:hidden p-2 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
          style={{ borderColor: theme.border, color: theme.textPrimary }}
          title="Graph Theory Explorer"
        >
          <Network className="w-4 h-4" />
        </button>

        {/* P2P Quick Button on Mobile */}
        <button
          onClick={onOpenP2PRoom}
          className="md:hidden p-2 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
          style={{ borderColor: theme.border, color: isP2PConnected ? '#16A34A' : theme.textPrimary }}
          title="P2P Room"
        >
          <Radio className="w-4 h-4" />
        </button>

        {/* User Account / Profile Dossier */}
        <button
          onClick={onOpenAuth}
          title={
            user
              ? `Profile: @${profile?.username || user.displayName || user.email} (${profile?.academicTitle || 'Scholar'})`
              : 'Sign In'
          }
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
          style={{
            borderColor: theme.border,
            color: theme.textPrimary,
          }}
        >
          {user ? (
            <>
              {profile?.avatarUrl || user.photoURL ? (
                <img
                  src={profile?.avatarUrl || user.photoURL || ''}
                  alt={profile?.displayName || user.displayName || 'User'}
                  className="w-4 h-4 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs leading-none">
                  {profile?.avatarEmoji || '📐'}
                </span>
              )}
              <span className="hidden sm:inline font-mono truncate max-w-[120px] font-semibold">
                @{profile?.username || user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </>
          )}
        </button>

        {/* Primary CTA: Share Submission */}
        <button
          onClick={onOpenShareSubmission}
          className="px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: theme.textPrimary,
            color: theme.bgCanvas,
          }}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share Submission</span>
        </button>
      </div>
    </header>
  );
};
