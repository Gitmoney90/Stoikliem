import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ChatMessage } from './webrtc';
import { GraphExpression, Viewport, GridMode, ThemeId } from '../types/graph';

export interface P2PRoomData {
  roomCode: string;
  status: 'waiting' | 'connected' | 'closed';
  hostOffer?: string;
  guestAnswer?: string;
  graphSyncJson?: string;
  chatMessagesJson?: string;
  createdAt?: any;
  updatedAt?: any;
}

export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Creates a new P2P room with the host's WebRTC offer
 */
export async function createCloudP2PRoom(roomCode: string, hostOffer: string): Promise<void> {
  const docRef = doc(db, 'p2p_rooms', roomCode.toUpperCase());
  try {
    await setDoc(docRef, {
      roomCode: roomCode.toUpperCase(),
      status: 'waiting',
      hostOffer,
      chatMessagesJson: JSON.stringify([]),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `p2p_rooms/${roomCode}`);
    throw err;
  }
}

/**
 * Guest joins the room: reads host offer, writes guest answer
 */
export async function joinCloudP2PRoom(roomCode: string, guestAnswer: string): Promise<P2PRoomData> {
  const code = roomCode.trim().toUpperCase();
  const docRef = doc(db, 'p2p_rooms', code);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Room "${code}" not found. Please check the 6-character room code.`);
    }

    const data = snap.data() as P2PRoomData;
    if (!data.hostOffer) {
      throw new Error(`Room "${code}" is missing host signaling data.`);
    }

    await updateDoc(docRef, {
      guestAnswer,
      status: 'connected',
      updatedAt: serverTimestamp(),
    });

    return { ...data, guestAnswer, status: 'connected' };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `p2p_rooms/${code}`);
    throw err;
  }
}

/**
 * Fetches current room data once (e.g. for guest to get hostOffer)
 */
export async function getCloudP2PRoom(roomCode: string): Promise<P2PRoomData | null> {
  const code = roomCode.trim().toUpperCase();
  const docRef = doc(db, 'p2p_rooms', code);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as P2PRoomData;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `p2p_rooms/${code}`);
    return null;
  }
}

/**
 * Subscribes to real-time room updates (answers, chat, graph sync)
 */
export function subscribeToP2PRoom(
  roomCode: string,
  onUpdate: (data: P2PRoomData) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const code = roomCode.trim().toUpperCase();
  const docRef = doc(db, 'p2p_rooms', code);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as P2PRoomData);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `p2p_rooms/${code}`);
      if (onError) onError(err);
    }
  );
}

/**
 * Relays graph synchronization through the room document for dual-channel reliability
 */
export async function broadcastGraphSyncToRoom(
  roomCode: string,
  graph: {
    expressions: GraphExpression[];
    viewport: Viewport;
    gridMode: GridMode;
    themeId: ThemeId;
  }
): Promise<void> {
  const code = roomCode.trim().toUpperCase();
  const docRef = doc(db, 'p2p_rooms', code);
  try {
    await updateDoc(docRef, {
      graphSyncJson: JSON.stringify(graph),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-fatal if WebRTC channel is active
  }
}

/**
 * Relays chat messages through the room document
 */
export async function broadcastChatToRoom(
  roomCode: string,
  currentMessages: ChatMessage[],
  newMsg: ChatMessage
): Promise<void> {
  const code = roomCode.trim().toUpperCase();
  const docRef = doc(db, 'p2p_rooms', code);
  const updated = [...currentMessages.slice(-25), newMsg];
  try {
    await updateDoc(docRef, {
      chatMessagesJson: JSON.stringify(updated),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-fatal if WebRTC channel is active
  }
}

/**
 * Closes the room when the host leaves
 */
export async function closeCloudP2PRoom(roomCode: string): Promise<void> {
  const code = roomCode.trim().toUpperCase();
  const docRef = doc(db, 'p2p_rooms', code);
  try {
    await deleteDoc(docRef);
  } catch {
    // Ignore cleanup errors
  }
}
