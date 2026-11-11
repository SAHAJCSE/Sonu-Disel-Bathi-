import React from 'react';
import { motion } from 'motion/react';
import { Search, Home, Heart, Plus, Settings, User } from 'lucide-react';

interface FloatingNavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNavigate: (mode: 'public' | 'admin_login' | 'admin_dashboard') => void;
  showFavouritesOnly: boolean;
  setShowFavouritesOnly: (val: boolean) => void;
  isAdmin: boolean;
  onAddProduct: () => void;
  onOpenSettings: () => void;
}

export const FloatingNavbar: React.FC<FloatingNavbarProps> = ({
  searchQuery,
  setSearchQuery,
  onNavigate,
  showFavouritesOnly,
  setShowFavouritesOnly,
  isAdmin,
  onAddProduct,
  onOpenSettings,
}) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl"
    >
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search actions, people, instruments"
          className="w-full pl-10 pr-4 py-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm focus:outline-none"
        />
      </div>
      
      <div className="flex items-center justify-around">
        <button onClick={() => onNavigate('public')} className="flex flex-col items-center gap-1 text-zinc-900 dark:text-zinc-100">
          <Home className="w-6 h-6" />
          <span className="text-[10px]">Home</span>
        </button>
        <button onClick={() => setShowFavouritesOnly(!showFavouritesOnly)} className={`flex flex-col items-center gap-1 ${showFavouritesOnly ? 'text-red-500' : 'text-zinc-500'}`}>
          <Heart className="w-6 h-6" />
          <span className="text-[10px]">Favourites</span>
        </button>
        
        {isAdmin && (
          <button onClick={onAddProduct} className="p-4 rounded-full bg-emerald-400 text-zinc-900 shadow-lg -mt-10">
            <Plus className="w-8 h-8" />
          </button>
        )}
        
        <button onClick={onOpenSettings} className="flex flex-col items-center gap-1 text-zinc-500">
          <Settings className="w-6 h-6" />
          <span className="text-[10px]">Settings</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500">
          <User className="w-6 h-6" />
          <span className="text-[10px]">Account</span>
        </button>
      </div>
    </motion.div>
  );
};
