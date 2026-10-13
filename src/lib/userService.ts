import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from '../types/user';

/**
 * Generates a clean default username based on email or random suffix
 */
export function generateDefaultUsername(email?: string | null, displayName?: string | null): string {
  if (displayName) {
    const cleaned = displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
    if (cleaned.length >= 2) return cleaned;
  }
  if (email) {
    const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
    if (prefix.length >= 2) return prefix;
  }
  return `scholar_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Fetches user profile by user UID
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
}

/**
 * Creates or gets an initial profile for an authenticated user
 */
export async function getOrCreateUserProfile(
  uid: string,
  email?: string | null,
  displayName?: string | null,
  photoURL?: string | null
): Promise<UserProfile> {
  const existing = await fetchUserProfile(uid);
  if (existing) {
    return existing;
  }

  const defaultUsername = generateDefaultUsername(email, displayName);
  const newProfile: UserProfile = {
    uid,
    username: defaultUsername,
    displayName: displayName || email?.split('@')[0] || 'Mathematical Scholar',
    bio: 'Explorer of geometry, analysis, and topological loci in Principia Graphica.',
    academicTitle: 'Mathematical Naturalist',
    avatarUrl: photoURL || '',
    avatarEmoji: '📐',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = doc(db, 'users', uid);
  try {
    await setDoc(docRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
    return newProfile;
  }
}

/**
 * Updates editable fields of a user's profile
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'username' | 'displayName' | 'bio' | 'academicTitle' | 'avatarUrl' | 'avatarEmoji'>>
): Promise<UserProfile> {
  const docRef = doc(db, 'users', uid);
  const cleanData: any = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (cleanData.username) {
    cleanData.username = cleanData.username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 50);
  }
  if (cleanData.displayName) {
    cleanData.displayName = cleanData.displayName.trim().slice(0, 100);
  }
  if (cleanData.bio !== undefined) {
    cleanData.bio = cleanData.bio.trim().slice(0, 300);
  }
  if (cleanData.academicTitle !== undefined) {
    cleanData.academicTitle = cleanData.academicTitle.trim().slice(0, 100);
  }

  try {
    await updateDoc(docRef, cleanData);
    const updatedSnap = await getDoc(docRef);
    if (updatedSnap.exists()) {
      return updatedSnap.data() as UserProfile;
    }
    return cleanData as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    throw error;
  }
}
