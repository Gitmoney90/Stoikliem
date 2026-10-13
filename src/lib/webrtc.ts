/**
 * Serverless Zero-Backend Peer-to-Peer WebRTC Engine
 * Uses browser-native RTCPeerConnection, RTCDataChannel, and QR code signaling.
 */

import { GraphExpression, Viewport, GridMode, ThemeId } from '../types/graph';

export type P2PConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface ChatMessage {
  id: string;
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
  ],
};

/**
 * Compact encoding for SDP tokens to keep QR code density scan-friendly
 */
export function encodeSignalToken(data: { type: 'offer' | 'answer'; sdp: string }): string {
  try {
    const json = JSON.stringify(data);
    // Base64 encode safe for URL and QR
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return btoa(JSON.stringify(data));
  }
}

export function decodeSignalToken(token: string): { type: 'offer' | 'answer'; sdp: string } {
  const trimmed = token.trim();
  let decodedStr: string;
  try {
    decodedStr = decodeURIComponent(escape(atob(trimmed)));
  } catch {
    decodedStr = atob(trimmed);
  }
  const parsed = JSON.parse(decodedStr);
  if (!parsed || !parsed.type || !parsed.sdp) {
    throw new Error('Invalid signaling token format');
  }
  return parsed;
}

/**
 * Waits for ICE candidates gathering to finish so the SDP contains complete connectivity data.
 */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 3500): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      resolve();
    }, timeoutMs);

    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };

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

  private setState(newState: P2PConnectionState) {
    this.state = newState;
    if (this.onStateChange) this.onStateChange(newState);
  }

  private setupDataChannel(dc: RTCDataChannel) {
    this.channel = dc;

    dc.onopen = () => {
      this.setState('connected');
    };

    dc.onclose = () => {
      this.setState('disconnected');
    };

    dc.onerror = () => {
      this.setState('failed');
    };

    dc.onmessage = (event) => {
      try {
        const packet: P2PDataPacket = JSON.parse(event.data);
        if (this.onPacketReceived) this.onPacketReceived(packet);
      } catch (err) {
        console.error('P2P message parsing failed', err);
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

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      if (this.pc.connectionState === 'connected') {
        this.setState('connected');
      } else if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') {
        this.setState('disconnected');
      }
    };

    // Create Data Channel
    const dc = this.pc.createDataChannel('principia-p2p', {
      ordered: true,
    });
    this.setupDataChannel(dc);

    // Create Offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Gather all local ICE candidates into the SDP
    await waitForIceGathering(this.pc);

    if (!this.pc.localDescription) {
      throw new Error('Failed to create local offer description');
    }

    return encodeSignalToken({
      type: 'offer',
      sdp: this.pc.localDescription.sdp,
    });
  }

  /**
   * Host completes handshake by applying the Guest's Answer token
   */
  public async applyGuestAnswer(answerToken: string): Promise<void> {
    if (!this.pc) throw new Error('Host connection not initialized');
    const { type, sdp } = decodeSignalToken(answerToken);
    if (type !== 'answer') {
      throw new Error('Expected answer token, received: ' + type);
    }
    await this.pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
  }

  /**
   * Guest Room: Accepts Host's Offer token and returns Answer token
   */
  public async createGuestAnswer(hostOfferToken: string): Promise<string> {
    this.disconnect();
    this.setState('connecting');

    const { type, sdp } = decodeSignalToken(hostOfferToken);
    if (type !== 'offer') {
      throw new Error('Expected offer token, received: ' + type);
    }

    this.pc = new RTCPeerConnection(ICE_SERVERS);

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      if (this.pc.connectionState === 'connected') {
        this.setState('connected');
      } else if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') {
        this.setState('disconnected');
      }
    };

    this.pc.ondatachannel = (e) => {
      this.setupDataChannel(e.channel);
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Wait for ICE gathering
    await waitForIceGathering(this.pc);

    if (!this.pc.localDescription) {
      throw new Error('Failed to create local answer description');
    }

    return encodeSignalToken({
      type: 'answer',
      sdp: this.pc.localDescription.sdp,
    });
  }

  /**
   * Sends packet over RTCDataChannel
   */
  public sendPacket(packet: P2PDataPacket): boolean {
    if (!this.channel || this.channel.readyState !== 'open') {
      return false;
    }
    this.channel.send(JSON.stringify(packet));
    return true;
  }

  /**
   * Closes connection
   */
  public disconnect() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.setState('disconnected');
  }
}
