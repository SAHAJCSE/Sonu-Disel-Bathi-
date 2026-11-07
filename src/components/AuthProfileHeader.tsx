import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../types.ts';

interface AuthProfileHeaderProps {
  user: UserProfile | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onOpenOrders: () => void;
  orderCount: number;
  isAdminPortalOpen: boolean;
  onToggleAdminPortal: () => void;
  isAuthenticating: boolean;
}

export const AuthProfileHeader: React.FC<AuthProfileHeaderProps> = ({
  user,
  onGoogleSignIn,
  onSignOut,
  onOpenOrders,
  orderCount,
  isAdminPortalOpen,
  onToggleAdminPortal,
  isAuthenticating,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!user) {
    return (
      <button
        type="button"
        disabled={isAuthenticating}
        onClick={onGoogleSignIn}
        className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] border border-zinc-200 cursor-pointer disabled:opacity-60"
      >
        {/* Official Google G Logo SVG */}
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{isAuthenticating ? 'Signing in...' : 'Sign in with Google'}</span>
      </button>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer shadow-xs"
      >
        {user.photoUrl ? (
          <img
            src={user.photoUrl}
            alt={user.name}
            className="w-6 h-6 rounded-full object-cover border border-zinc-600"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[11px] font-bold border border-zinc-600">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
            {user.name.split(' ')[0]}
          </div>
          <div className="text-[10px] font-semibold flex items-center gap-1">
            {isAdmin ? (
              <span className="text-amber-400 flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Admin</span>
              </span>
            ) : (
              <span className="text-zinc-400">Customer</span>
            )}
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      {/* User Dropdown */}
      <AnimatePresence>
        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-64 bg-[#1c1c1e] text-white border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10"
            >
              {/* Profile Header */}
              <div className="p-3.5 bg-[#232326] border-b border-zinc-800 flex items-center gap-3">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center text-sm font-bold border border-zinc-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate font-mono">
                    {user.email}
                  </div>
                  <div className="mt-1">
                    {isAdmin ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/30 inline-flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>Administrator</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[9px] font-bold border border-zinc-700 inline-flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        <span>Verified Customer</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions List */}
              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenOrders();
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-left text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-zinc-400" />
                    <span>My Orders & Receipts</span>
                  </span>
                  {orderCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-white font-mono text-[10px] font-bold border border-zinc-700">
                      {orderCount}
                    </span>
                  )}
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onToggleAdminPortal();
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isAdminPortalOpen
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'hover:bg-zinc-800 text-zinc-200 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                      <span>Admin Management Portal</span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-400">
                      {isAdminPortalOpen ? 'Active' : 'Open'}
                    </span>
                  </button>
                )}

                <div className="h-px bg-zinc-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSignOut();
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-red-500/10 text-left text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
