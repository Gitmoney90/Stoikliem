import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ScrollText,
  Sparkles,
  Search,
  Plus,
  BookOpen,
  Heart,
  Share2,
  Copy,
  Check,
  Tag,
  AlertCircle,
  ExternalLink,
  Trash2,
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Image as ImageIcon,
  Video,
  UserPlus,
  UserCheck,
  Radio,
  Send,
  User as UserIcon,
  Play,
  Layers,
  ChevronRight,
  Maximize2,
  X,
  RefreshCw,
  Clock,
  Flame,
  Award,
} from 'lucide-react';
import { ThemeConfig, GraphExpression, Viewport, GridMode, ThemeId } from '../types/graph';
import { useAuth } from '../context/AuthContext';
import { MathView } from './MathView';
import {
  ResearchPost,
  TheoremCategory,
  MediaAttachment,
  VlogStep,
  ResearchComment,
  fetchResearchPosts,
  createResearchPost,
  endorseResearchPost,
  deleteResearchPost,
  fetchPostComments,
  addPostComment,
  deletePostComment,
} from '../lib/researchService';
import {
  Friendship,
  FriendStatus,
  getFriendStatus,
  sendFriendRequest,
  acceptFriendRequest,
  fetchUserFriendships,
  startDirectP2PSession,
  listenDirectP2PSession,
  sendDirectChatMessage,
  sendDirectGraphSync,
  DirectP2PSessionData,
} from '../lib/friendService';

interface TheoryPublicationTabProps {
  theme: ThemeConfig;
  currentExpressions: GraphExpression[];
  viewport: Viewport;
  gridMode: GridMode;
  themeId: ThemeId;
  onBackToStudio: () => void;
  onPlotAttachedExpressions: (exprs: GraphExpression[], title: string) => void;
  onShowToast: (msg: string) => void;
  initialPostId?: string | null;
}

export const TheoryPublicationTab: React.FC<TheoryPublicationTabProps> = ({
  theme,
  currentExpressions,
  viewport,
  gridMode,
  themeId,
  onBackToStudio,
  onPlotAttachedExpressions,
  onShowToast,
  initialPostId,
}) => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<ResearchPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'vlogs' | 'my_posts' | 'friends'>('all');
  const [activeCategory, setActiveCategory] = useState<TheoremCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPost, setSelectedPost] = useState<ResearchPost | null>(null);

  // Likes & Endorsement tracking
  const [endorsedIds, setEndorsedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Comments State for Selected Post
  const [comments, setComments] = useState<ResearchComment[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

  // Publisher Friend Status for Selected Post
  const [authorFriendStatus, setAuthorFriendStatus] = useState<FriendStatus>('none');
  const [activeFriendship, setActiveFriendship] = useState<Friendship | null>(null);
  const [actionLoadingFriend, setActionLoadingFriend] = useState<boolean>(false);

  // User's Friends List for the Friends tab
  const [friendsList, setFriendsList] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);

  // Direct P2P & Live Chat State
  const [activeDirectSessionId, setActiveDirectSessionId] = useState<string | null>(null);
  const [directPartner, setDirectPartner] = useState<{ uid: string; name: string } | null>(null);
  const [directSessionData, setDirectSessionData] = useState<DirectP2PSessionData | null>(null);
  const [directChatMessage, setDirectChatMessage] = useState<string>('');
  const [isDirectP2POpen, setIsDirectP2POpen] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Publish Vlog Theorem Drawer State
  const [isPublishingOpen, setIsPublishingOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TheoremCategory>('vlog_discovery');
  const [newLatex, setNewLatex] = useState('\\forall x > 0, \\; \\ln(x) \\le x - 1');
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState('calculus, analysis, loci');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [attachCurrentGraph, setAttachCurrentGraph] = useState(true);
  const [newMediaAttachments, setNewMediaAttachments] = useState<MediaAttachment[]>([]);
  const [newVlogSteps, setNewVlogSteps] = useState<VlogStep[]>([
    { id: 'step_1', stepNumber: 1, title: 'Hypothesis & Physical Intuition', description: 'Formulation of the continuous boundary and initial field parameters.' },
    { id: 'step_2', stepNumber: 2, title: 'Geometric Locus & Invariant', description: 'Demonstrating the exact curve trace and symmetry loci across the plane.' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load Posts on mount
  useEffect(() => {
    loadAllPosts();
    if (user) {
      loadFriendships();
    }
  }, [user]);

  // Open initial post if requested via URL
  useEffect(() => {
    if (initialPostId && posts.length > 0) {
      const match = posts.find((p) => p.id === initialPostId);
      if (match) setSelectedPost(match);
    }
  }, [initialPostId, posts]);

  const loadAllPosts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchResearchPosts();
      setPosts(data);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendships = async () => {
    if (!user) return;
    try {
      const res = await fetchUserFriendships(user.uid);
      setFriendsList(res.friends);
      setPendingReceived(res.pendingReceived);
    } catch {}
  };

  // When a post is selected, fetch comments and author friend status
  useEffect(() => {
    if (!selectedPost) return;

    // Load comments
    setLoadingComments(true);
    fetchPostComments(selectedPost.id)
      .then((c) => setComments(c))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));

    // Check friendship with author
    if (user && selectedPost.authorId) {
      getFriendStatus(user.uid, selectedPost.authorId).then((res) => {
        setAuthorFriendStatus(res.status);
        setActiveFriendship(res.friendship || null);
      });
    } else {
      setAuthorFriendStatus('none');
      setActiveFriendship(null);
    }
  }, [selectedPost, user]);

  // Direct P2P Listener
  useEffect(() => {
    if (!activeDirectSessionId) return;
    const unsub = listenDirectP2PSession(activeDirectSessionId, (data) => {
      setDirectSessionData(data);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [activeDirectSessionId]);

  // Handle Endorsement / Like
  const handleEndorse = async (post: ResearchPost, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (endorsedIds.has(post.id)) return;
    setEndorsedIds((prev) => new Set([...prev, post.id]));
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, endorsementsCount: (p.endorsementsCount || 0) + 1 } : p))
    );
    if (selectedPost && selectedPost.id === post.id) {
      setSelectedPost((prev) => (prev ? { ...prev, endorsementsCount: (prev.endorsementsCount || 0) + 1 } : null));
    }
    await endorseResearchPost(post.id);
    onShowToast(`Endorsed: "${post.title}"`);
  };

  // Handle Plot attached loci in Studio
  const handlePlotInStudio = (post: ResearchPost, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (post.attachedExpressions && post.attachedExpressions.length > 0) {
      onPlotAttachedExpressions(post.attachedExpressions, post.title);
      onShowToast(`Plotted locus for: "${post.title}"`);
      onBackToStudio();
    } else {
      onShowToast('No mathematical loci attached to this publication.');
    }
  };

  // Handle Friend Request / Acceptance
  const handleSendFriendRequest = async () => {
    if (!user || !selectedPost) {
      onShowToast('Please sign in to connect with fellow scholars');
      return;
    }
    setActionLoadingFriend(true);
    try {
      await sendFriendRequest({
        myUid: user.uid,
        myName: profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Mathematical Scholar',
        myAvatar: profile?.avatarEmoji || '📐',
        targetUid: selectedPost.authorId,
        targetName: selectedPost.authorName,
        targetAvatar: selectedPost.authorAvatarEmoji || '📐',
      });
      setAuthorFriendStatus('pending_sent');
      onShowToast(`Friend request sent to ${selectedPost.authorName}`);
      loadFriendships();
    } catch {
      onShowToast('Failed to send friend request');
    } finally {
      setActionLoadingFriend(false);
    }
  };

  const handleAcceptFriendship = async (friendshipId: string, partnerName: string) => {
    try {
      await acceptFriendRequest(friendshipId);
      setAuthorFriendStatus('friends');
      onShowToast(`You and ${partnerName} are now fellow research friends!`);
      loadFriendships();
    } catch {
      onShowToast('Failed to accept friend request');
    }
  };

  // Direct P2P Launcher without Code Scanning or Sharing
  const handleStartDirectP2P = async (partnerUid: string, partnerName: string) => {
    if (!user) {
      onShowToast('Please sign in to initiate direct scholar collaboration');
      return;
    }
    try {
      const sessionId = await startDirectP2PSession(user.uid, partnerUid);
      setActiveDirectSessionId(sessionId);
      setDirectPartner({ uid: partnerUid, name: partnerName });
      setIsDirectP2POpen(true);
      onShowToast(`Connected direct 1-to-1 session with ${partnerName}`);
    } catch (err: any) {
      onShowToast('Could not start direct session');
    }
  };

  // Direct Chat Sender
  const handleSendDirectChatMessage = async () => {
    if (!activeDirectSessionId || !directChatMessage.trim() || !user) return;
    const currentMsgs = directSessionData?.chatMessagesJson
      ? JSON.parse(directSessionData.chatMessagesJson)
      : [];
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: user.uid,
      sender: 'self' as const,
      senderName: profile?.displayName || user.displayName || 'Me',
      senderEmoji: profile?.avatarEmoji || '📐',
      text: directChatMessage.trim(),
      timestamp: Date.now(),
    };
    setDirectChatMessage('');
    await sendDirectChatMessage(activeDirectSessionId, newMsg, currentMsgs);
  };

  // Direct Graph Sync (Pushes current canvas or attached locus directly to friend)
  const handleSendDirectGraph = async () => {
    if (!activeDirectSessionId) return;
    await sendDirectGraphSync(activeDirectSessionId, {
      expressions: currentExpressions,
      viewport,
      gridMode,
      themeId,
      title: 'Direct Synced Canvas',
    });
    onShowToast('Canvas synchronized directly to your peer!');
  };

  // Submit Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPost || !newCommentText.trim()) return;
    setSubmittingComment(true);
    try {
      const created = await addPostComment(selectedPost.id, {
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Peer Scholar',
        authorTitle: profile?.academicTitle || 'Mathematical Scholar',
        authorAvatarEmoji: profile?.avatarEmoji || '📐',
        content: newCommentText.trim(),
      });
      setComments((prev) => [...prev, created]);
      setNewCommentText('');
      onShowToast('Comment published to theorem dossier');
    } catch {
      onShowToast('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Media File Picker for Vlog publication
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        onShowToast(`File ${file.name} exceeds 2MB limit`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setNewMediaAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            dataUrl,
            sizeKb: Math.round(file.size / 1024),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Create Vlog Step helper
  const handleAddVlogStep = () => {
    const nextNumber = newVlogSteps.length + 1;
    setNewVlogSteps((prev) => [
      ...prev,
      {
        id: `step_${Date.now()}`,
        stepNumber: nextNumber,
        title: `Step ${nextNumber}: Demonstration Phase`,
        description: 'Detail the analytical or visual deduction here.',
      },
    ]);
  };

  // Publish New Vlog Theorem
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      setFormError('Please sign in to publish theorem & vlog dispatches.');
      return;
    }
    if (!newTitle.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!newBody.trim()) {
      setFormError('Demonstration text/body is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagList = newTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const created = await createResearchPost({
        title: newTitle,
        category: newCategory,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Peer Scholar',
        authorTitle: profile?.academicTitle || 'Mathematical Scholar',
        authorAvatarEmoji: profile?.avatarEmoji || '📐',
        latexStatement: newLatex,
        body: newBody,
        attachedExpressions: attachCurrentGraph ? currentExpressions : undefined,
        mediaAttachments: newMediaAttachments,
        vlogVideoUrl: newVideoUrl,
        vlogSteps: newVlogSteps,
        tags: tagList,
      });

      setPosts((prev) => [created, ...prev]);
      setIsPublishingOpen(false);
      setSelectedPost(created);
      onShowToast(`Published: "${created.title}"`);

      // Reset form
      setNewTitle('');
      setNewBody('');
      setNewVideoUrl('');
      setNewMediaAttachments([]);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to publish dispatch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Tab filter
      if (activeTab === 'vlogs' && post.category !== 'vlog_discovery' && (!post.vlogSteps || post.vlogSteps.length === 0)) {
        return false;
      }
      if (activeTab === 'my_posts' && user && post.authorId !== user.uid) {
        return false;
      }

      // Category filter
      if (activeCategory !== 'all' && post.category !== activeCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = post.title.toLowerCase().includes(q);
        const inAuthor = post.authorName.toLowerCase().includes(q);
        const inBody = post.body.toLowerCase().includes(q);
        const inLatex = post.latexStatement.toLowerCase().includes(q);
        const inTags = post.tags.some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inAuthor && !inBody && !inLatex && !inTags) {
          return false;
        }
      }
      return true;
    });
  }, [posts, activeTab, activeCategory, searchQuery, user]);

  return (
    <div
      className="flex-1 w-full h-full flex flex-col overflow-hidden select-none"
      style={{
        backgroundColor: theme.bgCanvas,
        color: theme.textPrimary,
      }}
    >
      {/* Top Header Bar for Theory Publication Tab */}
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
            title="Return to Graphing Engine & Studio Canvas"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Graph Studio</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <ScrollText className="w-5 h-5 text-indigo-500 shrink-0" />
            <h1
              className="text-base sm:text-lg font-bold tracking-tight truncate"
              style={{ fontFamily: '"Cinzel", "Source Serif 4", serif' }}
            >
              Annals of Mathematical Discovery
            </h1>
            <span className="hidden md:inline px-2 py-0.5 rounded text-3xs font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
              Vlog & Publications
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPublishingOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-transform active:scale-95"
            style={{
              backgroundColor: theme.accent,
              color: '#FFFFFF',
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Publish Vlog Theorem</span>
            <span className="sm:hidden">Publish</span>
          </button>
        </div>
      </header>

      {/* Main Multi-Tab Navigation Bar & Filter Controls */}
      <div
        className="px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
        }}
      >
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {[
            { id: 'all', label: 'All Publications', icon: BookOpen },
            { id: 'vlogs', label: 'Vlog Discoveries', icon: Video, badge: 'Media' },
            { id: 'my_posts', label: 'My Research', icon: UserIcon },
            { id: 'friends', label: 'Scholar Friends & Collabs', icon: UserCheck, count: friendsList.length },
          ].map((t) => {
            const isCurrent = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  if (t.id === 'friends') setSelectedPost(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'font-bold shadow-xs'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: isCurrent ? theme.accent : 'transparent',
                  color: isCurrent ? '#FFFFFF' : theme.textPrimary,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge && (
                  <span className="px-1 py-0.2 rounded text-3xs font-mono bg-amber-500/30 text-amber-900 dark:text-amber-200 ml-0.5">
                    {t.badge}
                  </span>
                )}
                {t.count !== undefined && t.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-3xs font-mono font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 ml-0.5">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search theorems, authors, tags..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs bg-transparent outline-none focus:ring-1"
            style={{
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
          />
        </div>
      </div>

      {/* Sub-Category Filter Pills */}
      {activeTab !== 'friends' && (
        <div
          className="px-4 sm:px-6 py-2 border-b flex items-center gap-1.5 overflow-x-auto text-2xs shrink-0 select-none"
          style={{ borderColor: theme.border }}
        >
          <span className="text-3xs uppercase tracking-wider font-bold opacity-60 mr-1">
            Category:
          </span>
          {[
            { id: 'all', label: 'All Branches' },
            { id: 'vlog_discovery', label: '🎬 Vlog Discoveries' },
            { id: 'theorem', label: 'Theorems' },
            { id: 'conjecture', label: 'Conjectures' },
            { id: 'proof', label: 'Formal Proofs' },
            { id: 'lemma', label: 'Lemmas' },
            { id: 'note', label: 'Scholarly Notes' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-md border font-medium transition-all ${
                activeCategory === cat.id
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 font-bold'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
              }`}
              style={{ borderColor: activeCategory === cat.id ? undefined : theme.border }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* If in Friends tab, show Friends & Direct P2P Collabs */}
        {activeTab === 'friends' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div
                className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
              >
                <div>
                  <h3 className="font-bold text-sm" style={{ fontFamily: '"Cinzel", serif' }}>
                    Peer Friends & Direct P2P Collab
                  </h3>
                  <p className="text-2xs opacity-75 mt-0.5">
                    Connect with fellow theorem publishers without needing QR codes or room codes. Start direct real-time chat and live synchronized graphing with 1 tap!
                  </p>
                </div>
                <button
                  onClick={loadFriendships}
                  className="px-3 py-1.5 rounded-lg border text-2xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 shrink-0 self-start sm:self-auto"
                  style={{ borderColor: theme.border }}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Friends</span>
                </button>
              </div>

              {/* Pending Received Requests */}
              {pendingReceived.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Incoming Scholar Requests ({pendingReceived.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingReceived.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-xl border flex items-center justify-between gap-3"
                        style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl">{req.user1Avatar || '📐'}</span>
                          <div className="truncate">
                            <div className="font-bold text-xs truncate">{req.user1Name}</div>
                            <div className="text-3xs opacity-70">Wants to be your research peer</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcceptFriendship(req.id, req.user1Name)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-2xs shrink-0 active:scale-95"
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Accepted Friends ({friendsList.length})
                </h4>
                {friendsList.length === 0 ? (
                  <div
                    className="p-10 rounded-xl border text-center text-xs space-y-2"
                    style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                  >
                    <UserPlus className="w-8 h-8 opacity-30 mx-auto text-indigo-500" />
                    <p className="font-semibold">No scholar friends yet.</p>
                    <p className="text-3xs opacity-70 max-w-sm mx-auto">
                      Explore theorem publications and click "+ Add Friend" on publisher profiles to enable direct code-free P2P live chat!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {friendsList.map((f) => {
                      const isUser1 = f.user1Id === user?.uid;
                      const friendName = isUser1 ? f.user2Name : f.user1Name;
                      const friendAvatar = isUser1 ? f.user2Avatar : f.user1Avatar;
                      const friendUid = isUser1 ? f.user2Id : f.user1Id;

                      return (
                        <div
                          key={f.id}
                          className="p-3.5 rounded-xl border flex flex-col justify-between gap-3 shadow-xs hover:border-indigo-500/50 transition-all"
                          style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg shrink-0">
                              {friendAvatar || '📐'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate">{friendName}</div>
                              <div className="text-3xs opacity-70 font-mono">Mutual Research Friend</div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleStartDirectP2P(friendUid, friendName)}
                            className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                          >
                            <Radio className="w-3.5 h-3.5 animate-pulse" />
                            <span>Direct P2P & Live Chat</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Feed List Section (Left/Center Column) */}
            <div
              className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 ${
                selectedPost ? 'hidden lg:block lg:w-5/12 lg:flex-none border-r' : 'w-full'
              }`}
              style={{ borderColor: theme.border }}
            >
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Sparkles className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs font-mono">Consulting Mathematical Annals...</span>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="py-20 text-center text-xs space-y-2 opacity-60">
                  <ScrollText className="w-8 h-8 mx-auto opacity-30" />
                  <p>No research publications match your criteria.</p>
                </div>
              ) : (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {filteredPosts.map((post) => {
                    const isSelected = selectedPost?.id === post.id;
                    const hasVlog = post.category === 'vlog_discovery' || (post.vlogSteps && post.vlogSteps.length > 0) || post.vlogVideoUrl;
                    const mediaCount = post.mediaAttachments?.length || 0;

                    return (
                      <article
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                          isSelected ? 'ring-2 ring-indigo-500 border-transparent' : 'hover:border-black/20 dark:hover:border-white/20'
                        }`}
                        style={{
                          backgroundColor: theme.bgCard,
                          borderColor: isSelected ? undefined : theme.border,
                        }}
                      >
                        {/* Header: Category Badge, Vlog Badge, Endorsements */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-3xs font-mono uppercase tracking-wider font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
                              {post.category.replace('_', ' ')}
                            </span>
                            {hasVlog && (
                              <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                <span>Vlog Publication</span>
                              </span>
                            )}
                            {mediaCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-3xs font-mono opacity-70 flex items-center gap-0.5">
                                <Paperclip className="w-2.5 h-2.5" />
                                <span>{mediaCount} files</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-2xs opacity-75">
                            <button
                              onClick={(e) => handleEndorse(post, e)}
                              className="flex items-center gap-1 hover:text-rose-500 transition-colors"
                              title="Like / Peer Endorsement"
                            >
                              <Heart className={`w-3.5 h-3.5 ${endorsedIds.has(post.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                              <span className="font-mono tabular-nums">{post.endorsementsCount || 0}</span>
                            </button>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="font-mono tabular-nums">{post.commentsCount || 0}</span>
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h2
                          className="text-base sm:text-lg font-bold leading-tight mb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          style={{ fontFamily: '"Source Serif 4", serif' }}
                        >
                          {post.title}
                        </h2>

                        {/* Author Pill */}
                        <div className="flex items-center gap-2 mb-3 text-2xs opacity-80">
                          <span className="text-base">{post.authorAvatarEmoji || '📐'}</span>
                          <span className="font-semibold">{post.authorName}</span>
                          {post.authorTitle && (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="italic truncate">{post.authorTitle}</span>
                            </>
                          )}
                        </div>

                        {/* LaTeX Formula Banner */}
                        {post.latexStatement && (
                          <div
                            className="p-3 rounded-lg border my-2.5 overflow-x-auto text-xs font-serif text-center"
                            style={{
                              backgroundColor: theme.bgSidebar,
                              borderColor: theme.border,
                            }}
                          >
                            <MathView math={post.latexStatement} displayMode={true} />
                          </div>
                        )}

                        {/* Media Attachment Thumbnails Preview */}
                        {post.mediaAttachments && post.mediaAttachments.length > 0 && (
                          <div className="flex items-center gap-2 my-2.5 overflow-x-auto pb-1">
                            {post.mediaAttachments.slice(0, 3).map((att) => (
                              <div
                                key={att.id}
                                className="w-20 h-14 rounded-lg overflow-hidden border shrink-0 relative bg-black/5 dark:bg-white/5"
                                style={{ borderColor: theme.border }}
                              >
                                {att.type === 'image' ? (
                                  <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full p-1 text-3xs font-mono truncate text-center">
                                    <Paperclip className="w-3.5 h-3.5 mb-0.5" />
                                    <span className="truncate w-full">{att.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            {post.mediaAttachments.length > 3 && (
                              <div className="px-2 py-1 text-3xs opacity-60 font-mono">
                                +{post.mediaAttachments.length - 3} more
                              </div>
                            )}
                          </div>
                        )}

                        {/* Narrative Excerpt */}
                        <p className="text-xs opacity-75 line-clamp-2 leading-relaxed mb-3">
                          {post.body}
                        </p>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-2 border-t text-2xs" style={{ borderColor: theme.border }}>
                          {/* Tags */}
                          <div className="flex items-center gap-1 overflow-hidden truncate max-w-[60%]">
                            {post.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 font-mono text-3xs opacity-70">
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {post.attachedExpressions && post.attachedExpressions.length > 0 && (
                              <button
                                onClick={(e) => handlePlotInStudio(post, e)}
                                className="px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-400 font-semibold transition-colors flex items-center gap-1 active:scale-95"
                                title="Plot attached loci in Graph Studio"
                              >
                                <Layers className="w-3 h-3" />
                                <span>Plot in Studio</span>
                              </button>
                            )}

                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                              <span>Read Dossier</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Post Full Dossier View (Right Column or Full View) */}
            {selectedPost && (
              <div
                className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6"
                style={{ backgroundColor: theme.bgSidebar }}
              >
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Top Bar with Back/Close button for mobile */}
                  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: theme.border }}>
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Annals Feed</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {selectedPost.attachedExpressions && selectedPost.attachedExpressions.length > 0 && (
                        <button
                          onClick={() => handlePlotInStudio(selectedPost)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Plot Locus in Canvas</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Header & Badges */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded text-2xs font-mono uppercase tracking-wider font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
                        {selectedPost.category.replace('_', ' ')}
                      </span>
                      {selectedPost.vlogVideoUrl && (
                        <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center gap-1">
                          <Play className="w-3 h-3 fill-current" />
                          <span>Video Walkthrough</span>
                        </span>
                      )}
                    </div>

                    <h1
                      className="text-2xl sm:text-3xl font-bold leading-tight"
                      style={{ fontFamily: '"Cinzel", "Source Serif 4", serif' }}
                    >
                      {selectedPost.title}
                    </h1>
                  </div>

                  {/* Publisher Profile Dossier Card */}
                  <div
                    className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                    style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl shrink-0">
                        {selectedPost.authorAvatarEmoji || '📐'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm truncate">{selectedPost.authorName}</h3>
                          <span className="px-1.5 py-0.2 rounded text-3xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            Publisher
                          </span>
                        </div>
                        <p className="text-2xs opacity-75 truncate">{selectedPost.authorTitle || 'Mathematical Scholar'}</p>
                      </div>
                    </div>

                    {/* Friend & Direct P2P Action */}
                    <div className="shrink-0 flex items-center gap-2">
                      {user && user.uid === selectedPost.authorId ? (
                        <span className="text-2xs opacity-60 font-mono italic">Your Publication</span>
                      ) : authorFriendStatus === 'friends' ? (
                        <button
                          onClick={() => handleStartDirectP2P(selectedPost.authorId, selectedPost.authorName)}
                          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                        >
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>Direct P2P & Live Chat</span>
                        </button>
                      ) : authorFriendStatus === 'pending_sent' ? (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-lg border text-2xs opacity-60 font-medium"
                          style={{ borderColor: theme.border }}
                        >
                          Request Pending
                        </button>
                      ) : authorFriendStatus === 'pending_received' ? (
                        <button
                          onClick={() => activeFriendship && handleAcceptFriendship(activeFriendship.id, selectedPost.authorName)}
                          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          Accept Friend Request
                        </button>
                      ) : (
                        <button
                          onClick={handleSendFriendRequest}
                          disabled={actionLoadingFriend}
                          className="px-3.5 py-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                          style={{ borderColor: theme.border }}
                        >
                          <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
                          <span>+ Add Friend</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LaTeX Mathematical Formula */}
                  {selectedPost.latexStatement && (
                    <div
                      className="p-5 rounded-xl border text-center shadow-xs overflow-x-auto text-sm sm:text-base"
                      style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                    >
                      <MathView math={selectedPost.latexStatement} displayMode={true} />
                    </div>
                  )}

                  {/* Media Attachments Gallery */}
                  {selectedPost.mediaAttachments && selectedPost.mediaAttachments.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span>Attached Figures, Diagrams & Files ({selectedPost.mediaAttachments.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedPost.mediaAttachments.map((att) => (
                          <div
                            key={att.id}
                            className="rounded-xl border overflow-hidden shadow-xs flex flex-col"
                            style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                          >
                            {att.type === 'image' ? (
                              <img src={att.dataUrl} alt={att.name} className="w-full h-48 object-contain bg-black/5 dark:bg-white/5" />
                            ) : (
                              <div className="h-32 flex items-center justify-center p-4">
                                <Paperclip className="w-8 h-8 opacity-40" />
                              </div>
                            )}
                            <div className="p-2.5 border-t text-2xs flex items-center justify-between" style={{ borderColor: theme.border }}>
                              <span className="font-semibold truncate">{att.name}</span>
                              {att.sizeKb && <span className="opacity-60 font-mono text-3xs">{att.sizeKb} KB</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vlog Step-by-Step Demonstration Timeline */}
                  {selectedPost.vlogSteps && selectedPost.vlogSteps.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80">
                        <Video className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Vlog Demonstration Steps</span>
                      </h3>
                      <div className="space-y-3">
                        {selectedPost.vlogSteps.map((step) => (
                          <div
                            key={step.id}
                            className="p-4 rounded-xl border flex gap-3 shadow-xs"
                            style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                          >
                            <div className="w-7 h-7 rounded-full bg-indigo-500 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              {step.stepNumber}
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <h4 className="font-bold text-xs">{step.title}</h4>
                              <p className="text-2xs opacity-80 leading-relaxed">{step.description}</p>
                              {step.formula && (
                                <div className="p-2 rounded bg-black/5 dark:bg-white/5 text-2xs overflow-x-auto text-center font-serif">
                                  <MathView math={step.formula} displayMode={true} />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Narrative Text */}
                  <div
                    className="p-6 rounded-xl border space-y-4 shadow-xs"
                    style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">Full Thesis & Analytical Locus</h3>
                    <div
                      className="text-sm leading-relaxed whitespace-pre-line opacity-90"
                      style={{ fontFamily: '"Source Serif 4", serif' }}
                    >
                      {selectedPost.body}
                    </div>
                  </div>

                  {/* Endorsement and Share Bar */}
                  <div
                    className="p-4 rounded-xl border flex items-center justify-between gap-4"
                    style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                  >
                    <button
                      onClick={() => handleEndorse(selectedPost)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 ${
                        endorsedIds.has(selectedPost.id)
                          ? 'bg-rose-500 text-white'
                          : 'border hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600'
                      }`}
                      style={{ borderColor: endorsedIds.has(selectedPost.id) ? undefined : theme.border }}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                      <span>Endorse Thesis ({selectedPost.endorsementsCount || 0})</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        onShowToast('Dossier link copied to clipboard');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: theme.border }}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Comments & Peer Reviews Section */}
                  <div className="space-y-4 pt-4 border-t" style={{ borderColor: theme.border }}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        <span>Peer Comments & Reviews ({comments.length})</span>
                      </h3>
                    </div>

                    {/* Add Comment Input Box */}
                    {user ? (
                      <form onSubmit={handleAddComment} className="flex gap-2">
                        <input
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Write a scholarly critique or observation..."
                          className="flex-1 px-3 py-2 rounded-lg border text-xs bg-transparent outline-none focus:ring-1"
                          style={{ borderColor: theme.border, color: theme.textPrimary }}
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !newCommentText.trim()}
                          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Post</span>
                        </button>
                      </form>
                    ) : (
                      <div
                        className="p-3 rounded-lg border text-center text-xs opacity-75"
                        style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                      >
                        Sign in to participate in peer reviews and comments.
                      </div>
                    )}

                    {/* Comments List */}
                    {loadingComments ? (
                      <div className="py-6 text-center text-xs font-mono opacity-50">Loading comments...</div>
                    ) : comments.length === 0 ? (
                      <div className="py-6 text-center text-xs opacity-60">No peer comments yet. Be the first to review!</div>
                    ) : (
                      <div className="space-y-2.5">
                        {comments.map((cm) => (
                          <div
                            key={cm.id}
                            className="p-3 rounded-xl border space-y-1.5 shadow-2xs"
                            style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                          >
                            <div className="flex items-center justify-between text-2xs">
                              <div className="flex items-center gap-2">
                                <span>{cm.authorAvatarEmoji || '💬'}</span>
                                <span className="font-bold">{cm.authorName}</span>
                                {cm.authorTitle && <span className="opacity-60 italic">· {cm.authorTitle}</span>}
                              </div>
                              <span className="opacity-50 text-3xs font-mono">{cm.createdAt ? 'Recently' : ''}</span>
                            </div>
                            <p className="text-xs opacity-85 leading-relaxed">{cm.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Direct Friend 1-to-1 P2P & Live Chat Floating Modal */}
      {isDirectP2POpen && directPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col h-[85vh] max-h-[640px] overflow-hidden"
            style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
          >
            {/* Direct Header */}
            <div className="p-3 sm:p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                    <span>Direct P2P: {directPartner.name}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  </h3>
                  <p className="text-3xs text-emerald-600 dark:text-emerald-400 font-mono">
                    Zero-Code Mutual Friendship Session
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendDirectGraph}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-2xs flex items-center gap-1 active:scale-95"
                  title="Push active graph canvas to your friend"
                >
                  <Layers className="w-3 h-3" />
                  <span>Sync Canvas</span>
                </button>
                <button
                  onClick={() => setIsDirectP2POpen(false)}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Direct Chat Message Thread */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
              {(() => {
                const msgs = directSessionData?.chatMessagesJson
                  ? JSON.parse(directSessionData.chatMessagesJson)
                  : [];
                if (msgs.length === 0) {
                  return (
                    <div className="py-16 text-center text-xs opacity-60 space-y-1">
                      <Radio className="w-6 h-6 mx-auto opacity-40 text-emerald-500" />
                      <p className="font-semibold">Direct Peer Session Active</p>
                      <p className="text-3xs">Chat or synchronize mathematical graphs in real-time!</p>
                    </div>
                  );
                }
                return msgs.map((m: any) => {
                  const isMe = m.senderId === user?.uid;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="text-3xs opacity-60 font-mono mb-0.5">{m.senderName}</div>
                      <div
                        className={`px-3 py-1.5 rounded-xl text-xs max-w-[80%] leading-relaxed ${
                          isMe ? 'bg-indigo-600 text-white rounded-tr-xs' : 'rounded-tl-xs border'
                        }`}
                        style={{
                          backgroundColor: isMe ? undefined : theme.bgCard,
                          borderColor: isMe ? undefined : theme.border,
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={chatBottomRef} />
            </div>

            {/* Direct Chat Input */}
            <div className="p-3 border-t shrink-0 flex gap-2" style={{ borderColor: theme.border }}>
              <input
                type="text"
                value={directChatMessage}
                onChange={(e) => setDirectChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendDirectChatMessage()}
                placeholder="Message your research partner..."
                className="flex-1 px-3 py-2 rounded-lg border text-xs bg-transparent outline-none focus:ring-1"
                style={{ borderColor: theme.border, color: theme.textPrimary }}
              />
              <button
                onClick={handleSendDirectChatMessage}
                disabled={!directChatMessage.trim()}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Vlog Theorem Full Drawer / Modal */}
      {isPublishingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm sm:text-base" style={{ fontFamily: '"Cinzel", serif' }}>
                  Publish Theorem & Vlog Dispatch
                </h3>
              </div>
              <button
                onClick={() => setIsPublishingOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Scroll Body */}
            <form onSubmit={handlePublishPost} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-3xs uppercase font-bold opacity-70">Thesis Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Asymptotic Locus of Lemniscate Knots"
                    className="w-full px-3 py-2 rounded-lg border text-xs bg-transparent outline-none"
                    style={{ borderColor: theme.border }}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-3xs uppercase font-bold opacity-70">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border text-xs bg-transparent outline-none"
                    style={{ borderColor: theme.border, backgroundColor: theme.bgCard }}
                  >
                    <option value="vlog_discovery">🎬 Vlog Discovery</option>
                    <option value="theorem">Theorem</option>
                    <option value="conjecture">Conjecture</option>
                    <option value="proof">Formal Proof</option>
                    <option value="lemma">Lemma</option>
                    <option value="note">Scholarly Note</option>
                  </select>
                </div>
              </div>

              {/* LaTeX Formula with Live Preview */}
              <div className="space-y-1">
                <label className="text-3xs uppercase font-bold opacity-70">LaTeX Mathematical Formula</label>
                <textarea
                  value={newLatex}
                  onChange={(e) => setNewLatex(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border text-xs font-mono bg-transparent outline-none"
                  style={{ borderColor: theme.border }}
                  placeholder="\forall x \in \mathbb{R}, \; f(x) = \dots"
                />
                {newLatex && (
                  <div className="p-2.5 rounded-lg border text-center text-xs overflow-x-auto bg-black/5 dark:bg-white/5" style={{ borderColor: theme.border }}>
                    <MathView math={newLatex} displayMode={true} />
                  </div>
                )}
              </div>

              {/* Attach Files & Images (Vlog style) */}
              <div className="space-y-2 p-3.5 rounded-xl border" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <label className="text-3xs uppercase font-bold opacity-70 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>Attach Figures, Diagrams & Photos</span>
                  </label>
                  <label className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 font-bold text-3xs cursor-pointer flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                  </label>
                </div>

                {newMediaAttachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {newMediaAttachments.map((att) => (
                      <div key={att.id} className="relative rounded-lg border overflow-hidden group" style={{ borderColor: theme.border }}>
                        {att.type === 'image' && (
                          <img src={att.dataUrl} alt={att.name} className="w-full h-16 object-cover" />
                        )}
                        <div className="p-1 text-3xs truncate bg-black/50 text-white flex items-center justify-between">
                          <span className="truncate">{att.name}</span>
                          <button
                            type="button"
                            onClick={() => setNewMediaAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                            className="p-0.5 hover:text-rose-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vlog Step-by-Step Demonstration Builder */}
              <div className="space-y-2 p-3.5 rounded-xl border" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <label className="text-3xs uppercase font-bold opacity-70 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Vlog Demonstration Steps ({newVlogSteps.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVlogStep}
                    className="px-2 py-0.5 rounded text-3xs font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/25"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {newVlogSteps.map((st, idx) => (
                    <div key={st.id} className="p-2.5 rounded-lg border space-y-1.5 text-2xs" style={{ borderColor: theme.border }}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Step {idx + 1}</span>
                        {newVlogSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewVlogSteps((prev) => prev.filter((s) => s.id !== st.id))}
                            className="text-rose-500 text-3xs hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={st.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewVlogSteps((prev) => prev.map((s) => (s.id === st.id ? { ...s, title: val } : s)));
                        }}
                        placeholder="Step title"
                        className="w-full px-2 py-1 rounded border text-2xs bg-transparent"
                        style={{ borderColor: theme.border }}
                      />
                      <textarea
                        value={st.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewVlogSteps((prev) => prev.map((s) => (s.id === st.id ? { ...s, description: val } : s)));
                        }}
                        rows={1}
                        placeholder="Analytical explanation"
                        className="w-full px-2 py-1 rounded border text-2xs bg-transparent"
                        style={{ borderColor: theme.border }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Walkthrough Link */}
              <div className="space-y-1">
                <label className="text-3xs uppercase font-bold opacity-70">Video Walkthrough or Audio URL (Optional)</label>
                <input
                  type="url"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/... or https://loom.com/..."
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-transparent outline-none"
                  style={{ borderColor: theme.border }}
                />
              </div>

              {/* Full Thesis Body */}
              <div className="space-y-1">
                <label className="text-3xs uppercase font-bold opacity-70">Full Thesis Demonstration & Narrative</label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={5}
                  placeholder="Elaborate on the geometric context, proof architecture, asymptotic behaviors, and references..."
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-transparent outline-none leading-relaxed"
                  style={{ borderColor: theme.border }}
                  required
                />
              </div>

              {/* Attach Current Graph */}
              <div className="flex items-center justify-between p-3 rounded-xl border text-xs" style={{ borderColor: theme.border }}>
                <div>
                  <div className="font-semibold">Attach Current Graph Expressions</div>
                  <div className="text-3xs opacity-70">
                    Include your active {currentExpressions.length} mathematical loci so peers can graph them in 1 tap!
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={attachCurrentGraph}
                  onChange={(e) => setAttachCurrentGraph(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="text-3xs uppercase font-bold opacity-70">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="geometry, calculus, fractals, optics"
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-transparent outline-none"
                  style={{ borderColor: theme.border }}
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublishingOpen(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: theme.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Publish Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
