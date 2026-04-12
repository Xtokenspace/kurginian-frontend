'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'fr' | 'en' | 'ru';

export interface GallerySession {
  id: string;
  slug: string;
  title: string;
  type: 'vip' | 'guest';
  count?: number;
  rawKey: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  refreshSessions: () => Promise<void>;   // ← исправлено
  sessions: GallerySession[];             // ← исправлено (убран any)
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('fr');
  const [sessions, setSessions] = useState<GallerySession[]>([]);

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
  const scanSessions = async () => {
    const found: GallerySession[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (key.startsWith('vip_code_') || key.startsWith('photos_')) {
        const isVip = key.startsWith('vip_code_');
        const slug = key.replace(isVip ? 'vip_code_' : 'photos_', '');
        
        let finalTitle: string = localStorage.getItem(`title_${slug}`) || '';

        // Если красивого названия ещё нет в localStorage — запрашиваем с сервера
        if (!finalTitle) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${apiUrl}/api/weddings/${slug}/meta`);
            if (res.ok) {
              const json = await res.json();
              if (json.status === 'success' && json.data?.title) {
                finalTitle = json.data.title;
                // Сохраняем навсегда, чтобы больше не запрашивать
                localStorage.setItem(`title_${slug}`, finalTitle);
              }
            }
          } catch (e) {
            // Тихо падаем — используем fallback из слага
          }
        }

        // Если и с сервера не получилось — fallback из слага
        if (!finalTitle) {
          finalTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        if (isVip) {
          found.push({ id: `vip_${slug}`, slug, title: finalTitle, type: 'vip', rawKey: key });
        } else {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (data.length > 0) {
              found.push({ id: `guest_${slug}`, slug, title: finalTitle, type: 'guest', count: data.length, rawKey: key });
            }
          } catch (e) {}
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