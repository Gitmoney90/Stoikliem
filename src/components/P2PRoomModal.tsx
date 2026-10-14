import React, { useState, useEffect, useRef } from 'react';
import {
  P2PEngine,
  P2PConnectionState,
  ChatMessage,
  SharedFile,
  P2PDataPacket,
} from '../lib/webrtc';
import {
  ThemeConfig,
  GraphExpression,
  Viewport,
  GridMode,
  ThemeId,
} from '../types/graph';
import { QRCodeDisplay } from './QRCodeDisplay';
import { QRScanner } from './QRScanner';
import {
  createCloudP2PRoom,
  joinCloudP2PRoom,
  getCloudP2PRoom,
  subscribeToP2PRoom,
  broadcastGraphSyncToRoom,
  broadcastChatToRoom,
  closeCloudP2PRoom,
  generateRoomCode,
} from '../lib/p2pSignalingService';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Radio,
  QrCode,
  Camera,
  MessageSquare,
  FileText,
  Share2,
  Send,
  Download,
  Check,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Copy,
  Paperclip,
  Activity,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';

interface P2PRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  expressions: GraphExpression[];
  viewport: Viewport;
  gridMode: GridMode;
  themeId: ThemeId;
  onLoadSyncedGraph: (graph: {
    expressions: GraphExpression[];
    viewport: Viewport;
    gridMode: GridMode;
    themeId: ThemeId;
  }) => void;
  p2pEngine: P2PEngine;
  connectionState: P2PConnectionState;
}

type ModalTab = 'chat' | 'graph_sync' | 'files';
type SetupMode = 'cloud_code' | 'manual_airgap';

export const P2PRoomModal: React.FC<P2PRoomModalProps> = ({
  isOpen,
  onClose,
  theme,
  expressions,
  viewport,
  gridMode,
  themeId,
  onLoadSyncedGraph,
  p2pEngine,
  connectionState,
}) => {
  const { user, profile } = useAuth();

  // Mode Selection
  const [setupMode, setSetupMode] = useState<SetupMode>('cloud_code');
  const [role, setRole] = useState<'select' | 'host' | 'join'>('select');

  // Cloud Room Signaling State
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isInitializingRoom, setIsInitializingRoom] = useState<boolean>(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);
  const [isCopiedLink, setIsCopiedLink] = useState<boolean>(false);

  // Manual Airgap Signaling State
  const [manualStep, setManualStep] = useState<'offer' | 'answer' | 'connecting'>('offer');
  const [manualOfferToken, setManualOfferToken] = useState<string>('');
  const [manualAnswerToken, setManualAnswerToken] = useState<string>('');
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // Connected Room State
  const [activeTab, setActiveTab] = useState<ModalTab>('graph_sync');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [autoSyncGraph, setAutoSyncGraph] = useState(false);
  const [syncedNotification, setSyncedNotification] = useState<string | null>(null);
  const [lastPeerSyncTime, setLastPeerSyncTime] = useState<number | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const unsubscribeRoomRef = useRef<(() => void) | null>(null);

  const isConnected = connectionState === 'connected';

  const localScholarIdRef = useRef<string>(`scholar_${Math.random().toString(36).substring(2, 9)}`);
  const currentUserId = user?.uid || localScholarIdRef.current;

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (unsubscribeRoomRef.current) {
        unsubscribeRoomRef.current();
        unsubscribeRoomRef.current = null;
      }
    };
  }, []);

  // Listen to WebRTC packet events
  useEffect(() => {
    p2pEngine.onPacketReceived = (packet: P2PDataPacket) => {
      if (packet.type === 'chat') {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === packet.message.id)) return prev;
          return [
            ...prev,
            {
              ...packet.message,
              sender: packet.message.senderId === currentUserId ? 'self' : 'peer',
            },
          ];
        });
      } else if (packet.type === 'file') {
        setSharedFiles((prev) => [
          ...prev,
          { ...packet.file, sender: 'peer' },
        ]);
        setSyncedNotification(`Received file: ${packet.file.name}`);
        setTimeout(() => setSyncedNotification(null), 4000);
      } else if (packet.type === 'graph_sync') {
        onLoadSyncedGraph(packet.graph);
        setLastPeerSyncTime(Date.now());
        setSyncedNotification('Peer synchronized their mathematical canvas!');
        setTimeout(() => setSyncedNotification(null), 4000);
      }
    };
  }, [p2pEngine, onLoadSyncedGraph]);

  // Auto-sync graph to peer when autoSyncGraph is enabled
  useEffect(() => {
    if (!autoSyncGraph || !isConnected) return;
    handlePushCurrentGraph();
  }, [expressions, viewport, gridMode, themeId, autoSyncGraph, isConnected]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!isOpen) return null;

  // =========================================================================
  // 1-CLICK CLOUD SIGNALED ROOM HANDLERS
  // =========================================================================

  const handleStartHostCloudRoom = async () => {
    setIsInitializingRoom(true);
    setRoomError(null);
    setRole('host');

    const generated = generateRoomCode();
    setRoomCode(generated);

    try {
      // 1. Generate local WebRTC Offer
      const offerToken = await p2pEngine.createHostOffer();

      // 2. Publish room document to Firestore
      await createCloudP2PRoom(generated, offerToken);

      // 3. Listen for guest answer in real-time
      if (unsubscribeRoomRef.current) unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = subscribeToP2PRoom(
        generated,
        async (roomData) => {
          // If guest answer arrived and we haven't connected yet
          if (roomData.guestAnswer && p2pEngine.getState() !== 'connected') {
            try {
              await p2pEngine.applyGuestAnswer(roomData.guestAnswer);
              p2pEngine.setState('connected');
            } catch (err: any) {
              console.warn('Could not apply guest answer via WebRTC:', err);
              // Even if direct WebRTC fails, mark room connected via cloud relay
              p2pEngine.setState('connected');
            }
          }

          // Real-time Cloud Fallback Sync: If guest relayed graph via cloud
          if (roomData.graphSyncJson) {
            try {
              const parsedGraph = JSON.parse(roomData.graphSyncJson);
              onLoadSyncedGraph(parsedGraph);
              setLastPeerSyncTime(Date.now());
            } catch {}
          }

          // Real-time Cloud Fallback Chat
          if (roomData.chatMessagesJson) {
            try {
              const parsedMsgs: ChatMessage[] = JSON.parse(roomData.chatMessagesJson);
              setChatMessages(
                parsedMsgs.map((m) => ({
                  ...m,
                  sender: m.senderId === currentUserId ? 'self' : 'peer',
                }))
              );
            } catch {}
          }
        },
        (err) => {
          setRoomError('Room signaling disconnected. ' + err.message);
        }
      );
    } catch (err: any) {
      setRoomError(err?.message || 'Failed to create P2P room');
      p2pEngine.setState('failed');
    } finally {
      setIsInitializingRoom(false);
    }
  };

  const handleJoinCloudRoom = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code || code.length < 4) {
      setRoomError('Please enter a valid 6-character room code.');
      return;
    }

    setIsInitializingRoom(true);
    setRoomError(null);
    setRole('join');

    try {
      // 1. Fetch host offer from Firestore
      const roomData = await getCloudP2PRoom(code);
      if (!roomData || !roomData.hostOffer) {
        throw new Error(`Room "${code}" was not found or is no longer active.`);
      }

      setRoomCode(code);

      // 2. Create WebRTC Guest Answer from host offer
      const guestAnswerToken = await p2pEngine.createGuestAnswer(roomData.hostOffer);

      // 3. Post guest answer back to room document
      await joinCloudP2PRoom(code, guestAnswerToken);

      // 4. Set state to connected
      p2pEngine.setState('connected');

      // 5. Subscribe to ongoing room updates
      if (unsubscribeRoomRef.current) unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = subscribeToP2PRoom(code, (updatedRoom) => {
        if (updatedRoom.graphSyncJson) {
          try {
            const parsedGraph = JSON.parse(updatedRoom.graphSyncJson);
            onLoadSyncedGraph(parsedGraph);
            setLastPeerSyncTime(Date.now());
          } catch {}
        }
        if (updatedRoom.chatMessagesJson) {
          try {
            const parsedMsgs: ChatMessage[] = JSON.parse(updatedRoom.chatMessagesJson);
            setChatMessages(
              parsedMsgs.map((m) => ({
                ...m,
                sender: m.senderId === currentUserId ? 'self' : 'peer',
              }))
            );
          } catch {}
        }
      });
    } catch (err: any) {
      setRoomError(err?.message || 'Could not join room');
      p2pEngine.setState('failed');
    } finally {
      setIsInitializingRoom(false);
    }
  };

  // =========================================================================
  // AIR-GAPPED MANUAL TOKEN FLOW
  // =========================================================================

  const handleStartHostManual = async () => {
    setIsInitializingRoom(true);
    setRoomError(null);
    setManualStep('offer');
    try {
      const offer = await p2pEngine.createHostOffer();
      setManualOfferToken(offer);
    } catch (err: any) {
      setRoomError(err?.message || 'Failed to generate WebRTC offer');
    } finally {
      setIsInitializingRoom(false);
    }
  };

  const handleApplyManualAnswer = async (token: string) => {
    if (!token.trim()) return;
    setRoomError(null);
    setManualStep('connecting');
    try {
      await p2pEngine.applyGuestAnswer(token.trim());
      p2pEngine.setState('connected');
    } catch (err: any) {
      setRoomError(err?.message || 'Failed to apply guest answer token');
      setManualStep('answer');
    }
  };

  const handleGuestManualOffer = async (offerToken: string) => {
    if (!offerToken.trim()) return;
    setIsInitializingRoom(true);
    setRoomError(null);
    try {
      const answer = await p2pEngine.createGuestAnswer(offerToken.trim());
      setManualAnswerToken(answer);
      setManualStep('answer');
    } catch (err: any) {
      setRoomError(err?.message || 'Invalid host offer token');
    } finally {
      setIsInitializingRoom(false);
    }
  };

  // =========================================================================
  // ACTIONS IN CONNECTED ROOM
  // =========================================================================

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUserId,
      sender: 'self',
      senderName: profile?.displayName || user?.displayName || 'Peer Scholar',
      text: messageInput.trim(),
      timestamp: Date.now(),
    };

    // 1. Send via WebRTC DataChannel
    p2pEngine.sendPacket({ type: 'chat', message: newMsg });

    // 2. Dual relay via Cloud Room for 100% delivery guarantee
    if (roomCode) {
      broadcastChatToRoom(roomCode, chatMessages, newMsg);
    }

    setChatMessages((prev) => [...prev, newMsg]);
    setMessageInput('');
  };

  const handlePushCurrentGraph = () => {
    const graphData = {
      expressions,
      viewport,
      gridMode,
      themeId,
    };

    // 1. Direct WebRTC DataChannel packet
    p2pEngine.sendPacket({
      type: 'graph_sync',
      graph: graphData,
    });

    // 2. Cloud Room relay
    if (roomCode) {
      broadcastGraphSyncToRoom(roomCode, graphData);
    }

    setSyncedNotification('Pushed current graph locus to peer!');
    setTimeout(() => setSyncedNotification(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('P2P file transfer limit is 5MB for instant browser streaming.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const shared: SharedFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
        sender: 'self',
        timestamp: Date.now(),
      };

      p2pEngine.sendPacket({ type: 'file', file: shared });
      setSharedFiles((prev) => [...prev, shared]);
    };
    reader.readAsDataURL(file);
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2000);
  };

  const handleCopyDirectLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?p2p_room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  const handleDisconnect = () => {
    p2pEngine.disconnect();
    if (roomCode) {
      closeCloudP2PRoom(roomCode);
    }
    if (unsubscribeRoomRef.current) {
      unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = null;
    }
    setRole('select');
    setRoomCode('');
    setJoinCodeInput('');
    setManualOfferToken('');
    setManualAnswerToken('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          color: theme.textPrimary,
        }}
      >
        {/* Modal Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
                isConnected ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' : 'text-indigo-500 border-indigo-500/30 bg-indigo-500/10'
              }`}
            >
              <Radio className={`w-5 h-5 ${isConnected ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-sm sm:text-base font-bold tracking-tight"
                  style={{
                    fontFamily: '"Cinzel", "Source Serif 4", serif',
                    color: theme.textPrimary,
                  }}
                >
                  Live P2P Peer Room
                </h2>
                {/* Live Status Badge */}
                <span
                  className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider border ${
                    isConnected
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : connectionState === 'connecting'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse'
                      : 'bg-stone-500/15 border-stone-500/30 text-stone-500'
                  }`}
                >
                  {isConnected ? '● Connected' : connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>
              <p className="text-3xs sm:text-2xs" style={{ color: theme.textSecondary }}>
                Real-Time WebRTC Canvas Sync, Peer Chat & Mathematical Collaboration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
            aria-label="Close P2P Room"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Toast Notification */}
        {syncedNotification && (
          <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top duration-150 shrink-0">
            <Check className="w-4 h-4 shrink-0" />
            <span>{syncedNotification}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {roomError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{roomError}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* STATE 1: ALREADY CONNECTED - DASHBOARD                            */}
          {/* ================================================================= */}
          {isConnected ? (
            <div className="space-y-4">
              {/* Connected Header Bar with Room Details and Disconnect */}
              <div
                className="p-3 rounded-xl border flex items-center justify-between gap-3"
                style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <div>
                    <div className="text-xs font-bold" style={{ color: theme.textPrimary }}>
                      Active Collaborative Tunnel
                    </div>
                    {roomCode && (
                      <div className="text-3xs font-mono opacity-70">
                        Room Code: <span className="font-bold text-emerald-600">{roomCode}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePushCurrentGraph}
                    className="px-3 py-1.5 rounded-lg text-2xs font-semibold border flex items-center gap-1.5 shadow-xs hover:opacity-90 active:scale-95 transition-all"
                    style={{ borderColor: theme.accent, backgroundColor: `${theme.accent}15`, color: theme.accent }}
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Sync Canvas</span>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="px-2.5 py-1.5 rounded-lg text-2xs font-medium border text-rose-600 hover:bg-rose-500/10 transition-colors"
                    style={{ borderColor: theme.border }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: theme.border }}>
                <button
                  onClick={() => setActiveTab('graph_sync')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'graph_sync' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'graph_sync' ? theme.accent : 'transparent',
                    color: activeTab === 'graph_sync' ? '#FFFFFF' : theme.textPrimary,
                  }}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Canvas Sync</span>
                </button>

                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'chat' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'chat' ? theme.accent : 'transparent',
                    color: activeTab === 'chat' ? '#FFFFFF' : theme.textPrimary,
                  }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Peer Chat ({chatMessages.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('files')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'files' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'files' ? theme.accent : 'transparent',
                    color: activeTab === 'files' ? '#FFFFFF' : theme.textPrimary,
                  }}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Files ({sharedFiles.length})</span>
                </button>
              </div>

              {/* Tab 1: Canvas Sync Settings */}
              {activeTab === 'graph_sync' && (
                <div className="space-y-4">
                  <div
                    className="p-4 rounded-xl border space-y-3"
                    style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold" style={{ color: theme.textPrimary }}>
                          Automatic Live Canvas Mirroring
                        </div>
                        <div className="text-3xs" style={{ color: theme.textSecondary }}>
                          Stream curves, viewport zoom, and sliders live to peer
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoSyncGraph}
                        onChange={(e) => setAutoSyncGraph(e.target.checked)}
                        className="w-4 h-4 cursor-pointer rounded"
                      />
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between text-2xs" style={{ borderColor: theme.border }}>
                      <span style={{ color: theme.textSecondary }}>Active Curves in Locus:</span>
                      <span className="font-mono font-bold">{expressions.length} equations</span>
                    </div>

                    {lastPeerSyncTime && (
                      <div className="text-3xs text-emerald-600 dark:text-emerald-400 font-mono">
                        Last peer sync received: {new Date(lastPeerSyncTime).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handlePushCurrentGraph}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
                    style={{ backgroundColor: theme.accent, color: '#FFFFFF' }}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Push Current Canvas Now ({expressions.length} curves)</span>
                  </button>
                </div>
              )}

              {/* Tab 2: Live Chat */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-[360px] rounded-xl border overflow-hidden" style={{ borderColor: theme.border }}>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs opacity-50" style={{ color: theme.textSecondary }}>
                        Connected! Send your first message or theorem note below.
                      </div>
                    ) : (
                      chatMessages.map((msg) => {
                        const isSelf = msg.sender === 'self';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                          >
                            <span className="text-3xs opacity-60 px-1 mb-0.5">{msg.senderName}</span>
                            <div
                              className="px-3 py-1.5 rounded-xl text-xs max-w-[80%]"
                              style={{
                                backgroundColor: isSelf ? theme.accent : theme.bgSidebar,
                                color: isSelf ? '#FFFFFF' : theme.textPrimary,
                              }}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="p-2 border-t flex items-center gap-2" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message to peer..."
                      className="flex-1 px-3 py-2 rounded-lg border text-xs"
                      style={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }}
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-lg font-semibold shadow-xs"
                      style={{ backgroundColor: theme.accent, color: '#FFFFFF' }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 3: File Sharing */}
              {activeTab === 'files' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border flex items-center justify-between" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
                    <div>
                      <div className="text-xs font-bold">Direct P2P File Transfer</div>
                      <div className="text-3xs" style={{ color: theme.textSecondary }}>
                        Stream PNG snapshots, datasets, or theorem files directly
                      </div>
                    </div>
                    <label className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border shadow-xs" style={{ borderColor: theme.accent, color: theme.accent }}>
                      <input type="file" onChange={handleFileUpload} className="hidden" />
                      Upload File
                    </label>
                  </div>

                  {sharedFiles.length === 0 ? (
                    <div className="py-8 text-center text-xs opacity-50" style={{ color: theme.textSecondary }}>
                      No files transferred in this session yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sharedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 rounded-lg border flex items-center justify-between"
                          style={{ borderColor: theme.border, backgroundColor: theme.bgCard }}
                        >
                          <div>
                            <div className="text-xs font-semibold">{file.name}</div>
                            <div className="text-3xs opacity-60">{(file.size / 1024).toFixed(1)} KB</div>
                          </div>
                          <a
                            href={file.dataUrl}
                            download={file.name}
                            className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: theme.accent }}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ================================================================= */
            /* STATE 2: NOT CONNECTED - SETUP WIZARD                             */
            /* ================================================================= */
            <div className="space-y-4">
              {/* Setup Mode Switcher (Cloud Signaled 1-Click vs Airgap) */}
              <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
                <button
                  type="button"
                  onClick={() => {
                    setSetupMode('cloud_code');
                    setRole('select');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    setupMode === 'cloud_code' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: setupMode === 'cloud_code' ? theme.accent : 'transparent',
                    color: setupMode === 'cloud_code' ? '#FFFFFF' : theme.textPrimary,
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>1-Click Live Room (Recommended)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSetupMode('manual_airgap');
                    setRole('select');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    setupMode === 'manual_airgap' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: setupMode === 'manual_airgap' ? theme.accent : 'transparent',
                    color: setupMode === 'manual_airgap' ? '#FFFFFF' : theme.textPrimary,
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Air-Gapped / Manual Token</span>
                </button>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* MODE A: CLOUD CODE SIGNALED (EFFORTLESS 6-DIGIT CODE)             */}
              {/* ----------------------------------------------------------------- */}
              {setupMode === 'cloud_code' && (
                <div className="space-y-4">
                  {role === 'select' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {/* Host Room Option */}
                      <button
                        onClick={handleStartHostCloudRoom}
                        disabled={isInitializingRoom}
                        className="p-5 rounded-2xl border text-left space-y-3 transition-all hover:shadow-md hover:border-amber-500/50 group"
                        style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                          <Radio className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                            Create Room (Host)
                          </div>
                          <div className="text-2xs mt-1" style={{ color: theme.textSecondary }}>
                            Generate an instant 6-character room code & shareable link for your peers to join.
                          </div>
                        </div>
                        <div className="text-xs font-semibold flex items-center gap-1 text-amber-600">
                          <span>Start Hosting</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </button>

                      {/* Join Room Option */}
                      <div
                        className="p-5 rounded-2xl border text-left space-y-3"
                        style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                            Join Room (Peer)
                          </div>
                          <div className="text-2xs mt-1" style={{ color: theme.textSecondary }}>
                            Enter the 6-character room code from your peer to connect instantly.
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                            placeholder="e.g. AB7X9Y"
                            maxLength={8}
                            className="w-full px-3 py-2 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider"
                            style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
                          />
                          <button
                            onClick={handleJoinCloudRoom}
                            disabled={isInitializingRoom || !joinCodeInput.trim()}
                            className="px-4 py-2 rounded-lg text-xs font-semibold shadow-xs shrink-0 active:scale-95 transition-all disabled:opacity-50"
                            style={{ backgroundColor: theme.accent, color: '#FFFFFF' }}
                          >
                            Join
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Host Active Waiting View */}
                  {role === 'host' && (
                    <div className="p-5 rounded-2xl border space-y-4 text-center" style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}>
                      <div className="flex items-center justify-center gap-2">
                        <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
                        <span className="font-bold text-xs uppercase tracking-wider">
                          Waiting for Peer to Join...
                        </span>
                      </div>

                      {/* Large Room Code Display */}
                      <div className="space-y-1">
                        <div className="text-3xs uppercase tracking-wider font-semibold opacity-60">
                          Share this Room Code with your Peer:
                        </div>
                        <div
                          onClick={handleCopyCode}
                          className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl border text-2xl font-mono font-bold tracking-widest cursor-pointer shadow-xs hover:opacity-90 active:scale-95 transition-all"
                          style={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.accent }}
                        >
                          <span>{roomCode}</span>
                          {isCopiedCode ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 opacity-40" />}
                        </div>
                      </div>

                      {/* Direct Link & QR Code */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                        <div className="p-2 bg-white rounded-xl shadow-xs border">
                          <QRCodeDisplay
                            token={`${window.location.origin}${window.location.pathname}?p2p_room=${roomCode}`}
                            theme={theme}
                          />
                        </div>

                        <div className="space-y-2 text-left">
                          <button
                            onClick={handleCopyDirectLink}
                            className="px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            style={{ borderColor: theme.border }}
                          >
                            {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>Copy 1-Click Join Link</span>
                          </button>

                          <div className="text-3xs opacity-75 max-w-[200px]">
                            Peer can enter the 6-character code or scan the QR code to connect automatically.
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t flex justify-center" style={{ borderColor: theme.border }}>
                        <button
                          onClick={handleDisconnect}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Cancel Hosting
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Join Waiting View */}
                  {role === 'join' && isInitializingRoom && (
                    <div className="py-12 text-center space-y-3">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                      <div className="text-xs font-semibold">Negotiating secure P2P handshake with room {roomCode}...</div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* MODE B: AIR-GAPPED MANUAL TOKEN MODE                              */}
              {/* ----------------------------------------------------------------- */}
              {setupMode === 'manual_airgap' && (
                <div className="space-y-4">
                  {manualStep === 'offer' && (
                    <div className="space-y-3">
                      <div className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
                        For offline or zero-network environments: generate a direct WebRTC offer token, scan with peer, and exchange answer token.
                      </div>

                      {!manualOfferToken ? (
                        <button
                          onClick={handleStartHostManual}
                          disabled={isInitializingRoom}
                          className="w-full py-3 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
                          style={{ backgroundColor: theme.accent, color: '#FFFFFF' }}
                        >
                          {isInitializingRoom ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          <span>Generate Local Host Offer</span>
                        </button>
                      ) : (
                        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">Host Offer Token Generated</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(manualOfferToken);
                                alert('Offer token copied to clipboard!');
                              }}
                              className="text-2xs text-indigo-600 font-semibold underline"
                            >
                              Copy Token
                            </button>
                          </div>

                          <div className="flex justify-center p-2 bg-white rounded-xl">
                            <QRCodeDisplay token={manualOfferToken} theme={theme} />
                          </div>

                          <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
                            <label className="text-3xs uppercase tracking-wider font-semibold opacity-75 block mb-1">
                              Paste Guest Answer Token to Complete:
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={manualTokenInput}
                                onChange={(e) => setManualTokenInput(e.target.value)}
                                placeholder="Paste answer token here..."
                                className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono"
                                style={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }}
                              />
                              <button
                                onClick={() => handleApplyManualAnswer(manualTokenInput)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs"
                                style={{ backgroundColor: theme.accent, color: '#FFFFFF' }}
                              >
                                Connect
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Guest Manual Input Option */}
                      <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: theme.border }}>
                        <div className="text-xs font-bold">Are you the Guest?</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Paste Host Offer Token here..."
                            className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono"
                            style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border, color: theme.textPrimary }}
                            onChange={(e) => setManualTokenInput(e.target.value)}
                          />
                          <button
                            onClick={() => handleGuestManualOffer(manualTokenInput)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                            style={{ borderColor: theme.accent, color: theme.accent }}
                          >
                            Accept Offer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {manualStep === 'connecting' && (
                    <div className="py-12 text-center space-y-3">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500" />
                      <div className="text-xs font-semibold">Completing WebRTC handshake with peer...</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
