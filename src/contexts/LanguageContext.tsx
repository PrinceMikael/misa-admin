'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type Locale = 'sw' | 'en';

interface LanguageContextType {
  lang: Locale;
  setLang: (l: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'sw',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('misa-lang') as Locale) || 'sw';
    }
    return 'sw';
  });

  const setLang = (l: Locale) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('misa-lang', l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Returns t(swahili, english) → picks the current locale's string */
export function useTranslation() {
  const { lang } = useContext(LanguageContext);
  return (sw: string, en: string) => (lang === 'sw' ? sw : en);
}
