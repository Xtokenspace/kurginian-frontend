'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'fr' | 'en' | 'ru';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  refreshSessions: () => void;
  sessions: any[]; // Можно типизировать строже по аналогии с GallerySession
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('fr');
  const [sessions, setSessions] = useState<any[]>([]);

  // 1. Инициализация при первом запуске
  useEffect(() => {
    const savedLang = localStorage.getItem('kurginian_global_lang') as Language;
    if (savedLang) setLanguageState(savedLang);
    scanSessions();
    
    // Слушаем изменения в localStorage из других вкладок
    window.addEventListener('storage', scanSessions);
    return () => window.removeEventListener('storage', scanSessions);
  }, []);

  // 2. Умный сканер сессий (Single Source of Truth)
  const scanSessions = () => {
    const found: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('vip_code_')) {
        const slug = key.replace('vip_code_', '');
        found.push({ id: `vip_${slug}`, slug, type: 'vip', rawKey: key });
      } else if (key.startsWith('photos_')) {
        const slug = key.replace('photos_', '');
        try {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          if (data.length > 0) {
            found.push({ id: `guest_${slug}`, slug, type: 'guest', count: data.length, rawKey: key });
          }
        } catch (e) {}
      }
    }
    setSessions(found);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kurginian_global_lang', lang);
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, sessions, refreshSessions: scanSessions }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};