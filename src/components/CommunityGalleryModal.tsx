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
  X,
  Globe,
  User as UserIcon,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ArrowRight,
  Search,
  Sparkles,
} from 'lucide-react';

interface CommunityGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onLoadGraphSubmission: (data: {
    title: string;
    expressions: GraphExpression[];
    viewport: Viewport;
    gridMode: GridMode;
    themeId: ThemeId;
  }) => void;
}

export const CommunityGalleryModal: React.FC<CommunityGalleryModalProps> = ({
  isOpen,
  onClose,
  theme,
  onLoadGraphSubmission,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'public' | 'user'>('public');
  const [publicGraphs, setPublicGraphs] = useState<GraphDocument[]>([]);
  const [userGraphs, setUserGraphs] = useState<GraphDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const pub = await fetchPublicGraphs(30);
        setPublicGraphs(pub);

        if (user) {
          const usr = await fetchUserGraphs(user.uid);
          setUserGraphs(usr);
        }
      } catch (err) {
        console.error('Error loading gallery graphs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentList = activeTab === 'public' ? publicGraphs : userGraphs;
  const filteredList = currentList.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.shareCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyLink = (shareCode: string, id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?graph=${shareCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (graphId: string) => {
    if (!window.confirm('Are you sure you wish to delete this graph submission?')) return;
    try {
      await deleteGraph(graphId);
      setUserGraphs((prev) => prev.filter((g) => g.id !== graphId));
      setPublicGraphs((prev) => prev.filter((g) => g.id !== graphId));
    } catch (err) {
      console.error('Failed to delete graph:', err);
    }
  };

  const handleOpenGraph = (graph: GraphDocument) => {
    try {
      const rawExprs = JSON.parse(graph.expressionsJson);
      const rawVp = JSON.parse(graph.viewportJson);

      const parsedExprs: GraphExpression[] = rawExprs.map((e: any, idx: number) => ({
        id: `shared_${idx}_${Date.now()}`,
        rawText: e.rawText,
        color: e.color || theme.curvePalette[idx % theme.curvePalette.length],
        visible: e.visible !== false,
        type: e.type || 'explicit',
        sliderValue: e.sliderValue,
        sliderMin: e.sliderMin,
        sliderMax: e.sliderMax,
        sliderStep: e.sliderStep,
        tMin: e.tMin,
        tMax: e.tMax,
        thetaMin: e.thetaMin,
        thetaMax: e.thetaMax,
        showDerivative: e.showDerivative,
        showIntegral: e.showIntegral,
        integralA: e.integralA,
        integralB: e.integralB,
      }));

      onLoadGraphSubmission({
        title: graph.title,
        expressions: parsedExprs,
        viewport: {
          xMin: rawVp.xMin ?? -10,
          xMax: rawVp.xMax ?? 10,
          yMin: rawVp.yMin ?? -7,
          yMax: rawVp.yMax ?? 7,
          width: 0,
          height: 0,
        },
        gridMode: (graph.gridMode as GridMode) || 'cartesian',
        themeId: (graph.themeId as ThemeId) || 'parchment',
      });

      onClose();
    } catch (err) {
      console.error('Failed to parse graph payload:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150"
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
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5" style={{ color: theme.accent }} />
            <div>
              <h2
                className="text-base font-bold tracking-tight"
                style={{
                  fontFamily: '"Cinzel", "Source Serif 4", serif',
                  color: theme.textPrimary,
                }}
              >
                Mathematical Submissions & Archive
              </h2>
              <p className="text-xs" style={{ color: theme.textSecondary }}>
                Community discoveries and personal cloud submissions with unique share codes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div
          className="px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('public')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'public' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeTab === 'public' ? theme.accent : 'transparent',
                color: activeTab === 'public' ? '#FFFFFF' : theme.textPrimary,
              }}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Community Submissions ({publicGraphs.length})</span>
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'user' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'user' ? theme.accent : 'transparent',
                  color: activeTab === 'user' ? '#FFFFFF' : theme.textPrimary,
                }}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>My Treatises ({userGraphs.length})</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-50" style={{ color: theme.textPrimary }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search submissions..."
              className="pl-8 pr-3 py-1 rounded-lg border text-xs w-48 font-mono"
              style={{
                backgroundColor: theme.bgSidebar,
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            />
          </div>
        </div>

        {/* List Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 py-16 text-center text-xs" style={{ color: theme.textMuted }}>
              Loading mathematical submissions from Firestore...
            </div>
          ) : filteredList.length > 0 ? (
            filteredList.map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md"
                style={{
                  backgroundColor: theme.bgSidebar,
                  borderColor: theme.border,
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3
                      className="font-bold text-sm tracking-tight truncate"
                      style={{
                        fontFamily: '"Source Serif 4", serif',
                        color: theme.textPrimary,
                      }}
                    >
                      {g.title}
                    </h3>
                    <span className="text-2xs font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-amber-700 shrink-0">
                      {g.shareCode}
                    </span>
                  </div>

                  <div className="text-2xs mb-2 flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
                    <span>By {g.authorName || 'Scholar'}</span>
                  </div>

                  {g.description && (
                    <p className="text-2xs line-clamp-2 mb-3 leading-relaxed" style={{ color: theme.textSecondary }}>
                      {g.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs" style={{ borderColor: theme.border }}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(g.shareCode, g.id)}
                      title="Copy Share Link"
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1 text-2xs"
                      style={{ color: theme.textSecondary }}
                    >
                      {copiedId === g.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === g.id ? 'Copied' : 'Share'}</span>
                    </button>

                    {user && g.authorId === user.uid && (
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id)}
                        title="Delete Submission"
                        className="p-1 rounded hover:bg-rose-50 text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenGraph(g)}
                    className="flex items-center gap-1 font-semibold hover:underline"
                    style={{ color: theme.accent }}
                  >
                    <span>Load Canvas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-16 text-center text-xs space-y-2" style={{ color: theme.textMuted }}>
              <p>No submissions found in this archive.</p>
              {activeTab === 'user' && (
                <p>Use the "Share Submission" button to submit your current graph!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
