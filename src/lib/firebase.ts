import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCK5ZUzUAtBXZ0PPtupBdg9bq8ThhJgVN4",
  authDomain: "gen-lang-client-0910478688.firebaseapp.com",
  projectId: "gen-lang-client-0910478688",
  storageBucket: "gen-lang-client-0910478688.firebasestorage.app",
  messagingSenderId: "215776242901",
  appId: "1:215776242901:web:9fcb81cb46bd45029f065c",
  measurementId: "G-DR6DSZ5F12"
};

// 1. Ensure initializeApp(firebaseConfig) uses these exact values
export const app = initializeApp(firebaseConfig);

// 2. Initialize and export Firebase Auth (getAuth(app)) and GoogleAuthProvider
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const googleProvider = provider;
export { GoogleAuthProvider };

// Initialize Firestore with designated database ID
export const db = getFirestore(app, "ai-studio-principiagraphic-95936d98-53a4-4c26-bd25-f9b54f055fee");

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot per critical constraint
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
  }
}
testConnection();
