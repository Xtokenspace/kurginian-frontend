// === ФАЙЛ: app\weddings\[slug]\photo\[filename]/page.tsx ===

'use client';

import { use, useState, } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';

const translations = {
  fr: {
    title: "Souvenir • 1 photo",
    download: "Télécharger",
    share: "Partager",
    backToGallery: "Retour à la galerie",
    searchAgain: "Nouvelle recherche",
    instagram: "Suivre sur Instagram",
    discover: "Découvrir mon univers",
    thanks: "Merci d'avoir utilisé KURGINIAN Premium Gallery",
    toast: "Lien copié dans le presse-papiers",
    shareText: "Regardez cette magnifique photo dans la KURGINIAN Premium Gallery ✨",
    copyPrompt: "Copiez ce lien :",
    confirmReset: "Êtes-vous sûr ? (Appuyez à nouveau)"
  },
  en: {
    title: "Memory • 1 photo",
    download: "Download",
    share: "Share",
    backToGallery: "Back to gallery",
    searchAgain: "New search",
    instagram: "Follow on Instagram",
    discover: "Discover my work",
    thanks: "Thank you for using KURGINIAN Premium Gallery",
    toast: "Link copied to clipboard",
    shareText: "Take a look at this wonderful photo in the KURGINIAN Premium Gallery ✨",
    copyPrompt: "Copy this link:",
    confirmReset: "Are you sure? (Tap again)"
  },
  ru: {
    title: "Воспоминание • 1 фото",
    download: "Скачать",
    share: "Поделиться",
    backToGallery: "Назад в галерею",
    searchAgain: "Новый поиск",
    instagram: "Подписаться в Instagram",
    discover: "Узнать о моих услугах",
    thanks: "Спасибо, что воспользовались KURGINIAN Premium Gallery",
    toast: "Ссылка скопирована",
    shareText: "Взгляните на эту замечательную фотографию в KURGINIAN Premium Gallery ✨",
    copyPrompt: "Скопируйте ссылку:",
    confirmReset: "Уверены? (Нажмите еще раз)"
  }
} as const;

export default function SinglePhotoPage({ params }: { params: Promise<{ slug: string; filename: string }> }) {
  const resolvedParams = use(params);
  const { slug, filename } = resolvedParams;

  const router = useRouter();
  const photoUrl = `https://cdn.kurginian.pro/${slug}/web/${filename}`;
  
  const [showToast, setShowToast] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false); // <-- СТЕЙТ ЗАЩИТЫ ОТ СЛУЧАЙНОГО УДАЛЕНИЯ

  // === ЯЗЫК (Берем из Контекста) ===
  const { language, setLanguage, refreshSessions } = useAppContext();
  const t = translations[language];

  const handleLanguageChange = (lang: 'fr' | 'en' | 'ru') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    setLanguage(lang);
    setShowLangMenu(false);
  };

  const handleDownload = async () => {
    if (isDownloading) return; // Защита от мульти-клика
    setIsDownloading(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    
    try {
      const fetchUrl = `${photoUrl}?download=${Date.now()}`;
      const response = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' });
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false); // Выключаем спиннер
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    const shareLink = `${window.location.origin}/weddings/${slug}/photo/${filename}?mode=share`;
    
    // Пытаемся вызвать нативную шторку iOS/Android
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KURGINIAN Premium',
          text: t.shareText,
          url: shareLink,
        });
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error(err);
        return;
      }
    }

    // Если нативный шеринг не работает (старый ПК) - просто копируем ссылку
    try {
      await navigator.clipboard.writeText(shareLink);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2800);
    } catch {
      prompt(t.copyPrompt, shareLink);
    }
  };

  return (
    <main className="min-h-screen bg-lux-bg text-lux-text font-montserrat p-6 flex flex-col items-center relative pb-20">

      {/* ВЕРХНЯЯ ПАНЕЛЬ НАВИГАЦИИ (Домой + Языки) */}
      <div className="fixed top-6 left-6 right-6 z-50 flex justify-between items-start pointer-events-none">
        {/* Кнопка НАЗАД (Самая интуитивная кнопка в мире) */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto">
          <button
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
              router.push(`/weddings/${slug}`);
            }}
            className="flex items-center gap-2 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl px-5 py-2.5 text-sm font-medium shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all text-gray-300 group"
          >
            <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
            <span className="hidden md:inline uppercase tracking-widest">{t.backToGallery}</span>
          </button>
        </motion.div>

        {/* ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКОВ (Умный глобус) */}
        <div className="pointer-events-auto relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 hover:border-lux-gold/50 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg hover:bg-lux-gold hover:text-black transition-all text-gray-400 group"
          >
            <span className="uppercase tracking-widest">{language}</span>
            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </button>

          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-9 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl flex flex-col min-w-[70px] z-[60] overflow-hidden"
              >
                {(['fr', 'en', 'ru'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-3 py-2 text-center text-[10px] tracking-widest uppercase rounded-xl transition-all ${
                      language === lang ? 'bg-lux-gold text-black font-bold' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full max-w-4xl pt-24 md:pt-20">
        {/* Заголовок */}
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-cinzel text-lg md:text-2xl text-lux-gold mb-6 text-center tracking-widest uppercase"
        >
          {t.title}
        </motion.h2>

        {/* БОЛЬШОЕ ФОТО */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-lux-gold/30 rounded-sm overflow-hidden shadow-2xl relative h-[60vh] md:h-[75vh] w-full bg-[#070707]"
          >
            {!isImageLoaded && (
               <div className="absolute inset-0 flex items-center justify-center">
                 <motion.div animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ repeat: Infinity, duration: 1.5 }} className="font-cinzel text-xs text-lux-gold/50 tracking-widest">
                   KURGINIAN
                 </motion.div>
               </div>
            )}
            
            <Image
              src={photoUrl}
              alt={filename}
              fill
              className={`object-contain transition-opacity duration-1000 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
              quality={95}
              priority
              onLoad={() => setIsImageLoaded(true)}
              sizes="(max-width: 1024px) 100vw, 1200px"
            />
          </motion.div>
        </div>

        {/* 🔥 ГЛАВНАЯ ИННОВАЦИЯ: PREMIUM ACTION BAR ПОД ФОТО 🔥 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full mt-4 flex gap-3"
        >
          {/* Золотая кнопка скачивания (Главный акцент) */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-[3] flex items-center justify-center gap-3 bg-lux-gold text-black px-6 py-4 rounded-sm transition-all active:scale-[0.98] shadow-gold-glow hover:bg-white font-bold disabled:opacity-80"
          >
            {isDownloading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <span className="text-xl leading-none">↓</span>
            )}
            <span className="uppercase tracking-widest text-xs md:text-sm">
              {isDownloading 
                ? (language === 'ru' ? 'ЗАГРУЗКА...' : language === 'fr' ? 'CHARGEMENT...' : 'DOWNLOADING...') 
                : t.download}
            </span>
          </button>
          
          {/* Темная кнопка "Поделиться" */}
          <button
            onClick={handleShare}
            className="flex-[2] flex items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-lux-gold/30 text-lux-gold px-4 py-4 rounded-sm transition-all active:scale-[0.98] shadow-lg"
          >
            <span className="text-lg leading-none">↗</span>
            <span className="font-medium uppercase tracking-widest text-xs">{t.share}</span>
          </button>
        </motion.div>

        {/* БЛОК СВЯЗИ С ФОТОГРАФОМ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 border-t border-white/5 pt-12 text-center"
        >
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                window.open("https://www.instagram.com/hdart26/", "_blank");
              }}
              className="flex-1 px-8 py-4 border border-white/10 text-gray-400 hover:border-lux-gold hover:text-lux-gold transition-all flex items-center justify-center gap-3 rounded-sm text-xs uppercase tracking-widest group"
            >
              <svg className="w-4 h-4 text-gray-400 group-hover:text-lux-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              {t.instagram}
            </button>
            <button
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                window.open("https://kurginian.pro", "_blank");
              }}
              className="flex-1 px-8 py-4 bg-[#0a0a0a] border border-white/10 text-white hover:border-lux-gold hover:bg-[#111] transition-all flex items-center justify-center gap-3 rounded-sm text-xs uppercase tracking-widest group"
            >
              <svg className="w-4 h-4 text-white group-hover:text-lux-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              {t.discover}
            </button>
          </div>
        </motion.div>

        {/* НИЖНИЙ КОЛОНТИТУЛ (Безопасный "Новый поиск") */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center space-y-6"
        >
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            {t.thanks}
          </p>
          
          {/* Умная деструктивная кнопка (Защита от случайного клика) */}
          <button
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
              
              if (!confirmReset) {
                setConfirmReset(true);
                setTimeout(() => setConfirmReset(false), 3000); // Сбрасываем через 3 секунды
                return;
              }
              
              localStorage.removeItem(`photos_${slug}`);
              localStorage.removeItem(`title_${slug}`);
              localStorage.removeItem(`expires_${slug}`);
              refreshSessions(); // <-- Обновляем дашборд!
              router.push(`/weddings/${slug}`);
            }}
            className={`text-[10px] uppercase tracking-[0.2em] underline underline-offset-4 transition-colors duration-300 ${
              confirmReset 
                ? 'text-red-500 decoration-red-500 font-bold' 
                : 'text-gray-500 hover:text-red-400 decoration-transparent hover:decoration-red-400/50'
            }`}
          >
            {confirmReset ? t.confirmReset : t.searchAgain}
          </button>
        </motion.div>

      </div>

      {/* Уведомление об успешном копировании ссылки */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 bg-lux-gold text-black px-6 py-3 rounded-sm font-bold shadow-gold-glow flex items-center gap-2 z-[200] text-xs uppercase tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {t.toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}