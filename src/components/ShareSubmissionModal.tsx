import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeConfig, GraphExpression, Viewport, GridMode, ThemeId } from '../types/graph';
import { submitGraph, GraphDocument } from '../lib/graphService';
import { X, Share2, Copy, Check, Globe, Lock, Sparkles, ExternalLink } from 'lucide-react';

interface ShareSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  expressions: GraphExpression[];
  viewport: Viewport;
  gridMode: GridMode;
  themeId: ThemeId;
  onOpenAuth: () => void;
  onSubmissionSuccess?: (newGraph: GraphDocument) => void;
}

export const ShareSubmissionModal: React.FC<ShareSubmissionModalProps> = ({
  isOpen,
  onClose,
  theme,
  expressions,
  viewport,
  gridMode,
  themeId,
  onOpenAuth,
  onSubmissionSuccess,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedGraph, setSubmittedGraph] = useState<GraphDocument | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Derive default title from first expression
  const defaultTitle =
    title.trim() ||
    (expressions.find((e) => e.visible)?.rawText
      ? `Graph: ${expressions.find((e) => e.visible)?.rawText}`
      : 'Mathematical Figure');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Prepare optimistic post document so it appears on screen instantly without waiting for network round-trip
    const tempId = `temp_${Date.now()}`;
    const generatedShareCode = `pg_${Math.random().toString(36).substring(2, 9)}`;
    const minimalExpressions = expressions.map((exp) => ({
      rawText: exp.rawText,
      color: exp.color,
      visible: exp.visible,
      type: exp.type,
      sliderValue: exp.sliderValue,
      sliderMin: exp.sliderMin,
      sliderMax: exp.sliderMax,
      sliderStep: exp.sliderStep,
      tMin: exp.tMin,
      tMax: exp.tMax,
      thetaMin: exp.thetaMin,
      thetaMax: exp.thetaMax,
      showDerivative: exp.showDerivative,
      showIntegral: exp.showIntegral,
      integralA: exp.integralA,
      integralB: exp.integralB,
    }));
    const minimalViewport = {
      xMin: viewport.xMin,
      xMax: viewport.xMax,
      yMin: viewport.yMin,
      yMax: viewport.yMax,
    };

    const optimisticDoc: GraphDocument = {
      id: tempId,
      title: defaultTitle,
      description: description.trim(),
      authorId: user.uid,
      authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous Scholar',
      shareCode: generatedShareCode,
      isPublic,
      expressionsJson: JSON.stringify(minimalExpressions),
      viewportJson: JSON.stringify(minimalViewport),
      gridMode,
      themeId,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    };

    // OPTIMISTIC UI: Immediately display the submitted post on screen without freezing or waiting for network round-trip
    setSubmittedGraph(optimisticDoc);
    if (onSubmissionSuccess) {
      onSubmissionSuccess(optimisticDoc);
    }

    try {
      const realDoc = await submitGraph({
        title: defaultTitle,
        description,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous Scholar',
        isPublic,
        expressions,
        viewport,
        gridMode,
        themeId,
      });

      // Synchronize with the persisted document from Firestore
      setSubmittedGraph(realDoc);
      if (onSubmissionSuccess) {
        onSubmissionSuccess(realDoc);
      }
    } catch (err: any) {
      const errorMsg =
        err?.message || (typeof err === 'string' ? err : 'Unknown submission error');
      console.error('Community submission error:', errorMsg);
      setError(errorMsg);
      // Revert optimistic state on failure so state remains consistent
      setSubmittedGraph(null);
      // If an error occurs, show an alert with the exact error message instead of freezing
      window.alert(`Submission Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShareUrl = (shareCode: string) => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?graph=${shareCode}`;
  };

  const handleCopyLink = () => {
    if (!submittedGraph) return;
    const url = getShareUrl(submittedGraph.shareCode);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
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
            <Share2 className="w-5 h-5" style={{ color: theme.accent }} />
            <h2
              className="text-base font-bold tracking-tight"
              style={{
                fontFamily: '"Cinzel", "Source Serif 4", serif',
                color: theme.textPrimary,
              }}
            >
              Share Graph Submission
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
          {!user ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-amber-600/10 text-amber-700">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: theme.textPrimary }}>
                  Sign in required to submit graphs
                </h3>
                <p className="text-xs max-w-sm mx-auto" style={{ color: theme.textSecondary }}>
                  To generate permanent unique links and manage your mathematical loci in the cloud, please sign in with your account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-5 py-2.5 rounded-xl font-semibold shadow-xs hover:opacity-90 transition-all"
                style={{
                  backgroundColor: theme.textPrimary,
                  color: theme.bgCanvas,
                }}
              >
                Sign In with Google
              </button>
            </div>
          ) : submittedGraph ? (
            /* Submission Success & Direct Link */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border space-y-3 bg-emerald-500/5 border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Unique Graph Submission Published!</span>
                </div>
                <h3 className="font-bold text-base" style={{ color: theme.textPrimary }}>
                  {submittedGraph.title}
                </h3>
                {submittedGraph.description && (
                  <p className="text-2xs" style={{ color: theme.textSecondary }}>
                    {submittedGraph.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-2xs font-mono" style={{ color: theme.textMuted }}>
                  <span>Unique Share Code:</span>
                  <strong className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-amber-600">
                    {submittedGraph.shareCode}
                  </strong>
                </div>
              </div>

              {/* Unique URL input & copy */}
              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
                  Permanent Shareable URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl(submittedGraph.shareCode)}
                    className="flex-1 px-3 py-2 rounded-lg border font-mono text-2xs select-all truncate"
                    style={{
                      backgroundColor: theme.bgSidebar,
                      borderColor: theme.border,
                      color: theme.textPrimary,
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                    style={{
                      backgroundColor: theme.textPrimary,
                      color: theme.bgCanvas,
                    }}
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t" style={{ borderColor: theme.border }}>
                <a
                  href={getShareUrl(submittedGraph.shareCode)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-2xs hover:underline"
                  style={{ color: theme.accent }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Link in New Tab</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSubmittedGraph(null)}
                  className="text-2xs text-stone-500 hover:underline"
                >
                  Submit Another Graph
                </button>
              </div>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
                  Graph Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={defaultTitle}
                  className="w-full px-3 py-2 rounded-lg border text-xs"
                  style={{
                    backgroundColor: theme.bgSidebar,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  }}
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
                  Mathematical Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Implicit folium with parameter slider a = 2. Notice the nodal loop and oblique asymptote."
                  className="w-full px-3 py-2 rounded-lg border text-xs resize-none"
                  style={{
                    backgroundColor: theme.bgSidebar,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  }}
                />
              </div>

              <div className="p-3 rounded-xl border flex items-center justify-between" style={{ borderColor: theme.border }}>
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: theme.textPrimary }}>
                    <Globe className="w-3.5 h-3.5 text-sky-600" />
                    <span>Public in Academic Gallery</span>
                  </div>
                  <p className="text-2xs" style={{ color: theme.textMuted }}>
                    Allows other mathematicians to discover your locus in the community gallery
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="accent-amber-600 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Equations to be submitted preview */}
              <div className="p-3 rounded-xl border space-y-1.5" style={{ borderColor: theme.border }}>
                <span className="block text-2xs font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                  Curves Included ({expressions.filter((e) => e.visible).length})
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-2xs">
                  {expressions
                    .filter((e) => e.visible)
                    .map((e, idx) => (
                      <div key={idx} className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                        <span className="truncate" style={{ color: theme.textPrimary }}>{e.rawText}</span>
                      </div>
                    ))}
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-mono">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl font-semibold shadow-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                style={{
                  backgroundColor: theme.textPrimary,
                  color: theme.bgCanvas,
                }}
              >
                <Share2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing to Cloud...' : 'Publish Unique Graph Submission'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
