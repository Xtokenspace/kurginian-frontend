// === ФАЙЛ: app/weddings/[slug]/admin/page.tsx (VIP-ГАЛЕРЕЯ) ===

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Gallery from '@/components/Gallery';

interface MatchedPhoto {
  filename: string;
  width: number;
  height: number;
  urls: { web: string; thumb: string; };
}

// Добавляем объект с переводами для меню
const translations = {
  fr: {
    downloadAll: "Télécharger toutes les photos",
    contactPhotographer: "Suivre sur Instagram",
    discoverServices: "Découvrir mon univers",
    statsTitle: "Statistiques de l'événement",
    statScans: "Visages scannés",
    statDownloads: "Photos téléchargées",
    statShares: "Partages effectués",
    statSaves: "Enregistrements complets",
  },
  en: {
    downloadAll: "Download all photos",
    contactPhotographer: "Follow on Instagram",
    discoverServices: "Discover my work",
    statsTitle: "Event Statistics",
    statScans: "Faces scanned",
    statDownloads: "Photos downloaded",
    statShares: "Shares made",
    statSaves: "Total saves",
  },
  ru: {
    downloadAll: "Скачать все фото",
    contactPhotographer: "Подписаться в Instagram",
    discoverServices: "Узнать о моих услугах",
    statsTitle: "Статистика мероприятия",
    statScans: "Лиц распознано",
    statDownloads: "Фото скачано",
    statShares: "Поделились",
    statSaves: "Общих сохранений",
  }
} as const;

export default function AdminGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ scans: 0, downloads: 0, shares: 0, save_all: 0 });
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  // Новое состояние для меню
  const [showMenu, setShowMenu] = useState(false);

  const t = translations[language];

  useEffect(() => {
    // 1. Подхватываем язык
    const globalLang = localStorage.getItem('kurginian_global_lang') as 'fr' | 'en' | 'ru';
    const localLang = localStorage.getItem(`lang_${slug}`) as 'fr' | 'en' | 'ru';
    if (globalLang) setLanguage(globalLang);
    else if (localLang) setLanguage(localLang);

    // 2. Ищем VIP-пароль
    const vipCode = localStorage.getItem(`vip_code_${slug}`);
    if (!vipCode) {
      router.replace(`/weddings/${slug}`);
      return;
    }

    // 3. Запрашиваем ВСЕ фото
    const fetchAllPhotos = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        
        // 1. Запрос фотографий
        const response = await fetch(`${apiUrl}/api/weddings/${slug}/verify-vip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: vipCode }),
        });

        if (response.ok) {
          const data = await response.json();
          const sortedPhotos = data.data.sort((a: MatchedPhoto, b: MatchedPhoto) => 
            a.filename.localeCompare(b.filename)
          );
          setPhotos(sortedPhotos);

          // 2. ЗАПРОС АНАЛИТИКИ (Запускаем сразу после успеха авторизации)
          const statsRes = await fetch(`${apiUrl}/api/weddings/${slug}/analytics-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: vipCode }),
          });
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStats(statsData.data);
          }
        } else {
          localStorage.removeItem(`vip_code_${slug}`);
          router.replace(`/weddings/${slug}`);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPhotos();
  }, [slug, router]);

  const handleLogout = () => {
    localStorage.removeItem(`vip_code_${slug}`);
    router.push(`/weddings/${slug}`);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-lux-bg flex items-center justify-center">
        <motion.p 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="font-cinzel text-xl text-lux-gold tracking-widest uppercase"
        >
          {language === 'ru' ? 'Загрузка архива...' : language === 'en' ? 'Loading archive...' : 'Chargement de l\'archive...'}
        </motion.p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-lux-bg text-lux-text font-montserrat p-6 relative">
      
      {/* УМНЫЙ ГЛОБУС ЯЗЫКОВ (Всегда фиксирован сверху справа) */}
      <div className="fixed top-6 right-6 z-[100]">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl px-4 py-2 text-sm font-medium shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all text-gray-300"
          >
            <span className="text-sm md:text-base">{language.toUpperCase()}</span>
            <span className="text-lg md:text-xl">🌐</span>
          </button>

          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-12 right-0 bg-lux-card border border-lux-gold/30 rounded-3xl p-1 shadow-2xl flex flex-col w-28 z-50"
              >
                {(['fr', 'en', 'ru'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      // Тут вызывай свою функцию смены языка, например setLanguage(lang)
                      setShowLangMenu(false);
                    }}
                    className={`px-6 py-3 text-left rounded-3xl transition-all ${
                      language === lang ? 'bg-lux-gold text-black font-bold' : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* МЕНЮ БУРГЕР / КРЕСТИК (Фиксировано СПРАВА СНИЗУ) */}
      <button 
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
          setShowMenu(!showMenu);
        }}
        className="fixed bottom-6 right-6 z-[105] bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 w-14 h-14 rounded-full flex items-center justify-center shadow-gold-glow hover:bg-lux-gold hover:scale-105 group transition-all"
      >
        {/* Анимация превращения 2-х полосок бургера в крестик (Х) */}
        <span className={`w-6 h-0.5 bg-lux-gold group-hover:bg-black transition-all duration-300 absolute ${showMenu ? 'rotate-45' : '-translate-y-1.5'}`}></span>
        <span className={`w-6 h-0.5 bg-lux-gold group-hover:bg-black transition-all duration-300 absolute ${showMenu ? '-rotate-45' : 'translate-y-1.5'}`}></span>
      </button>

      {/* КНОПКА ДОМОЙ И VIP ИНДИКАТОР (Скроллятся вместе со страницей) */}
      <div className="absolute top-6 left-6 z-[60] flex flex-col items-start gap-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl px-5 py-2.5 text-sm font-medium hover:bg-lux-gold hover:text-black text-gray-300 transition-all shadow-lg group"
        >
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
          <span className="hidden md:inline uppercase tracking-widest">
            {language === 'ru' ? 'Домой' : language === 'en' ? 'Home' : 'Accueil'}
          </span>
        </button>
        
        <div className="bg-lux-gold text-black px-4 py-2 rounded-3xl font-cinzel font-bold text-xs tracking-[0.2em] shadow-gold-glow">
          VIP ACCESS
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto pt-24 pb-20">
        <div className="mb-12 text-center md:text-left">
          <h1 className="font-cinzel text-3xl md:text-5xl text-lux-gold mb-4 uppercase tracking-widest">
            {language === 'ru' ? 'Все фотографии' : language === 'en' ? 'All Photos' : 'Toutes les photos'}
          </h1>
          <p className="font-cormorant text-xl text-gray-400 italic">
            {photos.length} {language === 'ru' ? 'снимков' : 'photos'}
          </p>
        </div>

        {/* === PREMIUM ANALYTICS DASHBOARD (Скрыто для клиентов, логика оставлена для Super Admin) === */}
        {/* <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h2 className="font-cinzel text-xs tracking-[0.3em] text-lux-gold/50 uppercase mb-6 text-center md:text-left">
            {t.statsTitle}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t.statScans, value: stats.scans, icon: "👤" },
              { label: t.statDownloads, value: stats.downloads, icon: "↓" },
              { label: t.statShares, value: stats.shares, icon: "↗" },
              { label: t.statSaves, value: stats.save_all, icon: "✨" }
            ].map((item, idx) => (
              <div key={idx} className="bg-lux-card/40 border border-lux-gold/10 p-6 rounded-sm shadow-lg hover:border-lux-gold/30 transition-colors group">
                <div className="text-2xl mb-2 opacity-50 group-hover:opacity-100 transition-opacity">{item.icon}</div>
                <div className="text-2xl md:text-3xl font-cinzel text-lux-gold mb-1 leading-none">
                  {item.value}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        */}

        {/* Галерея */}
        <Gallery photos={photos} slug={slug} />
      </div>

      {/* МОДАЛЬНОЕ МЕНЮ (PREMIUM BOTTOM SHEET) */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Затемнение заднего фона */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                setShowMenu(false);
              }}
              className="fixed inset-0 bg-black/70 md:backdrop-blur-sm z-[100] will-change-[opacity]"
            />

            {/* Сама шторка меню */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              // Используем tween вместо spring для моментального старта, с iOS-подобным смягчением в конце
              transition={{ type: "tween", duration: 0.25, ease: [0.2, 0.9, 0.3, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col items-center will-change-transform"
            >
              <div className="w-full max-w-md bg-[#0F0F0F] border-t border-white/10 rounded-t-3xl p-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                
                {/* Индикатор свайпа (Pill) */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8" />

                <div className="space-y-3">
                  
                  {/* Кнопка Instagram */}
                  <button
                    onClick={() => { 
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                      setShowMenu(false); 
                      window.open("https://www.instagram.com/hdart26/", "_blank"); 
                    }}
                    className="w-full bg-transparent hover:bg-white/5 transition-colors rounded-2xl flex items-center gap-4 p-5 group"
                  >
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-lux-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <span className="text-gray-300 group-hover:text-white transition-colors text-sm uppercase tracking-wider font-medium">{t.contactPhotographer}</span>
                  </button>
                  
                  {/* Кнопка Сайта */}
                  <button
                    onClick={() => { 
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                      setShowMenu(false); 
                      window.open("https://kurginian.pro", "_blank"); 
                    }}
                    className="w-full bg-transparent hover:bg-white/5 transition-colors rounded-2xl flex items-center gap-4 p-5 group"
                  >
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-lux-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <span className="text-gray-300 group-hover:text-white transition-colors text-sm uppercase tracking-wider font-medium">{t.discoverServices}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}