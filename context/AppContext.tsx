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

// --- НОВЫЕ ИНТЕРФЕЙСЫ ДЛЯ ПЕЧАТИ ---
export type PrintSize = '10x15' | '15x20' | 'A4' | 'A3';

export interface CartItem {
  id: string; // Уникальный ID (filename + size)
  filename: string;
  thumb_url: string;
  size: PrintSize;
  quantity: number;
  price: number;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  refreshSessions: () => Promise<void>;
  sessions: GallerySession[];
  isMounted: boolean;
  // Методы корзины
  cart: CartItem[];
  addToCart: (items: CartItem[]) => void;
  updateCartItem: (id: string, quantity: number, size?: PrintSize) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Прайслист зашит в константу
export const PRINT_PRICES: Record<PrintSize, number> = {
  '10x15': 1.50,
  '15x20': 3.00,
  'A4': 8.00,
  'A3': 15.00
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('fr');
  const [sessions, setSessions] = useState<GallerySession[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // 1. Инициализация при первом запуске (с умным авто-определением языка и загрузкой корзины)
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

  // --- ЛОГИКА КОРЗИНЫ ---
  useEffect(() => {
    const savedCart = localStorage.getItem('kurginian_print_cart');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('kurginian_print_cart', JSON.stringify(newCart));
  };

  const addToCart = (items: CartItem[]) => {
    const newCart = [...cart];
    items.forEach(newItem => {
      const existingIndex = newCart.findIndex(item => item.id === newItem.id);
      if (existingIndex >= 0) {
        newCart[existingIndex].quantity += newItem.quantity;
      } else {
        newCart.push(newItem);
      }
    });
    saveCart(newCart);
  };

  const updateCartItem = (id: string, quantity: number, newSize?: PrintSize) => {
    let newCart = [...cart];
    const index = newCart.findIndex(item => item.id === id);
    if (index >= 0) {
      if (quantity <= 0) {
        newCart.splice(index, 1);
      } else {
        newCart[index].quantity = quantity;
        if (newSize) {
          // Меняем размер и пересчитываем ID и цену
          newCart[index].size = newSize;
          newCart[index].price = PRINT_PRICES[newSize];
          newCart[index].id = `${newCart[index].filename}_${newSize}`;
          
          // Проверяем, не слился ли он с уже существующим таким же размером
          const duplicateIndex = newCart.findIndex((item, i) => item.id === newCart[index].id && i !== index);
          if (duplicateIndex >= 0) {
            newCart[duplicateIndex].quantity += newCart[index].quantity;
            newCart.splice(index, 1);
          }
        }
      }
      saveCart(newCart);
    }
  };

  const removeFromCart = (id: string) => {
    saveCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => saveCart([]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kurginian_global_lang', lang);
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, sessions, refreshSessions: scanSessions, isMounted, cart, addToCart, updateCartItem, removeFromCart, clearCart }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};