import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { AdminProfile } from '../types.ts';
import { useTranslation } from '../i18n/LanguageContext.tsx';

interface AdminLoginViewProps {
  onLoginSuccess: (token: string, admin: AdminProfile) => void;
  onBackToCatalogue: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onBackToCatalogue,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [coAdminEmail, setCoAdminEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [authorizedSlots, setAuthorizedSlots] = useState<
    Array<{ id: number; email: string; name: string; slot: number }>
  >([]);

  useEffect(() => {
    fetch('/api/auth/admins-public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.admins) {
          setAuthorizedSlots(data.admins);
          if (data.admins[0] && !email) {
            setEmail(data.admins[0].email);
          }
        }
      })
      .catch(() => {
        // ignore offline
      });
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Authentication failed');
      } else {
        onLoginSuccess(data.token, data.admin);
      }
    } catch {
      setErrorMsg('Network error while signing in. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await response.json();
      if (!response.ok || !data.admin) {
        setErrorMsg(
          'This Google account is signed in as a Customer. To access the Workshop Management Portal, please sign in with an Administrator Google Account (e.g. sahajsingh81844@gmail.com).'
        );
      } else {
        onLoginSuccess(idToken, data.admin);
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Google Sign-In was cancelled or could not complete.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          coAdminEmail: coAdminEmail.trim(),
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Password reset failed');
      } else {
        setSuccessMsg(data.message || 'Password updated! You can now sign in.');
        setMode('login');
        setPassword('');
      }
    } catch {
      setErrorMsg('Network error while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 px-4">
      <button
        onClick={onBackToCatalogue}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 mb-5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('navPublicStore')}</span>
      </button>

      <div className="rounded-xl bg-white border border-zinc-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 text-[#00C1FD] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-zinc-900 tracking-tight">
              {mode === 'login' ? t('adminLoginTitle') : t('resetPasswordTitle')}
            </h1>
            <p className="text-xs text-zinc-500">
              {mode === 'login' ? t('adminLoginSubtitle') : t('resetPasswordDesc')}
            </p>
          </div>
        </div>

        {/* Display the 2 Authorized Admin Slots */}
        {authorizedSlots.length > 0 && (
          <div className="mb-5 p-3.5 rounded-lg bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 mb-2">
              <Users className="w-3.5 h-3.5 text-[#00C1FD]" />
              <span>{t('authorizedSlotsTitle')}</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {authorizedSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    setEmail(slot.email);
                    setErrorMsg(null);
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-md border text-xs transition-colors cursor-pointer flex items-center justify-between ${
                    email.toLowerCase() === slot.email.toLowerCase()
                      ? 'bg-white border-zinc-400 text-zinc-900 font-semibold'
                      : 'bg-transparent border-transparent text-zinc-600 hover:bg-stone-100'
                  }`}
                >
                  <span className="truncate">{slot.name}</span>
                  <span className="font-mono text-[11px] text-zinc-500 ml-2 shrink-0">
                    {slot.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                {t('emailOrSlotLabel')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sahajsingh81844@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  {t('passwordLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-medium text-amber-700 hover:underline cursor-pointer"
                >
                  {t('forgotPasswordLink')}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold tracking-wide transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? '...' : t('signInBtn')}
            </button>

            <div className="relative py-2 flex items-center justify-center">
              <div className="border-t border-zinc-200 w-full" />
              <span className="bg-white px-3 text-[11px] text-zinc-400">OR</span>
              <div className="border-t border-zinc-200 w-full" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg border border-zinc-300 bg-white hover:bg-stone-50 text-zinc-800 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>{t('googleSignInBtn')}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                {t('emailOrSlotLabel')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                {t('coAdminEmailLabel')}
              </label>
              <input
                type="email"
                required
                value={coAdminEmail}
                onChange={(e) => setCoAdminEmail(e.target.value)}
                placeholder="admin2@sonudieselbhatti.com"
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                {t('newPasswordLabel')}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-stone-50 cursor-pointer"
              >
                {t('backToLogin')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer"
              >
                {t('confirmResetBtn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
