import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  Globe, 
  LogOut, 
  Settings,
  MapPin
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.tsx';
import { LANGUAGE_META, LanguageCode } from '../i18n/translations.ts';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isSoundMuted: boolean;
  onToggleSound: () => void;
  currentLang: LanguageCode;
  onChangeLang: (code: LanguageCode) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  onNavigateAbout: () => void;
}

export const SettingsPopup: React.FC<SettingsPopupProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  isSoundMuted,
  onToggleSound,
  currentLang,
  onChangeLang,
  isLoggedIn,
  onLogout,
  onNavigateAbout,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/20 backdrop-blur-xs"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20, x: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0, x: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20, x: 20 }}
            className="relative w-full max-w-xs bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden transition-colors"
          >
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-bold tracking-tight">{t('settingsMenuTitle')}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Theme Toggle */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Appearance</span>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    {theme === 'light' ? (
                      <Moon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-sm font-medium">{theme === 'light' ? t('themeDark') : t('themeLight')}</span>
                  </div>
                  <div className="w-8 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 relative">
                    <motion.div
                      animate={{ x: theme === 'light' ? 2 : 18 }}
                      className="absolute top-1 w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100"
                    />
                  </div>
                </button>
              </div>

              {/* Sound Toggle */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Feedback</span>
                <button
                  type="button"
                  onClick={onToggleSound}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    {isSoundMuted ? (
                      <VolumeX className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-[#00C1FD]" />
                    )}
                    <span className="text-sm font-medium">{isSoundMuted ? t('soundOff') : t('soundOn')}</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isSoundMuted ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                    <motion.div
                      animate={{ x: isSoundMuted ? 2 : 18 }}
                      className={`absolute top-1 w-2 h-2 rounded-full ${isSoundMuted ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-emerald-600'}`}
                    />
                  </div>
                </button>
              </div>

              {/* Language Selector */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('languageLabel')}</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['en', 'hi', 'pa'] as LanguageCode[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onChangeLang(code)}
                      className={`px-2 py-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                        currentLang === code
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      {LANGUAGE_META[code].nativeLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout */}
              {isLoggedIn && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer font-bold text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('logoutBtn')}</span>
                  </button>
                </div>
              )}
              {/* About Us Navigation Button */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateAbout();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all cursor-pointer group bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-red-500 fill-current" />
                    <span className="text-xs font-bold tracking-tight">About Us &amp; Workshop Location</span>
                  </div>
                  <span className="font-mono text-xs">→</span>
                </button>
              </div>
            </div>

            <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                Official Sonu Diesel Bhatti System
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
