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

type ModalTab = 'chat' | 'files' | 'graph_sync';

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
  // Wizard state: 'select' | 'host_offer' | 'host_scan_answer' | 'join_scan' | 'join_answer' | 'connected'
  const [wizardStep, setWizardStep] = useState<
    'select' | 'host_offer' | 'host_scan_answer' | 'join_scan' | 'join_answer'
  >('select');

  // Signaling tokens
  const [hostOfferToken, setHostOfferToken] = useState<string>('');
  const [guestAnswerToken, setGuestAnswerToken] = useState<string>('');
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Connected state tabs
  const [activeTab, setActiveTab] = useState<ModalTab>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [autoSyncGraph, setAutoSyncGraph] = useState(false);
  const [syncedNotification, setSyncedNotification] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Handle incoming packets
  useEffect(() => {
    p2pEngine.onPacketReceived = (packet: P2PDataPacket) => {
      if (packet.type === 'chat') {
        setChatMessages((prev) => [
          ...prev,
          { ...packet.message, sender: 'peer' },
        ]);
      } else if (packet.type === 'file') {
        setSharedFiles((prev) => [
          ...prev,
          { ...packet.file, sender: 'peer' },
        ]);
        setSyncedNotification(`Received file: ${packet.file.name}`);
        setTimeout(() => setSyncedNotification(null), 4000);
      } else if (packet.type === 'graph_sync') {
        onLoadSyncedGraph(packet.graph);
        setSyncedNotification('Peer synchronized their mathematical canvas!');
        setTimeout(() => setSyncedNotification(null), 4000);
      }
    };
  }, [p2pEngine, onLoadSyncedGraph]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!isOpen) return null;

  // --- HOST FLOW ---
  const startHostRoom = async () => {
    setIsGenerating(true);
    setTokenError(null);
    setWizardStep('host_offer');
    try {
      const offer = await p2pEngine.createHostOffer();
      setHostOfferToken(offer);
    } catch (err: any) {
      setTokenError(err.message || 'Failed to initialize Host room offer');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyAnswerToken = async (token: string) => {
    setTokenError(null);
    try {
      await p2pEngine.applyGuestAnswer(token);
    } catch (err: any) {
      setTokenError(err.message || 'Invalid or incompatible answer token');
    }
  };

  // --- JOIN FLOW ---
  const handleHostOfferScanned = async (offerToken: string) => {
    setIsGenerating(true);
    setTokenError(null);
    try {
      const answer = await p2pEngine.createGuestAnswer(offerToken);
      setGuestAnswerToken(answer);
      setWizardStep('join_answer');
    } catch (err: any) {
      setTokenError(err.message || 'Failed to process host offer token');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- CONNECTED FEATURES ---
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      sender: 'self',
      senderName: 'You',
      text: messageInput.trim(),
      timestamp: Date.now(),
    };

    const sent = p2pEngine.sendPacket({ type: 'chat', message: newMsg });
    if (sent) {
      setChatMessages((prev) => [...prev, newMsg]);
      setMessageInput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('P2P direct transfer limit is 8 MB for real-time responsiveness.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const shared: SharedFile = {
        id: `file_${Date.now()}_${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
        sender: 'self',
        timestamp: Date.now(),
      };

      const sent = p2pEngine.sendPacket({ type: 'file', file: shared });
      if (sent) {
        setSharedFiles((prev) => [...prev, shared]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePushCurrentGraph = () => {
    const sent = p2pEngine.sendPacket({
      type: 'graph_sync',
      graph: {
        expressions,
        viewport,
        gridMode,
        themeId,
      },
    });
    if (sent) {
      setSyncedNotification('Pushed current graph to peer successfully!');
      setTimeout(() => setSyncedNotification(null), 3000);
    }
  };

  const isConnected = connectionState === 'connected';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
        }}
      >
        {/* Top Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5" style={{ color: theme.accent }} />
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-base font-bold tracking-tight"
                  style={{
                    fontFamily: '"Cinzel", "Source Serif 4", serif',
                    color: theme.textPrimary,
                  }}
                >
                  Zero-Backend P2P Room
                </h2>
                {/* Live Status Pill */}
                <div
                  className={`px-2 py-0.5 rounded-full text-2xs font-semibold flex items-center gap-1.5 ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                      : connectionState === 'connecting'
                      ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30 animate-pulse'
                      : 'bg-stone-500/15 text-stone-500 border border-stone-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected
                        ? 'bg-emerald-500 animate-ping'
                        : connectionState === 'connecting'
                        ? 'bg-amber-500'
                        : 'bg-stone-400'
                    }`}
                  />
                  <span className="capitalize">{connectionState}</span>
                </div>
              </div>
              <p className="text-2xs" style={{ color: theme.textSecondary }}>
                Direct WebRTC browser-to-browser tunnel via QR signaling · 100% Client-Side
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Toast Notification */}
        {syncedNotification && (
          <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top">
            <Check className="w-4 h-4" />
            <span>{syncedNotification}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs font-sans">
          {tokenError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{tokenError}</span>
            </div>
          )}

          {/* ================= CONNECTED ROOM DASHBOARD ================= */}
          {isConnected ? (
            <div className="flex flex-col h-[520px]">
              {/* Connected Room Navigation Tabs */}
              <div
                className="flex items-center justify-between border-b pb-2 mb-4 shrink-0"
                style={{ borderColor: theme.border }}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                      activeTab === 'chat' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: activeTab === 'chat' ? theme.accent : 'transparent',
                      color: activeTab === 'chat' ? '#FFFFFF' : theme.textPrimary,
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Live Chat ({chatMessages.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('files')}
                    className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                      activeTab === 'files' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: activeTab === 'files' ? theme.accent : 'transparent',
                      color: activeTab === 'files' ? '#FFFFFF' : theme.textPrimary,
                    }}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Files & Notes ({sharedFiles.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('graph_sync')}
                    className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                      activeTab === 'graph_sync' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: activeTab === 'graph_sync' ? theme.accent : 'transparent',
                      color: activeTab === 'graph_sync' ? '#FFFFFF' : theme.textPrimary,
                    }}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Live Graph Sync</span>
                  </button>
                </div>

                <button
                  onClick={() => p2pEngine.disconnect()}
                  className="px-2.5 py-1 text-2xs font-semibold rounded-md border border-rose-500/30 text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* TAB 1: LIVE CHAT */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div
                    className="flex-1 overflow-y-auto p-3 rounded-xl border space-y-2.5 mb-3"
                    style={{
                      backgroundColor: theme.bgSidebar,
                      borderColor: theme.border,
                    }}
                  >
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                        <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
                        <p className="font-semibold">P2P Encrypted Data Tunnel Ready</p>
                        <p className="text-2xs">Send live messages directly between devices with zero intermediaries.</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.sender === 'self' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                              msg.sender === 'self'
                                ? 'bg-amber-700 text-white rounded-br-xs'
                                : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border shadow-2xs rounded-bl-xs'
                            }`}
                            style={{
                              borderColor: msg.sender === 'self' ? undefined : theme.border,
                            }}
                          >
                            <div className="text-2xs opacity-75 font-mono mb-0.5">
                              {msg.sender === 'self' ? 'You' : 'Peer'} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <p className="break-words font-sans">{msg.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a mathematical message..."
                      className="flex-1 px-3 py-2 rounded-xl border text-xs"
                      style={{
                        backgroundColor: theme.bgSidebar,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
                      className="px-4 py-2 rounded-xl font-semibold shadow-xs hover:opacity-90 transition-transform active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
                      style={{
                        backgroundColor: theme.textPrimary,
                        color: theme.bgCanvas,
                      }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: FILES & DIRECT NOTES */}
              {activeTab === 'files' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                  <div className="p-3 rounded-xl border flex items-center justify-between" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
                    <div>
                      <h4 className="font-semibold text-xs" style={{ color: theme.textPrimary }}>Direct Device-to-Device File Transfer</h4>
                      <p className="text-2xs" style={{ color: theme.textMuted }}>Streams files chunk-by-chunk through WebRTC RTCDataChannel (Max 8 MB)</p>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg font-semibold text-xs border shadow-2xs hover:opacity-90 flex items-center gap-1.5" style={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }}>
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Choose File</span>
                      <input type="file" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {sharedFiles.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-stone-400 border rounded-xl border-dashed" style={{ borderColor: theme.border }}>
                        <FileText className="w-8 h-8 opacity-30 mb-2" />
                        <p className="font-semibold">No files transferred yet</p>
                        <p className="text-2xs">Choose any file to stream directly to the connected device.</p>
                      </div>
                    ) : (
                      sharedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 rounded-xl border flex items-center justify-between"
                          style={{ borderColor: theme.border, backgroundColor: theme.bgCard }}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-semibold text-xs truncate block" style={{ color: theme.textPrimary }}>
                                {file.name}
                              </span>
                              <span className="text-2xs" style={{ color: theme.textMuted }}>
                                {(file.size / 1024).toFixed(1)} KB · {file.sender === 'self' ? 'Sent by you' : 'Received from peer'}
                              </span>
                            </div>
                          </div>
                          <a
                            href={file.dataUrl}
                            download={file.name}
                            className="px-3 py-1.5 rounded-lg border text-2xs font-semibold flex items-center gap-1 hover:bg-black/5 transition-colors shrink-0"
                            style={{ borderColor: theme.border, color: theme.textPrimary }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: LIVE GRAPH SYNC */}
              {activeTab === 'graph_sync' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-xs" style={{ color: theme.textPrimary }}>Mathematical Canvas Synchronization</h4>
                        <p className="text-2xs" style={{ color: theme.textMuted }}>Push your current equations, parameters, and view window to your peer</p>
                      </div>
                      <button
                        onClick={handlePushCurrentGraph}
                        className="px-4 py-2 rounded-xl font-semibold shadow-xs hover:opacity-90 transition-transform active:scale-95 flex items-center gap-2"
                        style={{ backgroundColor: theme.textPrimary, color: theme.bgCanvas }}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Push Graph Now</span>
                      </button>
                    </div>

                    <div className="p-3 rounded-lg border bg-black/5 dark:bg-white/5 space-y-1 font-mono text-2xs" style={{ borderColor: theme.border }}>
                      <span className="font-semibold block uppercase tracking-wider text-amber-700">Payload to be synced:</span>
                      <div>Equations count: {expressions.length} ({expressions.filter((e) => e.visible).length} visible)</div>
                      <div>Window bounds: [{viewport.xMin.toFixed(1)}, {viewport.xMax.toFixed(1)}] × [{viewport.yMin.toFixed(1)}, {viewport.yMax.toFixed(1)}]</div>
                      <div>Cartography: {gridMode} · Theme: {themeId}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ================= SIGNALING WIZARD (HOST / JOIN) ================= */
            <div>
              {/* STEP 0: SELECTION SCREEN */}
              {wizardStep === 'select' && (
                <div className="space-y-6 py-2">
                  <div className="text-center max-w-md mx-auto space-y-1.5">
                    <h3 className="font-bold text-sm tracking-tight" style={{ color: theme.textPrimary }}>
                      Choose How to Establish the P2P Tunnel
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
                      Zero backend servers. WebRTC signaling occurs directly device-to-device through QR codes or token exchange.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Host Card */}
                    <div
                      onClick={startHostRoom}
                      className="p-5 rounded-2xl border cursor-pointer group transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between"
                      style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center mb-3">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm mb-1 group-hover:text-amber-700 transition-colors" style={{ color: theme.textPrimary }}>
                          Host Room (Generate QR)
                        </h4>
                        <p className="text-2xs leading-relaxed" style={{ color: theme.textSecondary }}>
                          Your browser creates an encrypted WebRTC offer. Displays a QR code on screen for your peer to scan.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t flex items-center justify-between font-semibold text-xs group-hover:text-amber-700" style={{ borderColor: theme.border, color: theme.textPrimary }}>
                        <span>Initialize Host</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Join Card */}
                    <div
                      onClick={() => setWizardStep('join_scan')}
                      className="p-5 rounded-2xl border cursor-pointer group transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between"
                      style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-sky-600/10 text-sky-700 flex items-center justify-center mb-3">
                          <Camera className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm mb-1 group-hover:text-sky-700 transition-colors" style={{ color: theme.textPrimary }}>
                          Join Room (Scan QR)
                        </h4>
                        <p className="text-2xs leading-relaxed" style={{ color: theme.textSecondary }}>
                          Use your camera to scan the Host's QR code (or paste the Offer token) to establish the direct connection.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t flex items-center justify-between font-semibold text-xs group-hover:text-sky-700" style={{ borderColor: theme.border, color: theme.textPrimary }}>
                        <span>Open Scanner</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1A: HOST OFFER SCREEN */}
              {wizardStep === 'host_offer' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                      Step 1 of 2: Host Offer QR Code
                    </span>
                    <button
                      onClick={() => setWizardStep('select')}
                      className="text-2xs underline"
                      style={{ color: theme.textMuted }}
                    >
                      Back to options
                    </button>
                  </div>

                  {isGenerating ? (
                    <div className="py-16 text-center text-xs space-y-2" style={{ color: theme.textMuted }}>
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600" />
                      <p>Gathering STUN candidates & generating encrypted Offer...</p>
                    </div>
                  ) : (
                    <>
                      <QRCodeDisplay
                        token={hostOfferToken}
                        theme={theme}
                        subtitle="Have your peer click 'Join Room' on their device and scan this QR code."
                      />

                      {/* Next: Enter Answer from Guest */}
                      <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                            Step 2: Apply Peer's Answer Token or Scan Answer QR
                          </h5>
                          <button
                            onClick={() => setWizardStep('host_scan_answer')}
                            className="px-2.5 py-1 text-2xs font-semibold rounded-lg border flex items-center gap-1 hover:opacity-80"
                            style={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Scan Answer QR</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={manualTokenInput}
                            onChange={(e) => setManualTokenInput(e.target.value)}
                            placeholder="Paste Peer's Answer Token here..."
                            className="flex-1 px-3 py-1.5 rounded-lg border font-mono text-2xs"
                            style={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }}
                          />
                          <button
                            onClick={() => applyAnswerToken(manualTokenInput)}
                            disabled={!manualTokenInput.trim()}
                            className="px-4 py-1.5 rounded-lg font-semibold shadow-xs disabled:opacity-40"
                            style={{ backgroundColor: theme.textPrimary, color: theme.bgCanvas }}
                          >
                            Connect
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 1B: HOST SCANS GUEST'S ANSWER QR */}
              {wizardStep === 'host_scan_answer' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                      Scan Peer's Answer QR Code
                    </span>
                    <button
                      onClick={() => setWizardStep('host_offer')}
                      className="text-2xs underline"
                      style={{ color: theme.textMuted }}
                    >
                      Back to Offer QR
                    </button>
                  </div>

                  <QRScanner
                    theme={theme}
                    onScan={(scannedToken) => {
                      applyAnswerToken(scannedToken);
                    }}
                  />
                </div>
              )}

              {/* STEP 2A: GUEST SCANS HOST OFFER */}
              {wizardStep === 'join_scan' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                      Step 1 of 2: Scan Host's Offer QR Code
                    </span>
                    <button
                      onClick={() => setWizardStep('select')}
                      className="text-2xs underline"
                      style={{ color: theme.textMuted }}
                    >
                      Back to options
                    </button>
                  </div>

                  <QRScanner
                    theme={theme}
                    onScan={(scannedOffer) => {
                      handleHostOfferScanned(scannedOffer);
                    }}
                  />

                  {/* Manual paste option */}
                  <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: theme.border, backgroundColor: theme.bgSidebar }}>
                    <span className="font-semibold text-2xs block" style={{ color: theme.textMuted }}>
                      Or paste Host Offer Token manually:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={manualTokenInput}
                        onChange={(e) => setManualTokenInput(e.target.value)}
                        placeholder="Paste Offer Token here..."
                        className="flex-1 px-3 py-1.5 rounded-lg border font-mono text-2xs"
                        style={{ backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }}
                      />
                      <button
                        onClick={() => handleHostOfferScanned(manualTokenInput)}
                        disabled={!manualTokenInput.trim()}
                        className="px-4 py-1.5 rounded-lg font-semibold shadow-xs disabled:opacity-40"
                        style={{ backgroundColor: theme.textPrimary, color: theme.bgCanvas }}
                      >
                        Generate Answer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2B: GUEST SHOWS ANSWER QR TO HOST */}
              {wizardStep === 'join_answer' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>
                      Step 2 of 2: Answer QR Code Generated
                    </span>
                    <button
                      onClick={() => setWizardStep('join_scan')}
                      className="text-2xs underline"
                      style={{ color: theme.textMuted }}
                    >
                      Scan different Offer
                    </button>
                  </div>

                  {isGenerating ? (
                    <div className="py-16 text-center text-xs space-y-2" style={{ color: theme.textMuted }}>
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600" />
                      <p>Generating WebRTC Answer description...</p>
                    </div>
                  ) : (
                    <QRCodeDisplay
                      token={guestAnswerToken}
                      theme={theme}
                      title="Show this Answer QR back to the Host"
                      subtitle="Once the Host scans or pastes this Answer token, the encrypted P2P tunnel will immediately open!"
                    />
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
