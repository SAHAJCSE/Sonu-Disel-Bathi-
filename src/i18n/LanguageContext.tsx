import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  LanguageCode,
  LANGUAGE_META,
  translations,
  TranslationKey,
} from './translations.ts';

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (code: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  translateSize: (size: string) => string;
  speechLang: string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'sonu_diesel_bhatti_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'pa')) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'en';
  });

  const setLang = (code: LanguageCode) => {
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKey): string => {
    return translations[lang]?.[key] || translations.en[key] || key;
  };

  const translateSize = (size: string): string => {
    const normalized = size.trim().toLowerCase();
    if (normalized === 'small') return t('sizeSmall');
    if (normalized === 'medium') return t('sizeMedium');
    if (normalized === 'large') return t('sizeLarge');
    if (normalized === 'extra large' || normalized === 'xl') return t('sizeExtraLarge');
    return size;
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t,
        translateSize,
        speechLang: LANGUAGE_META[lang].speechLang,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return ctx;
}
