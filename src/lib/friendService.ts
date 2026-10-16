import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ChatMessage } from './webrtc';
import { GraphExpression, Viewport, GridMode, ThemeId } from '../types/graph';

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Name: string;
  user2Name: string;
  user1Avatar?: string;
  user2Avatar?: string;
  status: 'pending' | 'accepted' | 'declined';
  initiatedBy: string;
  createdAt?: any;
  updatedAt?: any;
}

export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self';

export interface DirectP2PSessionData {
  sessionId: string;
  participants: string[];
  activeHost?: string;
  hostOffer?: string;
  guestAnswer?: string;
  graphSyncJson?: string;
  chatMessagesJson?: string;
  status: 'active' | 'calling' | 'ended';
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Computes deterministic direct session ID for two users (order-independent)
 */
export function getDirectSessionId(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort();
  return `direct_${sorted[0]}_${sorted[1]}`;
}

/**
 * Computes deterministic friendship document ID for two users
 */
export function getFriendshipId(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort();
  return `fr_${sorted[0]}_${sorted[1]}`;
}

/**
 * Gets friendship status between two users
 */
export async function getFriendStatus(myUid: string, targetUid: string): Promise<{ status: FriendStatus; friendship?: Friendship }> {
  if (myUid === targetUid) {
    return { status: 'self' };
  }

  const friendshipId = getFriendshipId(myUid, targetUid);
  try {
    const docRef = doc(db, 'friendships', friendshipId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { status: 'none' };
    }

    const data = { id: snap.id, ...snap.data() } as Friendship;
    if (data.status === 'accepted') {
      return { status: 'friends', friendship: data };
    }
    if (data.status === 'pending') {
      if (data.initiatedBy === myUid) {
        return { status: 'pending_sent', friendship: data };
      } else {
        return { status: 'pending_received', friendship: data };
      }
    }

    return { status: 'none', friendship: data };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `friendships/${friendshipId}`);
    return { status: 'none' };
  }
}

/**
 * Sends a friend request to a peer scholar
 */
export async function sendFriendRequest(params: {
  myUid: string;
  myName: string;
  myAvatar?: string;
  targetUid: string;
  targetName: string;
  targetAvatar?: string;
}): Promise<Friendship> {
  const friendshipId = getFriendshipId(params.myUid, params.targetUid);
  const docRef = doc(db, 'friendships', friendshipId);

  const newFriendshipData = {
    user1Id: params.myUid,
    user2Id: params.targetUid,
    user1Name: params.myName,
    user2Name: params.targetName,
    user1Avatar: params.myAvatar || '📐',
    user2Avatar: params.targetAvatar || '📐',
    status: 'pending' as const,
    initiatedBy: params.myUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, newFriendshipData);
    return { id: friendshipId, ...newFriendshipData };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `friendships/${friendshipId}`);
    throw err;
  }
}

/**
 * Accepts an incoming friend request
 */
export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const docRef = doc(db, 'friendships', friendshipId);
  try {
    await updateDoc(docRef, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `friendships/${friendshipId}`);
    throw err;
  }
}

/**
 * Declines or cancels a friend request
 */
export async function declineFriendRequest(friendshipId: string): Promise<void> {
  const docRef = doc(db, 'friendships', friendshipId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `friendships/${friendshipId}`);
    throw err;
  }
}

/**
 * Fetches all accepted friends and pending requests for a user
 */
export async function fetchUserFriendships(userId: string): Promise<{
  friends: Friendship[];
  pendingReceived: Friendship[];
  pendingSent: Friendship[];
}> {
  try {
    const q1 = query(collection(db, 'friendships'), where('user1Id', '==', userId));
    const q2 = query(collection(db, 'friendships'), where('user2Id', '==', userId));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const allFriendships: Friendship[] = [];
    const seen = new Set<string>();

    [...snap1.docs, ...snap2.docs].forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        allFriendships.push({ id: d.id, ...d.data() } as Friendship);
      }
    });

    const friends = allFriendships.filter((f) => f.status === 'accepted');
    const pendingReceived = allFriendships.filter((f) => f.status === 'pending' && f.initiatedBy !== userId);
    const pendingSent = allFriendships.filter((f) => f.status === 'pending' && f.initiatedBy === userId);

    return { friends, pendingReceived, pendingSent };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'friendships');
    return { friends: [], pendingReceived: [], pendingSent: [] };
  }
}

// ==========================================
// DIRECT P2P & SCHOLAR CHAT (NO CODE SCANNING)
// ==========================================

/**
 * Starts or joins a direct 1-to-1 P2P session with a friend
 */
export async function startDirectP2PSession(
  myUid: string,
  friendUid: string
): Promise<string> {
  const sessionId = getDirectSessionId(myUid, friendUid);
  const docRef = doc(db, 'direct_p2p', sessionId);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        sessionId,
        participants: [myUid, friendUid],
        activeHost: myUid,
        status: 'active',
        chatMessagesJson: JSON.stringify([]),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        status: 'active',
        activeHost: myUid,
        updatedAt: serverTimestamp(),
      });
    }

    return sessionId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `direct_p2p/${sessionId}`);
    throw err;
  }
}

/**
 * Subscribes to live direct P2P session updates (chat messages, synchronized graph, signaling)
 */
export function listenDirectP2PSession(
  sessionId: string,
  onUpdate: (session: DirectP2PSessionData) => void
): Unsubscribe {
  const docRef = doc(db, 'direct_p2p', sessionId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as DirectP2PSessionData);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `direct_p2p/${sessionId}`);
    }
  );
}

/**
 * Sends a real-time message in the direct P2P chat without codes
 */
export async function sendDirectChatMessage(
  sessionId: string,
  message: ChatMessage,
  currentMessages: ChatMessage[]
): Promise<void> {
  const docRef = doc(db, 'direct_p2p', sessionId);
  const updatedList = [...currentMessages, message].slice(-100);

  try {
    await updateDoc(docRef, {
      chatMessagesJson: JSON.stringify(updatedList),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `direct_p2p/${sessionId}`);
  }
}

/**
 * Synchronizes graph state directly to the friend in real-time
 */
export async function sendDirectGraphSync(
  sessionId: string,
  graphData: {
    expressions: GraphExpression[];
    viewport: Viewport;
    gridMode: GridMode;
    themeId: ThemeId;
    title?: string;
  }
): Promise<void> {
  const docRef = doc(db, 'direct_p2p', sessionId);
  try {
    await updateDoc(docRef, {
      graphSyncJson: JSON.stringify(graphData),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `direct_p2p/${sessionId}`);
  }
}

/**
 * Closes the direct P2P session
 */
export async function endDirectP2PSession(sessionId: string): Promise<void> {
  const docRef = doc(db, 'direct_p2p', sessionId);
  try {
    await updateDoc(docRef, {
      status: 'ended',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `direct_p2p/${sessionId}`);
  }
}
