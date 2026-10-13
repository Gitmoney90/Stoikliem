import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { GraphExpression, Viewport, GridMode, ThemeId } from '../types/graph';

export interface GraphDocument {
  id: string;
  title: string;
  description?: string;
  authorId: string;
  authorName?: string;
  shareCode: string;
  isPublic: boolean;
  expressionsJson: string;
  viewportJson: string;
  gridMode?: string;
  themeId?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface DecodedGraphData {
  title: string;
  description?: string;
  authorName?: string;
  shareCode: string;
  expressions: GraphExpression[];
  viewport: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  gridMode: GridMode;
  themeId: ThemeId;
}

export function generateShareCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = 'pg_';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Creates and submits a new graph to Firestore
 */
export async function submitGraph(params: {
  title: string;
  description?: string;
  authorId: string;
  authorName?: string;
  isPublic: boolean;
  expressions: GraphExpression[];
  viewport: Viewport;
  gridMode: GridMode;
  themeId: ThemeId;
}): Promise<GraphDocument> {
  const graphId = `g_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const shareCode = generateShareCode();

  const minimalExpressions = params.expressions.map((e) => ({
    rawText: e.rawText,
    color: e.color,
    visible: e.visible,
    type: e.type,
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

  const minimalViewport = {
    xMin: params.viewport.xMin,
    xMax: params.viewport.xMax,
    yMin: params.viewport.yMin,
    yMax: params.viewport.yMax,
  };

  const docData: any = {
    title: params.title.trim().slice(0, 100),
    authorId: params.authorId,
    shareCode,
    isPublic: params.isPublic,
    expressionsJson: JSON.stringify(minimalExpressions),
    viewportJson: JSON.stringify(minimalViewport),
    gridMode: params.gridMode,
    themeId: params.themeId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (params.description?.trim()) {
    docData.description = params.description.trim().slice(0, 500);
  }
  if (params.authorName?.trim()) {
    docData.authorName = params.authorName.trim().slice(0, 100);
  }

  const docRef = doc(db, 'graphs', graphId);

  try {
    await setDoc(docRef, docData);
    return {
      id: graphId,
      ...docData,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `graphs/${graphId}`);
    throw error;
  }
}

/**
 * Retrieves a graph by its unique shareCode or document ID
 */
export async function fetchGraphByShareCode(
  codeOrId: string
): Promise<GraphDocument | null> {
  const trimmed = codeOrId.trim();

  // Try fetching directly by document ID first
  try {
    const docRef = doc(db, 'graphs', trimmed);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as GraphDocument;
    }
  } catch (err) {
    // Continue to query by shareCode
  }

  // Query by shareCode
  const path = 'graphs';
  try {
    const q = query(
      collection(db, path),
      where('shareCode', '==', trimmed),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const first = snap.docs[0];
      return { id: first.id, ...first.data() } as GraphDocument;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Fetches all graph submissions authored by a specific user
 */
export async function fetchUserGraphs(
  authorId: string
): Promise<GraphDocument[]> {
  const path = 'graphs';
  try {
    const q = query(
      collection(db, path),
      where('authorId', '==', authorId),
      limit(50)
    );
    const snap = await getDocs(q);
    const list: GraphDocument[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as GraphDocument);
    });
    // Sort in-memory to prevent complex composite index requirements
    return list.sort((a, b) => {
      const tA = a.createdAt?.seconds || 0;
      const tB = b.createdAt?.seconds || 0;
      return tB - tA;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Fetches public submissions for the community gallery
 */
export async function fetchPublicGraphs(
  limitCount: number = 24
): Promise<GraphDocument[]> {
  const path = 'graphs';
  try {
    const q = query(
      collection(db, path),
      where('isPublic', '==', true),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const list: GraphDocument[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as GraphDocument);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Deletes a graph submission authored by current user
 */
export async function deleteGraph(graphId: string): Promise<void> {
  const docRef = doc(db, 'graphs', graphId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `graphs/${graphId}`);
    throw error;
  }
}
