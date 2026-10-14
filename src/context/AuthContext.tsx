import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, provider } from '../lib/firebase';
import { UserProfile } from '../types/user';
import { getOrCreateUserProfile, updateUserProfile as updateProfileInFirestore } from '../lib/userService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'username' | 'displayName' | 'bio' | 'academicTitle' | 'avatarUrl' | 'avatarEmoji'>>) => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => null,
  signOutUser: async () => {},
  updateProfile: async () => {
    throw new Error('AuthProvider not mounted');
  },
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (currentUser: User) => {
    try {
      const userProf = await getOrCreateUserProfile(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName,
        currentUser.photoURL
      );
      setProfile(userProf);
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        const saved = localStorage.getItem('principia_scholar_profile');
        if (saved) {
          try {
            setProfile(JSON.parse(saved));
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loadUserProfile]);

  const signInWithGoogle = async (): Promise<User | null> => {
    try {
      const res = await signInWithPopup(auth, provider);
      if (res.user) {
        await loadUserProfile(res.user);
      }
      return res.user;
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      const saved = localStorage.getItem('principia_scholar_profile');
      if (saved) {
        try {
          setProfile(JSON.parse(saved));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } catch (err: any) {
      console.error('Sign-out failed:', err);
      throw err;
    }
  };

  const updateProfile = async (
    data: Partial<Pick<UserProfile, 'username' | 'displayName' | 'bio' | 'academicTitle' | 'avatarUrl' | 'avatarEmoji'>>
  ): Promise<UserProfile> => {
    if (!user) {
      // Allow scholar profile persistence in localStorage for guest/offline explorers
      const guestProf: UserProfile = {
        uid: profile?.uid || 'scholar_local_' + Math.random().toString(36).substring(2, 9),
        username: data.username || profile?.username || 'scholar',
        displayName: data.displayName || profile?.displayName || 'Natural Philosopher',
        academicTitle: data.academicTitle || profile?.academicTitle || 'Mathematical Scholar',
        bio: data.bio !== undefined ? data.bio : (profile?.bio || ''),
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : (profile?.avatarUrl || ''),
        avatarEmoji: data.avatarEmoji || profile?.avatarEmoji || '📐',
        createdAt: profile?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      localStorage.setItem('principia_scholar_profile', JSON.stringify(guestProf));
      setProfile(guestProf);
      return guestProf;
    }

    // Optimistically update local profile state for instantaneous feedback
    const previous = profile;
    const optimistic: UserProfile = {
      ...(previous || {
        uid: user.uid,
        username: 'scholar',
        displayName: user.displayName || 'Scholar',
      }),
      ...data,
      updatedAt: new Date(),
    };
    setProfile(optimistic);

    try {
      const updated = await updateProfileInFirestore(user.uid, data);
      localStorage.setItem('principia_scholar_profile', JSON.stringify(updated));
      setProfile(updated);
      return updated;
    } catch (err) {
      setProfile(previous);
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signOutUser,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
