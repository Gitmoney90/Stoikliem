import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ScrollText,
  Sparkles,
  Search,
  Plus,
  BookOpen,
  ThumbsUp,
  Share2,
  Copy,
  Check,
  TrendingUp,
  Layers,
  Tag,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { ThemeConfig, GraphExpression } from '../types/graph';
import { useAuth } from '../context/AuthContext';
import { MathView } from './MathView';
import {
  ResearchPost,
  TheoremCategory,
  fetchResearchPosts,
  createResearchPost,
  endorseResearchPost,
  deleteResearchPost,
} from '../lib/researchService';

interface ResearchAnnalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  currentExpressions: GraphExpression[];
  onPlotAttachedExpressions: (exprs: GraphExpression[], title: string) => void;
  onShowToast: (msg: string) => void;
}

export const ResearchAnnalsModal: React.FC<ResearchAnnalsModalProps> = ({
  isOpen,
  onClose,
  theme,
  currentExpressions,
  onPlotAttachedExpressions,
  onShowToast,
}) => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<ResearchPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<TheoremCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [endorsedIds, setEndorsedIds] = useState<Set<string>>(new Set());

  // New Post Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TheoremCategory>('theorem');
  const [newLatex, setNewLatex] = useState('\\forall x > 0, \\; \\ln(x) \\le x - 1');
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState('calculus, analysis, inequalities');
  const [attachCurrentGraph, setAttachCurrentGraph] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadPosts();
  }, [isOpen]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchResearchPosts();
      setPosts(data);
    } catch {
      // Handled gracefully in service
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndorse = async (post: ResearchPost) => {
    if (endorsedIds.has(post.id)) return;
    setEndorsedIds((prev) => new Set([...prev, post.id]));
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, endorsementsCount: p.endorsementsCount + 1 } : p))
    );
    await endorseResearchPost(post.id);
    onShowToast(`Endorsed theorem: "${post.title}"`);
  };

  const handleCopyLatex = (latex: string, id: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedId(id);
    onShowToast('LaTeX formula copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePlot = (post: ResearchPost) => {
    if (post.attachedExpressions && post.attachedExpressions.length > 0) {
      onPlotAttachedExpressions(post.attachedExpressions, post.title);
      onShowToast(`Plotted locus for: "${post.title}"`);
      onClose();
    } else {
      onShowToast('No graph loci attached to this theorem dispatch');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to retract this research dispatch?')) return;
    try {
      await deleteResearchPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      onShowToast('Research dispatch retracted');
    } catch {
      onShowToast('Failed to retract post');
    }
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('Please provide a research post title');
      return;
    }
    if (!newLatex.trim()) {
      setFormError('Please provide a LaTeX mathematical statement');
      return;
    }
    if (!newBody.trim()) {
      setFormError('Please enter exposition, rationale, or proof details');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const validExpressions = attachCurrentGraph
      ? currentExpressions.filter((expr) => expr.rawText.trim().length > 0)
      : [];

    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    try {
      const created = await createResearchPost({
        title: newTitle.trim(),
        category: newCategory,
        authorId: user?.uid || 'guest_scholar',
        authorName: profile?.displayName || user?.displayName || 'Scholar of Principia',
        authorTitle: profile?.academicTitle || 'Independent Scholar',
        authorAvatarEmoji: profile?.avatarEmoji || '📜',
        latexStatement: newLatex.trim(),
        body: newBody.trim(),
        attachedExpressions: validExpressions,
        tags: tagsArray,
      });

      setPosts((prev) => [created, ...prev]);
      setIsPublishing(false);
      setNewTitle('');
      setNewBody('');
      onShowToast('Theorem published to Principia Research Annals!');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to publish research post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = p.title.toLowerCase().includes(q);
      const inBody = p.body.toLowerCase().includes(q);
      const inAuthor = p.authorName.toLowerCase().includes(q);
      const inLatex = p.latexStatement.toLowerCase().includes(q);
      const inTags = p.tags.some((t) => t.toLowerCase().includes(q));
      return inTitle || inBody || inAuthor || inLatex || inTags;
    });
  }, [posts, activeCategory, searchQuery]);

  if (!isOpen) return null;

  const categoryStyles: Record<TheoremCategory, { label: string; badgeBg: string; textCol: string }> = {
    vlog_discovery: { label: '🎬 Vlog Discovery', badgeBg: 'bg-indigo-500/15 border-indigo-500/30', textCol: 'text-indigo-700 dark:text-indigo-400' },
    theorem: { label: 'Theorem', badgeBg: 'bg-amber-500/15 border-amber-500/30', textCol: 'text-amber-700 dark:text-amber-400' },
    conjecture: { label: 'Conjecture', badgeBg: 'bg-cyan-500/15 border-cyan-500/30', textCol: 'text-cyan-700 dark:text-cyan-400' },
    lemma: { label: 'Lemma', badgeBg: 'bg-emerald-500/15 border-emerald-500/30', textCol: 'text-emerald-700 dark:text-emerald-400' },
    proof: { label: 'Demonstratio', badgeBg: 'bg-purple-500/15 border-purple-500/30', textCol: 'text-purple-700 dark:text-purple-400' },
    note: { label: 'Research Note', badgeBg: 'bg-rose-500/15 border-rose-500/30', textCol: 'text-rose-700 dark:text-rose-400' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92dvh] sm:max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          color: theme.textPrimary,
        }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-3.5 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: `${theme.accent}15`,
                borderColor: `${theme.accent}30`,
                color: theme.accent,
              }}
            >
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-sm sm:text-base font-bold tracking-tight"
                style={{
                  fontFamily: '"Cinzel", "Source Serif 4", serif',
                  color: theme.textPrimary,
                }}
              >
                Principia Research Annals & Theorems
              </h2>
              <p className="text-3xs sm:text-2xs" style={{ color: theme.textSecondary }}>
                Disputationes Mathematicae, Peer Conjectures & Verified Loci
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPublishing(!isPublishing)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
              style={{
                backgroundColor: isPublishing ? theme.textPrimary : theme.accent,
                color: isPublishing ? theme.bgCanvas : '#FFFFFF',
              }}
            >
              {isPublishing ? (
                <>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Browse Annals</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Theorem</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: theme.textSecondary }}
              aria-label="Close Annals"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ========================================================= */}
          {/* PUBLISH NEW THEOREM DRAWER / FORM                         */}
          {/* ========================================================= */}
          {isPublishing ? (
            <form onSubmit={handlePublishSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: theme.textPrimary }}>
                      Submit Mathematical Theorem or Conjecture
                    </span>
                  </div>
                  <span className="text-3xs font-mono" style={{ color: theme.textSecondary }}>
                    Author: @{profile?.username || user?.displayName || 'Scholar'}
                  </span>
                </div>

                {formError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title & Classification */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-3xs uppercase tracking-wider font-semibold opacity-75">
                      Theorem / Paper Title
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Asymptotic Bounds on Chebyshev Polynomial Extrema"
                      className="w-full px-3 py-2 rounded-lg border text-xs"
                      style={{
                        backgroundColor: theme.bgCard,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-3xs uppercase tracking-wider font-semibold opacity-75">
                      Classification
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as TheoremCategory)}
                      className="w-full px-3 py-2 rounded-lg border text-xs"
                      style={{
                        backgroundColor: theme.bgCard,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      }}
                    >
                      <option value="theorem">Theorem (Verified)</option>
                      <option value="conjecture">Conjecture (Open)</option>
                      <option value="lemma">Lemma / Corollary</option>
                      <option value="proof">Demonstratio / Proof</option>
                      <option value="note">Research Note</option>
                    </select>
                  </div>
                </div>

                {/* LaTeX Statement */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-3xs uppercase tracking-wider font-semibold opacity-75">
                      LaTeX Mathematical Formula / Statement
                    </label>
                    <span className="text-3xs font-mono opacity-50">KaTeX Math Syntax</span>
                  </div>
                  <input
                    type="text"
                    value={newLatex}
                    onChange={(e) => setNewLatex(e.target.value)}
                    placeholder="e.g. \int_{-\infty}^\infty e^{-x^2} dx = \sqrt{\pi}"
                    className="w-full px-3 py-2 rounded-lg border font-mono text-xs"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: theme.border,
                      color: theme.textPrimary,
                    }}
                  />
                </div>

                {/* Live Formula Preview */}
                {newLatex.trim() && (
                  <div
                    className="p-3 rounded-lg border text-center overflow-x-auto min-h-[50px] flex items-center justify-center"
                    style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                  >
                    <MathView math={newLatex} displayMode={true} />
                  </div>
                )}

                {/* Body / Proof Text */}
                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider font-semibold opacity-75">
                    Exposition, Proof Sketch & Context
                  </label>
                  <textarea
                    rows={4}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Explain the mathematical reasoning, proof steps, or physical significance of this locus..."
                    className="w-full px-3 py-2 rounded-lg border text-xs resize-y"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: theme.border,
                      color: theme.textPrimary,
                    }}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider font-semibold opacity-75">
                    Disciplinary Tags (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="calculus, topology, differential-geometry"
                    className="w-full px-3 py-2 rounded-lg border text-xs"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: theme.border,
                      color: theme.textPrimary,
                    }}
                  />
                </div>

                {/* Attach Current Curves from Active Canvas */}
                <div
                  className="p-3 rounded-lg border flex items-center justify-between"
                  style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: theme.accent }} />
                    <div>
                      <div className="text-xs font-semibold">Attach Active Canvas Curves</div>
                      <div className="text-3xs opacity-75">
                        {currentExpressions.length} curve{currentExpressions.length !== 1 ? 's' : ''} currently loaded in workspace
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={attachCurrentGraph}
                    onChange={(e) => setAttachCurrentGraph(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: theme.border }}>
                  <button
                    type="button"
                    onClick={() => setIsPublishing(false)}
                    className="px-4 py-2 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ borderColor: theme.border }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                    style={{ backgroundColor: theme.accent, color: '#FFFFFF' }}
                  >
                    {isSubmitting ? (
                      <span>Publishing...</span>
                    ) : (
                      <>
                        <ScrollText className="w-3.5 h-3.5" />
                        <span>Publish to Annals</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {(['all', 'theorem', 'conjecture', 'lemma', 'proof', 'note'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-2xs font-semibold capitalize whitespace-nowrap transition-all active:scale-95 ${
                        activeCategory === cat ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: activeCategory === cat ? theme.accent : 'transparent',
                        color: activeCategory === cat ? '#FFFFFF' : theme.textPrimary,
                      }}
                    >
                      {cat === 'all' ? 'All Dispatches' : cat}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[200px] sm:min-w-[260px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search theorems, author, LaTeX..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs"
                    style={{
                      backgroundColor: theme.bgSidebar,
                      borderColor: theme.border,
                      color: theme.textPrimary,
                    }}
                  />
                </div>
              </div>

              {/* Research Posts Grid / List */}
              {isLoading ? (
                <div className="py-16 text-center text-xs flex flex-col items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
                  <ScrollText className="w-8 h-8 animate-pulse opacity-40" />
                  <span>Loading Disputationes Mathematicae...</span>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="py-16 text-center text-xs flex flex-col items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
                  <BookOpen className="w-8 h-8 opacity-30" />
                  <span>No research dispatches found matching criteria.</span>
                  <button
                    onClick={() => setIsPublishing(true)}
                    className="text-amber-700 dark:text-amber-400 font-semibold underline mt-1"
                  >
                    Post the first theorem in this category
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => {
                    const styling = categoryStyles[post.category] || categoryStyles.theorem;
                    const isAuthor = user?.uid === post.authorId;
                    const isEndorsed = endorsedIds.has(post.id);

                    return (
                      <article
                        key={post.id}
                        className="p-4 sm:p-5 rounded-2xl border space-y-3 transition-all hover:shadow-md"
                        style={{
                          backgroundColor: theme.bgCard,
                          borderColor: theme.border,
                        }}
                      >
                        {/* Top Metadata Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-3xs font-bold uppercase tracking-wider border ${styling.badgeBg} ${styling.textCol}`}>
                              {styling.label}
                            </span>
                            <h3 className="text-sm font-bold tracking-tight" style={{ color: theme.textPrimary }}>
                              {post.title}
                            </h3>
                          </div>

                          {isAuthor && !post.id.startsWith('seed_') && (
                            <button
                              onClick={() => handleDelete(post.id)}
                              title="Retract research post"
                              className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Author Card & Attribution */}
                        <div className="flex items-center gap-2.5 text-2xs" style={{ color: theme.textSecondary }}>
                          <span className="text-base">{post.authorAvatarEmoji || '📐'}</span>
                          <span className="font-semibold" style={{ color: theme.textPrimary }}>
                            {post.authorName}
                          </span>
                          {post.authorTitle && (
                            <>
                              <span className="opacity-40">•</span>
                              <span className="italic">{post.authorTitle}</span>
                            </>
                          )}
                        </div>

                        {/* Formula Display Box with KaTeX */}
                        <div
                          className="p-3.5 sm:p-4 rounded-xl border text-center overflow-x-auto my-2"
                          style={{
                            backgroundColor: theme.bgSidebar,
                            borderColor: theme.border,
                          }}
                        >
                          <MathView math={post.latexStatement} displayMode={true} />
                        </div>

                        {/* Abstract / Body */}
                        <p className="text-xs leading-relaxed opacity-90" style={{ color: theme.textPrimary }}>
                          {post.body}
                        </p>

                        {/* Tags Row */}
                        {post.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded text-3xs font-mono font-medium opacity-75"
                                style={{ backgroundColor: theme.bgSidebar }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action Toolbar */}
                        <div
                          className="pt-3 border-t flex flex-wrap items-center justify-between gap-2"
                          style={{ borderColor: theme.border }}
                        >
                          <div className="flex items-center gap-2">
                            {/* Plot in Canvas */}
                            {post.attachedExpressions && post.attachedExpressions.length > 0 && (
                              <button
                                onClick={() => handlePlot(post)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-95 transition-all"
                                style={{
                                  borderColor: theme.accent,
                                  backgroundColor: `${theme.accent}12`,
                                  color: theme.accent,
                                }}
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>Plot Theorem Locus ({post.attachedExpressions.length})</span>
                              </button>
                            )}

                            {/* Copy LaTeX */}
                            <button
                              onClick={() => handleCopyLatex(post.latexStatement, post.id)}
                              className="px-2.5 py-1.5 rounded-lg border text-2xs font-medium flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              style={{ borderColor: theme.border, color: theme.textSecondary }}
                            >
                              {copiedId === post.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy LaTeX</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Endorsements / Peer Citations */}
                          <button
                            onClick={() => handleEndorse(post)}
                            disabled={isEndorsed}
                            className={`px-3 py-1.5 rounded-lg border text-2xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                              isEndorsed ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400' : 'hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                            style={{
                              borderColor: isEndorsed ? undefined : theme.border,
                              color: isEndorsed ? undefined : theme.textPrimary,
                            }}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>{post.endorsementsCount} Endorsement{post.endorsementsCount !== 1 ? 's' : ''}</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
