import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeConfig, GraphExpression, Viewport, GridMode, ThemeId } from '../types/graph';
import {
  fetchPublicGraphs,
  fetchUserGraphs,
  deleteGraph,
  GraphDocument,
} from '../lib/graphService';
import {
  Globe,
  User as UserIcon,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ArrowRight,
  Search,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Layers,
  Share2,
} from 'lucide-react';

interface SubmissionArchiveTabProps {
  theme: ThemeConfig;
  optimisticSubmissions?: GraphDocument[];
  onBackToStudio: () => void;
  onOpenShareSubmission: () => void;
  onLoadGraphSubmission: (data: {
    title: string;
    expressions: GraphExpression[];
    viewport: Viewport;
    gridMode: GridMode;
    themeId: ThemeId;
  }) => void;
  onShowToast: (msg: string) => void;
}

export const SubmissionArchiveTab: React.FC<SubmissionArchiveTabProps> = ({
  theme,
  optimisticSubmissions = [],
  onBackToStudio,
  onOpenShareSubmission,
  onLoadGraphSubmission,
  onShowToast,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'public' | 'user'>('public');
  const [publicGraphs, setPublicGraphs] = useState<GraphDocument[]>([]);
  const [userGraphs, setUserGraphs] = useState<GraphDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pub = await fetchPublicGraphs(50);
      const mergedPublic = [...pub];
      optimisticSubmissions.forEach((opt) => {
        if (opt.isPublic && !mergedPublic.some((g) => g.id === opt.id || g.shareCode === opt.shareCode)) {
          mergedPublic.unshift(opt);
        }
      });
      setPublicGraphs(mergedPublic);

      if (user) {
        const usr = await fetchUserGraphs(user.uid);
        const mergedUser = [...usr];
        optimisticSubmissions.forEach((opt) => {
          if (
            opt.authorId === user.uid &&
            !mergedUser.some((g) => g.id === opt.id || g.shareCode === opt.shareCode)
          ) {
            mergedUser.unshift(opt);
          }
        });
        setUserGraphs(mergedUser);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load community submissions.');
    } finally {
      setLoading(false);
    }
  }, [user, optimisticSubmissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyCode = (code: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    onShowToast(`Copied share code: ${code}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this shared graph?')) return;
    try {
      await deleteGraph(id);
      setUserGraphs((prev) => prev.filter((g) => g.id !== id));
      setPublicGraphs((prev) => prev.filter((g) => g.id !== id));
      onShowToast('Graph submission deleted');
    } catch (err: any) {
      onShowToast('Failed to delete graph');
    }
  };

  const handleSelectGraph = (g: GraphDocument) => {
    try {
      const exprs: GraphExpression[] = JSON.parse(g.expressionsJson);
      const vp: Viewport = JSON.parse(g.viewportJson);
      onLoadGraphSubmission({
        title: g.title,
        expressions: exprs,
        viewport: vp,
        gridMode: g.gridMode as GridMode,
        themeId: g.themeId as ThemeId,
      });
      onShowToast(`Loaded submission: "${g.title}"`);
      onBackToStudio();
    } catch {
      onShowToast('Failed to parse graph expressions');
    }
  };

  const displayedList = activeTab === 'public' ? publicGraphs : userGraphs;
  const filteredList = displayedList.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.title.toLowerCase().includes(q) ||
      (g.authorName && g.authorName.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q)) ||
      g.shareCode.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="flex-1 w-full h-full flex flex-col overflow-hidden select-none"
      style={{
        backgroundColor: theme.bgCanvas,
        color: theme.textPrimary,
      }}
    >
      {/* Top Header Bar */}
      <header
        className="px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 shrink-0 z-20"
        style={{
          backgroundColor: theme.bgSidebar,
          borderColor: theme.border,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 shrink-0"
            style={{
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Graph Studio</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-5 h-5 text-amber-500 shrink-0" />
            <h1
              className="text-base sm:text-lg font-bold tracking-tight truncate"
              style={{ fontFamily: '"Cinzel", "Source Serif 4", serif' }}
            >
              Public Submissions Archive
            </h1>
          </div>
        </div>

        <button
          onClick={onOpenShareSubmission}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-transform active:scale-95"
          style={{
            backgroundColor: theme.accent,
            color: '#FFFFFF',
          }}
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Submit Current Graph</span>
          <span className="sm:hidden">Submit</span>
        </button>
      </header>

      {/* Tabs and Search Bar */}
      <div
        className="px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('public')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'public'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Community Gallery ({publicGraphs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('user')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'user'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>My Submissions ({userGraphs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:max-w-xs min-w-[200px]">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search submissions or share code..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs bg-transparent outline-none focus:ring-1"
              style={{
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            />
          </div>

          <button
            onClick={loadData}
            title="Refresh Archive"
            className="p-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
            style={{ borderColor: theme.border }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Sparkles className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs font-mono">Loading Submissions Archive...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-20 text-center text-xs space-y-3 opacity-60">
              <Globe className="w-8 h-8 mx-auto opacity-30" />
              <p>No mathematical submissions found.</p>
              {activeTab === 'user' && !user && (
                <p className="text-2xs">Please sign in to view your personal submissions.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map((g) => {
                let exprCount = 0;
                try {
                  exprCount = JSON.parse(g.expressionsJson).length;
                } catch {}

                return (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGraph(g)}
                    className="p-4 sm:p-5 rounded-xl border flex flex-col justify-between gap-4 cursor-pointer hover:shadow-md transition-all group"
                    style={{
                      backgroundColor: theme.bgCard,
                      borderColor: theme.border,
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-3xs font-mono uppercase tracking-wider font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                          {g.gridMode || 'Cartesian'}
                        </span>
                        <div className="flex items-center gap-1.5 text-3xs font-mono opacity-65">
                          <span>{exprCount} {exprCount === 1 ? 'curve' : 'curves'}</span>
                        </div>
                      </div>

                      <h3
                        className="font-bold text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate"
                        style={{ fontFamily: '"Source Serif 4", serif' }}
                      >
                        {g.title}
                      </h3>

                      {g.description && (
                        <p className="text-2xs opacity-75 line-clamp-2 leading-relaxed">
                          {g.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1 text-2xs opacity-70">
                        <UserIcon className="w-3 h-3 text-amber-500" />
                        <span className="truncate">By {g.authorName}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between gap-2 text-2xs" style={{ borderColor: theme.border }}>
                      <button
                        onClick={(e) => handleCopyCode(g.shareCode, g.id, e)}
                        className="px-2 py-1 rounded-md border font-mono text-3xs flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                        style={{ borderColor: theme.border }}
                        title="Copy Share Code"
                      >
                        {copiedId === g.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{g.shareCode}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {user && user.uid === g.authorId && (
                          <button
                            onClick={(e) => handleDelete(g.id, e)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Delete Submission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 text-3xs">
                          <span>Plot Locus</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
