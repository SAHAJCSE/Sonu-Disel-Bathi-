import React, { useState } from 'react';
import { AdminProfile } from '../types.ts';

interface AuthProfileHeaderProps {
  admin: AdminProfile | null;
  onOpenAdminLogin: () => void;
  onSignOut: () => void;
  isAdminPortalOpen: boolean;
  onToggleAdminPortal: () => void;
}

export const AuthProfileHeader: React.FC<AuthProfileHeaderProps> = ({
  admin,
  onOpenAdminLogin,
  onSignOut,
  isAdminPortalOpen,
  onToggleAdminPortal,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!admin) {
    return (
      <button
        type="button"
        onClick={onOpenAdminLogin}
        className="px-2.5 sm:px-3 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        Admin
      </button>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="px-2.5 sm:px-3 py-1.5 rounded-md border border-zinc-950 bg-zinc-950 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
      >
        Admin ▾
      </button>

      {isDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="absolute right-0 top-10 z-50 w-48 bg-white text-zinc-950 border border-zinc-200 rounded-md shadow-lg overflow-hidden">
            <div className="p-3 border-b border-zinc-100">
              <div className="text-xs font-semibold text-zinc-950 truncate">
                {admin.name}
              </div>
              <div className="text-[11px] text-zinc-500 truncate font-mono">
                {admin.email}
              </div>
            </div>

            <div className="p-1">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onToggleAdminPortal();
                }}
                className="w-full px-3 py-2 rounded text-left text-xs font-medium text-zinc-900 hover:bg-zinc-100 cursor-pointer flex items-center justify-between"
              >
                <span>{isAdminPortalOpen ? 'Storefront' : 'Dashboard'}</span>
                <span className="font-mono text-[10px] text-zinc-500">→</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onSignOut();
                }}
                className="w-full px-3 py-2 rounded text-left text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
