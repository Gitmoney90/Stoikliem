import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeConfig } from '../types/graph';
import {
  X,
  Lock,
  ShieldCheck,
  Sparkles,
  BookOpen,
  User as UserIcon,
  Edit3,
  Check,
  AlertCircle,
  AtSign,
  GraduationCap,
  Smile,
  LogOut,
  Camera,
  Upload,
  Download,
  FolderOpen,
  Image as ImageIcon,
  HardDrive,
  Cloud,
  FileText,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onSuccess?: () => void;
}

const EMOJI_AVATARS = ['📐', '🔭', '📜', '⚖️', '🧭', '🌌', '⚡', '♾️', '🧮', '🖋️', '🏛️', '💡'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  theme,
  onSuccess,
}) => {
  const { user, profile, signInWithGoogle, signOutUser, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [academicTitle, setAcademicTitle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('📐');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [driveUrlInput, setDriveUrlInput] = useState('');

  // Sync profile data to edit inputs
  useEffect(() => {
    if (!isOpen) return;
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.displayName || user?.displayName || '');
      setAcademicTitle(profile.academicTitle || 'Mathematical Naturalist');
      setBio(profile.bio || '');
      setAvatarEmoji(profile.avatarEmoji || '📐');
      setAvatarUrl(profile.avatarUrl || user?.photoURL || '');
    } else if (user) {
      setUsername(user.email?.split('@')[0] || 'scholar');
      setDisplayName(user.displayName || 'Mathematical Scholar');
      setAcademicTitle('Mathematical Naturalist');
      setBio('Explorer of geometric curves and loci.');
      setAvatarEmoji('📐');
      setAvatarUrl(user.photoURL || '');
    }
  }, [profile, user, isOpen]);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Authentication could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
      setIsEditing(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not sign out.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate username format
    const cleanedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanedUsername.length < 2) {
      setError('Username must be at least 2 alphanumeric characters.');
      return;
    }

    if (!displayName.trim()) {
      setError('Scholar display name cannot be blank.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        username: cleanedUsername,
        displayName: displayName.trim(),
        academicTitle: academicTitle.trim(),
        bio: bio.trim(),
        avatarEmoji,
        avatarUrl: avatarUrl.trim(),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      setIsEditing(false);
    } catch (err: any) {
      const msg = err?.message || 'Failed to update profile in database.';
      setError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawData = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 160;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(compressed);
          setSaveSuccess(false);
        }
      };
      img.src = rawData;
    };
    reader.readAsDataURL(file);
  };

  const handleGoogleDriveConvert = () => {
    const trimmed = driveUrlInput.trim();
    if (!trimmed) return;
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const directUrl = `https://lh3.googleusercontent.com/d/${match[1]}`;
      setAvatarUrl(directUrl);
      setDriveUrlInput('');
    } else {
      setAvatarUrl(trimmed);
      setDriveUrlInput('');
    }
  };

  const handleExportDossier = () => {
    const dossier = {
      username,
      displayName,
      academicTitle,
      bio,
      avatarUrl,
      avatarEmoji,
      exportedAt: new Date().toISOString(),
      generator: 'Principia Graphica Scholar Dossier',
    };
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scholar_profile_${username || 'dossier'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDossier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.username) setUsername(parsed.username);
        if (parsed.displayName) setDisplayName(parsed.displayName);
        if (parsed.academicTitle) setAcademicTitle(parsed.academicTitle);
        if (parsed.bio) setBio(parsed.bio);
        if (parsed.avatarEmoji) setAvatarEmoji(parsed.avatarEmoji);
        if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl);
        setError(null);
      } catch {
        setError('Could not read scholar JSON file.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-2.5">
            {user ? (
              <UserIcon className="w-5 h-5" style={{ color: theme.accent }} />
            ) : (
              <Lock className="w-5 h-5" style={{ color: theme.accent }} />
            )}
            <div>
              <h2
                className="text-base font-bold tracking-tight"
                style={{
                  fontFamily: '"Cinzel", "Source Serif 4", serif',
                  color: theme.textPrimary,
                }}
              >
                {user || profile ? 'Scholar Dossier & Profile' : 'Scholar Profile & Cloud Sign In'}
              </h2>
              <p className="text-2xs" style={{ color: theme.textSecondary }}>
                {user
                  ? 'Customizable academic identity, handle, and cloud submissions'
                  : 'Customize your local scholar dossier or sign in to sync with Google'}
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

        {/* Content */}
        <div className="p-6 space-y-5 text-xs font-sans overflow-y-auto">
          {user || profile || isEditing ? (
            <div className="space-y-5">
              {/* Profile Card / Header View */}
              <div
                className="p-4 rounded-xl border relative overflow-hidden"
                style={{
                  backgroundColor: theme.bgSidebar,
                  borderColor: theme.border,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {/* Avatar Display */}
                    <div className="relative group shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName || 'User'}
                          className="w-14 h-14 rounded-full border-2 object-cover shadow-xs"
                          style={{ borderColor: theme.accent }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl shadow-xs"
                          style={{
                            borderColor: theme.accent,
                            backgroundColor: `${theme.accent}15`,
                          }}
                        >
                          {avatarEmoji || '📐'}
                        </div>
                      )}
                      <span
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-xs border"
                        style={{
                          backgroundColor: theme.bgCard,
                          borderColor: theme.border,
                        }}
                      >
                        {avatarEmoji}
                      </span>
                    </div>

                    {/* Name, Handle, Title */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className="font-bold text-base tracking-tight"
                          style={{
                            fontFamily: '"Source Serif 4", serif',
                            color: theme.textPrimary,
                          }}
                        >
                          {displayName || profile?.displayName || 'Mathematical Explorer'}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded text-2xs font-mono font-semibold"
                          style={{
                            backgroundColor: `${theme.accent}20`,
                            color: theme.accent,
                          }}
                        >
                          @{username || profile?.username || 'scholar'}
                        </span>
                      </div>

                      <div className="text-2xs flex items-center gap-1.5 font-medium" style={{ color: theme.accent }}>
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>{academicTitle || profile?.academicTitle || 'Natural Philosopher'}</span>
                      </div>

                      <div className="text-2xs font-mono opacity-60" style={{ color: theme.textSecondary }}>
                        {user?.email || 'Local Scholar (Offline)'}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Edit Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(!isEditing);
                      setError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{
                      borderColor: theme.border,
                      color: theme.textPrimary,
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                  </button>
                </div>

                {/* Bio text in non-edit mode */}
                {!isEditing && (bio || profile?.bio) && (
                  <div
                    className="mt-3 pt-3 border-t text-2xs italic leading-relaxed"
                    style={{
                      borderColor: theme.border,
                      color: theme.textSecondary,
                    }}
                  >
                    "{bio || profile?.bio}"
                  </div>
                )}
              </div>

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Profile and scholar username successfully updated in cloud database!</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Edit Profile Form */}
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4 p-4 rounded-xl border" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: theme.border }}>
                    <span className="font-bold text-xs uppercase tracking-wider" style={{ color: theme.textPrimary }}>
                      Edit Scholar Details
                    </span>
                    <span className="text-2xs" style={{ color: theme.textMuted }}>
                      Visible on all graph treatises
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Username Field */}
                    <div>
                      <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
                        Username (Handle) *
                      </label>
                      <div className="relative">
                        <AtSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-50" style={{ color: theme.textPrimary }} />
                        <input
                          type="text"
                          required
                          maxLength={50}
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="e.g. euler_1736"
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs font-mono"
                          style={{
                            backgroundColor: theme.bgSidebar,
                            borderColor: theme.border,
                            color: theme.textPrimary,
                          }}
                        />
                      </div>
                      <span className="text-3xs block mt-0.5 opacity-60">Lowercase letters, numbers, and underscores</span>
                    </div>

                    {/* Display Name Field */}
                    <div>
                      <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
                        Full Name / Scholar Moniker *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Leonhard Euler"
                        className="w-full px-3 py-1.5 rounded-lg border text-xs"
                        style={{
                          backgroundColor: theme.bgSidebar,
                          borderColor: theme.border,
                          color: theme.textPrimary,
                        }}
                      />
                    </div>
                  </div>

                  {/* Academic Title */}
                  <div>
                    <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
                      Academic Title / Field of Study
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={academicTitle}
                      onChange={(e) => setAcademicTitle(e.target.value)}
                      placeholder="e.g. Professor of Analytical Geometry & Topology"
                      className="w-full px-3 py-1.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: theme.bgSidebar,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      }}
                    />
                  </div>

                  {/* Scholar Bio */}
                  <div>
                    <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
                      Scholar Bio & Mathematical Focus
                    </label>
                    <textarea
                      rows={2}
                      maxLength={300}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share your research interests, favorite curves, or topological conjectures..."
                      className="w-full px-3 py-2 rounded-lg border text-xs resize-none"
                      style={{
                        backgroundColor: theme.bgSidebar,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      }}
                    />
                    <div className="flex justify-between text-3xs opacity-60 mt-0.5">
                      <span>Max 300 characters</span>
                      <span>{bio.length}/300</span>
                    </div>
                  </div>

                  {/* Avatar Emoji Selector & Custom Avatar URL */}
                  <div className="space-y-2">
                    <label className="block text-2xs uppercase tracking-wider font-semibold" style={{ color: theme.textMuted }}>
                      Scholar Crest / Avatar Icon
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOJI_AVATARS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setAvatarEmoji(emoji)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-transform ${
                            avatarEmoji === emoji
                              ? 'scale-110 shadow-xs font-bold border-amber-600 bg-amber-500/10'
                              : 'opacity-70 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{
                            borderColor: avatarEmoji === emoji ? theme.accent : theme.border,
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Profile Image Upload & Google Drive Integration */}
                    <div className="pt-2 border-t space-y-3" style={{ borderColor: theme.border }}>
                      <div className="flex items-center justify-between">
                        <label className="block text-2xs uppercase tracking-wider font-semibold" style={{ color: theme.textMuted }}>
                          Scholar Portrait Photo
                        </label>
                        <span className="text-3xs" style={{ color: theme.textSecondary }}>
                          Local File or Google Drive
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* 1. Upload from Local Storage */}
                        <label
                          className="px-3 py-2 rounded-lg border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-98 text-xs font-medium"
                          style={{ borderColor: theme.border, color: theme.textPrimary }}
                        >
                          <HardDrive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Upload from Local Storage</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="hidden"
                          />
                        </label>

                        {/* 2. Google Drive / Cloud Link Converter */}
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={driveUrlInput}
                            onChange={(e) => setDriveUrlInput(e.target.value)}
                            placeholder="Paste Google Drive / image link"
                            className="flex-1 px-2.5 py-1.5 rounded-lg border text-3xs font-mono"
                            style={{
                              backgroundColor: theme.bgSidebar,
                              borderColor: theme.border,
                              color: theme.textPrimary,
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleGoogleDriveConvert}
                            title="Convert & Apply Google Drive Link"
                            className="px-2.5 py-1.5 rounded-lg border text-3xs font-semibold flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 shrink-0 transition-colors"
                            style={{ borderColor: theme.accent, color: theme.accent }}
                          >
                            <Cloud className="w-3 h-3" />
                            <span>Apply</span>
                          </button>
                        </div>
                      </div>

                      {/* Direct URL input fallback */}
                      <div className="relative">
                        <input
                          type="url"
                          maxLength={65000}
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="Or direct image URL (https://...)"
                          className="w-full px-3 py-1.5 rounded-lg border text-3xs font-mono"
                          style={{
                            backgroundColor: theme.bgSidebar,
                            borderColor: theme.border,
                            color: theme.textPrimary,
                          }}
                        />
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setAvatarUrl('')}
                            className="absolute right-2 top-2 text-3xs font-medium opacity-60 hover:opacity-100"
                            style={{ color: theme.textSecondary }}
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Dossier Backup & Restore */}
                      <div className="pt-2 border-t flex items-center justify-between gap-2 text-2xs" style={{ borderColor: theme.border }}>
                        <span className="text-3xs opacity-70">Scholar Dossier Backup:</span>
                        <div className="flex items-center gap-2">
                          <label
                            className="px-2 py-1 rounded border text-3xs font-medium cursor-pointer flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            style={{ borderColor: theme.border, color: theme.textSecondary }}
                            title="Import profile info from JSON file (from local drive or Google Drive download)"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span>Import JSON</span>
                            <input
                              type="file"
                              accept=".json"
                              onChange={handleImportDossier}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={handleExportDossier}
                            className="px-2 py-1 rounded border text-3xs font-medium flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            style={{ borderColor: theme.border, color: theme.textSecondary }}
                            title="Download scholar profile dossier to local storage / save to Google Drive"
                          >
                            <Download className="w-3 h-3" />
                            <span>Export JSON</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-black/5 transition-colors"
                      style={{ borderColor: theme.border, color: theme.textSecondary }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-4 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                      style={{
                        backgroundColor: theme.textPrimary,
                        color: theme.bgCanvas,
                      }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Account / Cloud Sync Actions */}
              <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: theme.border }}>
                {user ? (
                  <>
                    <div className="text-2xs font-mono" style={{ color: theme.textSecondary }}>
                      ✓ Authenticated: {user.email}
                    </div>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-rose-500/10 text-rose-600 transition-colors flex items-center justify-center gap-1.5 min-h-[38px] active:scale-95"
                      style={{ borderColor: theme.border }}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-2xs" style={{ color: theme.textSecondary }}>
                      Offline Scholar Mode (Saved in Local Storage)
                    </div>

                    <button
                      type="button"
                      onClick={handleSignIn}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-xs hover:opacity-90 transition-all min-h-[38px] active:scale-95"
                      style={{
                        backgroundColor: theme.textPrimary,
                        color: theme.bgCanvas,
                      }}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{loading ? 'Connecting...' : 'Sign In with Google'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
                Sign in to sync your mathematical treatises to the cloud archive, or set up a local scholar dossier directly on your device.
              </p>

              <div className="space-y-2 py-1">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span style={{ color: theme.textPrimary }}>
                    Create and edit your customizable scholar username, photo, and bio
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <HardDrive className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span style={{ color: theme.textPrimary }}>
                    Upload portrait from local storage or Google Drive link
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span style={{ color: theme.textPrimary }}>
                    Export or import entire JSON profile dossiers at any time
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-mono">
                  {error}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 font-semibold shadow-xs hover:opacity-90 transition-all min-h-[44px] active:scale-98"
                  style={{
                    backgroundColor: theme.textPrimary,
                    color: theme.bgCanvas,
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{loading ? 'Connecting...' : 'Sign In with Google Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setUsername(username || 'scholar');
                    setDisplayName(displayName || 'Natural Philosopher');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-medium border hover:bg-black/5 dark:hover:bg-white/5 transition-all min-h-[44px] active:scale-98"
                  style={{
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  }}
                >
                  <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Customize Local Scholar Profile (Offline)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
