'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'fr' | 'en' | 'ru';

export interface GallerySession {
  id: string;
  slug: string;
  title: string;
  cover?: string;
  type: 'vip' | 'guest';
  count?: number;
  rawKey: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  refreshSessions: () => Promise<void>;
  sessions: GallerySession[];
  isMounted: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('fr');
  const [sessions, setSessions] = useState<GallerySession[]>([]);
  const [isMounted, setIsMounted] = useState(false);

    // 1. Инициализация при первом запуске (с умным авто-определением языка)
  useEffect(() => {
    setIsMounted(true);
    const savedLang = localStorage.getItem('kurginian_global_lang') as Language;
    
    if (savedLang) {
      // Если язык уже был сохранен ранее — используем его
      setLanguageState(savedLang);
    } else if (typeof navigator !== 'undefined' && navigator.language) {
      // МАГИЯ UX: Если гость тут впервые, читаем язык его устройства!
      const browserLang = navigator.language.toLowerCase();
      let detectedLang: Language = 'fr'; // По умолчанию ставим французский

      if (browserLang.startsWith('en')) {
        detectedLang = 'en';
      } else if (browserLang.startsWith('ru') || browserLang.startsWith('uk') || browserLang.startsWith('be')) {
        // Умный захват СНГ-региона (русский, украинский, белорусский)
        detectedLang = 'ru';
      } else if (browserLang.startsWith('fr')) {
        detectedLang = 'fr';
      }

      setLanguageState(detectedLang);
      localStorage.setItem('kurginian_global_lang', detectedLang); // Сразу сохраняем, чтобы не проверять каждый раз
    }
    
    scanSessions();
    
    // Слушаем изменения в localStorage из других вкладок
    window.addEventListener('storage', scanSessions);
    return () => window.removeEventListener('storage', scanSessions);
  }, []);

  const scanSessions = async () => {
    // Освобождаем главный поток (Event Loop) для плавной отрисовки UI
    await new Promise(resolve => setTimeout(resolve, 0));

    const found: GallerySession[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (key.startsWith('vip_code_') || key.startsWith('photos_')) {
        const isVip = key.startsWith('vip_code_');
        const slug = key.replace(isVip ? 'vip_code_' : 'photos_', '');
        
        let finalTitle = localStorage.getItem(`title_${slug}`) || '';
        let finalCover = localStorage.getItem(`cover_${slug}`) || '';

        // Если данных нет — запрашиваем один раз
        if (!finalTitle || !finalCover) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${apiUrl}/api/weddings/${slug}/meta`);
            if (res.ok) {
              const json = await res.json();
              if (json.status === 'success') {
                if (json.data.title) {
                  finalTitle = json.data.title;
                  localStorage.setItem(`title_${slug}`, finalTitle);
                }
                if (json.data.covers?.[0]) {
                  finalCover = json.data.covers[0];
                  localStorage.setItem(`cover_${slug}`, finalCover);
                }
              }
            }
          } catch (e) {}
        }

        if (!finalTitle) finalTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        const sessionData: GallerySession = { 
          id: `${isVip ? 'vip' : 'guest'}_${slug}`, 
          slug, 
          title: finalTitle, 
          cover: finalCover || undefined,
          type: isVip ? 'vip' : 'guest', 
          rawKey: key 
        };

        if (!isVip) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (data.length > 0) {
              sessionData.count = data.length;
              found.push(sessionData);
            }
          } catch (e) {}
        } else {
          found.push(sessionData);
        }
      }
    }
    setSessions(found);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kurginian_global_lang', lang);
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, sessions, refreshSessions: scanSessions, isMounted }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};