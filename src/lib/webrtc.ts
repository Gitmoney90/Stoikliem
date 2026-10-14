/**
 * Serverless & Cloud-Signaled Peer-to-Peer WebRTC Engine for Principia Graphica
 * Supports both automatic 1-click Cloud Signaling (via 6-char Room Codes)
 * and Air-Gapped Manual QR/Token Handshake.
 */

import { GraphExpression, Viewport, GridMode, ThemeId } from '../types/graph';

export type P2PConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface ChatMessage {
  id: string;
  senderId?: string;
  sender: 'self' | 'peer';
  senderName: string;
  text: string;
  timestamp: number;
}

export interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  sender: 'self' | 'peer';
  timestamp: number;
}

export type P2PDataPacket =
  | { type: 'chat'; message: ChatMessage }
  | { type: 'file'; file: SharedFile }
  | {
      type: 'graph_sync';
      graph: {
        expressions: GraphExpression[];
        viewport: Viewport;
        gridMode: GridMode;
        themeId: ThemeId;
      };
    }
  | { type: 'ping'; time: number }
  | { type: 'pong'; time: number };

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

export interface SignalPayload {
  type: 'offer' | 'answer';
  sdp: string;
  candidates?: RTCIceCandidateInit[];
}

/**
 * Robust, client-safe base64 string encoder using TextEncoder
 */
export function encodeSignalToken(data: SignalPayload): string {
  try {
    const json = JSON.stringify(data);
    const bin = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bin.length; i++) {
      binary += String.fromCharCode(bin[i]);
    }
    return btoa(binary);
  } catch {
    return btoa(JSON.stringify(data));
  }
}

/**
 * Robust signal token decoder
 */
export function decodeSignalToken(token: string): SignalPayload {
  const trimmed = token.trim();
  try {
    const binary = atob(trimmed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decodedStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(decodedStr);
    if (!parsed || !parsed.type || !parsed.sdp) {
      throw new Error('Invalid signaling token');
    }
    return parsed;
  } catch {
    // Fallback direct JSON parse in case raw JSON was pasted
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.type && parsed?.sdp) return parsed;
    } catch {}
    throw new Error('Could not parse token. Ensure the complete string was copied.');
  }
}

/**
 * Waits for ICE candidates gathering to produce usable connectivity candidates.
 */
function waitForIceGathering(
  pc: RTCPeerConnection,
  collectedCandidates: RTCIceCandidateInit[],
  timeoutMs = 2600
): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    let finished = false;
    const cleanupAndResolve = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      pc.removeEventListener('icecandidate', onCandidate);
      pc.removeEventListener('icegatheringstatechange', checkState);
      resolve();
    };

    const timer = setTimeout(cleanupAndResolve, timeoutMs);

    const onCandidate = (e: RTCPeerConnectionIceEvent) => {
      if (e.candidate) {
        collectedCandidates.push(e.candidate.toJSON());
        // If gathering has collected multiple candidates, resolve after brief grace period
        if (collectedCandidates.length >= 4) {
          setTimeout(cleanupAndResolve, 300);
        }
      }
    };

    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        cleanupAndResolve();
      }
    };

    pc.addEventListener('icecandidate', onCandidate);
    pc.addEventListener('icegatheringstatechange', checkState);
  });
}

export class P2PEngine {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private state: P2PConnectionState = 'disconnected';

  public onStateChange?: (state: P2PConnectionState) => void;
  public onPacketReceived?: (packet: P2PDataPacket) => void;

  constructor() {}

  public getState(): P2PConnectionState {
    return this.state;
  }

  public setState(newState: P2PConnectionState) {
    if (this.state === newState) return;
    this.state = newState;
    if (this.onStateChange) this.onStateChange(newState);
  }

  private setupDataChannel(dc: RTCDataChannel) {
    this.channel = dc;

    dc.onopen = () => {
      this.setState('connected');
    };

    dc.onclose = () => {
      if (this.state === 'connected') {
        this.setState('disconnected');
      }
    };

    dc.onerror = () => {
      if (this.state === 'connected') {
        this.setState('failed');
      }
    };

    dc.onmessage = (event) => {
      try {
        const packet: P2PDataPacket = JSON.parse(event.data);
        if (this.onPacketReceived) this.onPacketReceived(packet);
      } catch (err) {
        console.warn('P2P message parsing warning:', err);
      }
    };
  }

  private attachPeerListeners(pc: RTCPeerConnection) {
    // 1. Connection state change
    pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const cs = this.pc.connectionState;
      if (cs === 'connected') {
        this.setState('connected');
      } else if (cs === 'failed') {
        // Only set failed if ice isn't connected
        if (this.pc.iceConnectionState !== 'connected' && this.pc.iceConnectionState !== 'completed') {
          this.setState('failed');
        }
      } else if (cs === 'closed') {
        this.setState('disconnected');
      }
    };

    // 2. ICE connection state change (often triggers faster than connectionState)
    pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      const ics = this.pc.iceConnectionState;
      if (ics === 'connected' || ics === 'completed') {
        this.setState('connected');
      } else if (ics === 'failed') {
        if (this.state !== 'connected') {
          this.setState('failed');
        }
      } else if (ics === 'disconnected') {
        this.setState('disconnected');
      }
    };
  }

  /**
   * Host Room: Creates Offer and returns full signal token (Offer + ICE candidates)
   */
  public async createHostOffer(): Promise<string> {
    this.disconnect();
    this.setState('connecting');

    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.attachPeerListeners(this.pc);

    // Create Data Channel
    const dc = this.pc.createDataChannel('principia-p2p', {
      ordered: true,
    });
    this.setupDataChannel(dc);

    // Create Offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Gather local ICE candidates
    const collectedCandidates: RTCIceCandidateInit[] = [];
    await waitForIceGathering(this.pc, collectedCandidates);

    if (!this.pc.localDescription) {
      throw new Error('Failed to create local offer description');
    }

    return encodeSignalToken({
      type: 'offer',
      sdp: this.pc.localDescription.sdp,
      candidates: collectedCandidates,
    });
  }

  /**
   * Host completes handshake by applying the Guest's Answer token
   */
  public async applyGuestAnswer(answerToken: string): Promise<void> {
    if (!this.pc) throw new Error('Host connection not initialized');
    const { type, sdp, candidates } = decodeSignalToken(answerToken);
    if (type !== 'answer') {
      throw new Error('Expected answer token, received: ' + type);
    }
    await this.pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));

    if (candidates && candidates.length > 0) {
      for (const cand of candidates) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {
          // non-fatal if candidate already embedded in sdp
        }
      }
    }
  }

  /**
   * Guest Room: Accepts Host's Offer token and returns Answer token
   */
  public async createGuestAnswer(hostOfferToken: string): Promise<string> {
    this.disconnect();
    this.setState('connecting');

    const { type, sdp, candidates } = decodeSignalToken(hostOfferToken);
    if (type !== 'offer') {
      throw new Error('Expected offer token, received: ' + type);
    }

    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.attachPeerListeners(this.pc);

    this.pc.ondatachannel = (e) => {
      this.setupDataChannel(e.channel);
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));

    if (candidates && candidates.length > 0) {
      for (const cand of candidates) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {
          // ignore
        }
      }
    }

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Wait for ICE gathering
    const collectedCandidates: RTCIceCandidateInit[] = [];
    await waitForIceGathering(this.pc, collectedCandidates);

    if (!this.pc.localDescription) {
      throw new Error('Failed to create local answer description');
    }

    return encodeSignalToken({
      type: 'answer',
      sdp: this.pc.localDescription.sdp,
      candidates: collectedCandidates,
    });
  }

  /**
   * Sends packet over RTCDataChannel
   */
  public sendPacket(packet: P2PDataPacket): boolean {
    if (!this.channel || this.channel.readyState !== 'open') {
      return false;
    }
    try {
      this.channel.send(JSON.stringify(packet));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Closes connection
   */
  public disconnect() {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {}
      this.channel = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }
    this.setState('disconnected');
  }
}
