'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'fr' | 'en' | 'ru';

export interface GallerySession {
  id: string;
  slug: string;
  title: string;
  cover?: string;
  focus?: string; // <-- НОВОЕ: ИИ-фокус кадрирования (Golden Headroom)
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
  // Методы корзины (Изолированы по проектам)
  cart: Record<string, CartItem[]>;
  getCartForSlug: (slug: string) => CartItem[];
  addToCart: (slug: string, items: CartItem[]) => void;
  updateCartItem: (slug: string, id: string, quantity: number, size?: PrintSize) => void;
  removeFromCart: (slug: string, id: string) => void;
  clearCart: (slug: string) => void;
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
  const [cart, setCart] = useState<Record<string, CartItem[]>>({});

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
    
    // 💎 PREMIUM SYNC: Синхронизация всех состояний (Сессии, Корзина, Язык) между вкладками
    const handleStorageChange = (e: StorageEvent) => {
      // 1. Синхронизация корзины
      if (e.key === 'kurginian_print_cart_v2') {
        try {
          const newCart = e.newValue ? JSON.parse(e.newValue) : {};
          setCart(newCart);
        } catch (err) { console.error("Sync Cart Error", err); }
      }
      // 2. Синхронизация языка
      if (e.key === 'kurginian_global_lang' && e.newValue) {
        setLanguageState(e.newValue as Language);
      }
      // 3. Синхронизация сессий (если изменились ключи доступов)
      if (!e.key || e.key.startsWith('vip_code_') || e.key.startsWith('photos_') || e.key.startsWith('expires_')) {
        scanSessions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const scanSessions = async () => {
    // Освобождаем главный поток (Event Loop) для плавной отрисовки UI
    await new Promise(resolve => setTimeout(resolve, 0));

    const found: GallerySession[] = [];
    
    // ИСПРАВЛЕНИЕ 1: Собираем статический слепок ключей. 
    // Динамическая итерация (localStorage.length) ломается при удалении элементов внутри цикла!
    const storageKeys = Object.keys(localStorage);
    
    for (const key of storageKeys) {
      if (key.startsWith('vip_code_') || key.startsWith('photos_')) {
        const isVip = key.startsWith('vip_code_');
        const slug = key.replace(isVip ? 'vip_code_' : 'photos_', '');
        
        // --- THE REAPER (Локальная очистка): Превентивное удаление мертвых сессий ---
        const finalExpires = localStorage.getItem(`expires_${slug}`);
        if (finalExpires && new Date(finalExpires).getTime() < Date.now()) {
          localStorage.removeItem(`vip_code_${slug}`);
          localStorage.removeItem(`photos_${slug}`);
          localStorage.removeItem(`title_${slug}`);
          localStorage.removeItem(`cover_${slug}`);
          localStorage.removeItem(`focus_${slug}`);
          localStorage.removeItem(`expires_${slug}`);
          localStorage.removeItem(`vip_prompt_shown_${slug}`);
          continue; // Блокируем показ на дашборде
        }
        
        let finalTitle = localStorage.getItem(`title_${slug}`) || '';
        let finalCover = localStorage.getItem(`cover_${slug}`) || '';
        let finalFocus = localStorage.getItem(`focus_${slug}`) || '50% 50%';

        // 💎 NETWORK OPTIMIZATION: Запрашиваем мету только если её нет в памяти И в локальном кэше текущей сессии
        // Это предотвращает "шторм" запросов при ререндерах или синхронизации вкладок
        if (!finalTitle || !finalCover) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            // Используем кэш браузера для GET запроса меты
            const res = await fetch(`${apiUrl}/api/weddings/${slug}/meta`, { cache: 'force-cache' });
            if (res.ok) {
              const json = await res.json();
              
              // --- THE REAPER (Сетевая очистка): Защита от ручного удаления на бэкенде ---
              if (json.status === 'expired') {
                localStorage.removeItem(`vip_code_${slug}`);
                localStorage.removeItem(`photos_${slug}`);
                continue; // Блокируем показ на дашборде
              }

              if (json.status === 'success') {
                if (json.data.title) {
                  finalTitle = json.data.title;
                  localStorage.setItem(`title_${slug}`, finalTitle);
                }
                // Проверяем наличие умных обложек (covers_data)
                if (json.data.covers_data?.[0]) {
                  finalCover = json.data.covers_data[0].url;
                  finalFocus = `${json.data.covers_data[0].focus_x * 100}% ${json.data.covers_data[0].focus_y * 100}%`;
                  localStorage.setItem(`cover_${slug}`, finalCover);
                  localStorage.setItem(`focus_${slug}`, finalFocus);
                } else if (json.data.covers?.[0]) {
                  finalCover = json.data.covers[0];
                  finalFocus = '50% 50%';
                  localStorage.setItem(`cover_${slug}`, finalCover);
                  localStorage.setItem(`focus_${slug}`, finalFocus);
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
          focus: finalFocus, // <-- Передаем ИИ-фокус в карточки дашборда
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

  // --- ЛОГИКА КОРЗИНЫ (Изолированная по проектам) ---
  useEffect(() => {
    const savedCart = localStorage.getItem('kurginian_print_cart_v2');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    } else {
      // Миграция старой плоской корзины, если она осталась (защита от потери заказов)
      const legacyCart = localStorage.getItem('kurginian_print_cart');
      if (legacyCart) {
         localStorage.removeItem('kurginian_print_cart');
      }
    }
  }, []);

  const saveCart = (newCart: Record<string, CartItem[]>) => {
    setCart(newCart);
    localStorage.setItem('kurginian_print_cart_v2', JSON.stringify(newCart));
  };

  const getCartForSlug = (slug: string): CartItem[] => {
    return cart[slug] || [];
  };

  const addToCart = (slug: string, items: CartItem[]) => {
    const newCartState = { ...cart };
    const projectCart = [...(newCartState[slug] || [])];
    
    items.forEach(newItem => {
      const existingIndex = projectCart.findIndex(item => item.id === newItem.id);
      if (existingIndex >= 0) {
        projectCart[existingIndex].quantity += newItem.quantity;
      } else {
        projectCart.push(newItem);
      }
    });
    
    newCartState[slug] = projectCart;
    saveCart(newCartState);
  };

  const updateCartItem = (slug: string, id: string, quantity: number, newSize?: PrintSize) => {
    const newCartState = { ...cart };
    if (!newCartState[slug]) return;
    
    let projectCart = [...newCartState[slug]];
    const index = projectCart.findIndex(item => item.id === id);
    
    if (index >= 0) {
      if (quantity <= 0) {
        projectCart.splice(index, 1);
      } else {
        projectCart[index].quantity = quantity;
        if (newSize) {
          projectCart[index].size = newSize;
          projectCart[index].price = PRINT_PRICES[newSize];
          projectCart[index].id = `${projectCart[index].filename}_${newSize}`;
          
          // 💎 CLEAN MERGE: Если после смены размера такой товар уже есть — объединяем и чистим
          const duplicateIndex = projectCart.findIndex((item, i) => item.id === projectCart[index].id && i !== index);
          if (duplicateIndex >= 0) {
            projectCart[duplicateIndex] = {
              ...projectCart[duplicateIndex],
              quantity: projectCart[duplicateIndex].quantity + projectCart[index].quantity
            };
            projectCart = projectCart.filter((_, i) => i !== index);
          }
        }
      }
      newCartState[slug] = projectCart;
      saveCart(newCartState);
    }
  };

  const removeFromCart = (slug: string, id: string) => {
    const newCartState = { ...cart };
    if (newCartState[slug]) {
      newCartState[slug] = newCartState[slug].filter(item => item.id !== id);
      saveCart(newCartState);
    }
  };

  const clearCart = (slug: string) => {
    const newCartState = { ...cart };
    delete newCartState[slug]; // <-- ПОЛНОЕ УДАЛЕНИЕ ИЗ ПАМЯТИ: убивает Phantom Leak
    saveCart(newCartState);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kurginian_global_lang', lang);
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, sessions, refreshSessions: scanSessions, isMounted, cart, getCartForSlug, addToCart, updateCartItem, removeFromCart, clearCart }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};