import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeConfig } from '../types/graph';
import { X, Lock, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  theme,
  onSuccess,
}) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5" style={{ color: theme.accent }} />
            <h2
              className="text-base font-bold tracking-tight"
              style={{
                fontFamily: '"Cinzel", "Source Serif 4", serif',
                color: theme.textPrimary,
              }}
            >
              {user ? 'Scholar Account' : 'Sign In to Principia'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs font-sans">
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-black/5 dark:bg-white/5" style={{ borderColor: theme.border }}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-10 h-10 rounded-full border border-black/10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-700 font-bold flex items-center justify-center text-sm">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="font-semibold text-sm truncate" style={{ color: theme.textPrimary }}>
                    {user.displayName || 'Mathematical Explorer'}
                  </div>
                  <div className="text-2xs truncate" style={{ color: theme.textSecondary }}>
                    {user.email}
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
                You are currently signed in. Your published mathematical submissions are safely stored in your cloud archive and shareable worldwide.
              </p>

              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 transition-colors"
                style={{ borderColor: theme.border }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
                Sign in to save unique mathematical submissions, generate permanent share codes, and contribute to the community gallery.
              </p>

              <div className="space-y-2 py-1">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span style={{ color: theme.textPrimary }}>
                    Generate permanent unique URLs for your custom curves & loci
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span style={{ color: theme.textPrimary }}>
                    Save and manage personal treatises across all devices
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span style={{ color: theme.textPrimary }}>
                    Publish to the community gallery of mathematical explorations
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-mono">
                  {error}
                </div>
              )}

              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 font-semibold shadow-xs hover:opacity-90 transition-all active:scale-98"
                style={{
                  backgroundColor: theme.textPrimary,
                  color: theme.bgCanvas,
                }}
              >
                {/* Google "G" Logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Signing in...' : 'Sign In with Google'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
