'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';

// --- ПЕРЕВОДЫ ---
const translations = {
  fr: {
    title: "Installer l'application",
    desc: "Installez KURGINIAN pour un accès instantané à vos photos hors ligne.",
    installBtn: "Installer",
    iosStep1: "Appuyez sur",
    iosStep2: "puis sur « Sur l'écran d'accueil »",
  },
  en: {
    title: "Install App",
    desc: "Install KURGINIAN for instant offline access to your photos.",
    installBtn: "Install Now",
    iosStep1: "Tap",
    iosStep2: "then « Add to Home Screen »",
  },
  ru: {
    title: "Установить приложение",
    desc: "Установите KURGINIAN для быстрого доступа к фото даже без интернета.",
    installBtn: "Установить",
    iosStep1: "Нажмите",
    iosStep2: "затем « На экран 'Домой' »",
  }
} as const;

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { language } = useAppContext(); // Получаем глобальный язык

  useEffect(() => {
    // 0. ТИХАЯ РЕГИСТРАЦИЯ SERVICE WORKER (Для чистой иконки на Android)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW ref:', err));
    }

    // 2. Проверяем, не закрывал ли юзер баннер недавно
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 1000 * 60 * 60 * 24 * 7) {
      return; // Не показываем 7 дней, если юзер закрыл
    }

    // 3. Проверяем, установлено ли уже приложение (Standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // 4. Определяем ОС (iOS)
    const ua = window.navigator.userAgent;
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isMacWithTouch = ua.includes('Mac') && 'ontouchend' in document;
    if (isIPad || isIPhone || isMacWithTouch) {
      setIsIOS(true);
      // Для iOS показываем с небольшой задержкой, чтобы не пугать сразу при входе
      setTimeout(() => setShowPrompt(true), 3000); 
    }

    // 5. Перехватываем нативный баннер Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const t = translations[language];

  const handleInstallClick = async () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 100 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.y > 50) handleDismiss();
        }}
        className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[200] touch-none will-change-transform"
      >
        {/* Индикатор свайпа для баннера */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/20 rounded-full md:hidden" />

        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-500 hover:text-white p-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex gap-4 items-start mt-2">
          {/* Премиум иконка телефона */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lux-gold/20 to-transparent flex items-center justify-center flex-shrink-0 border border-lux-gold/30 shadow-inner">
            <svg className="w-6 h-6 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          
          <div className="flex-1 pr-6">
            <h3 className="text-lux-gold font-cinzel font-bold text-sm uppercase tracking-widest mb-1.5">
              {t.title}
            </h3>
            <p className="text-gray-400 text-xs mb-5 leading-relaxed font-medium">
              {t.desc}
            </p>

            {isIOS ? (
              <div className="bg-[#111] border border-white/5 rounded-xl p-3.5 text-[11px] text-gray-300 shadow-inner leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {t.iosStep1} 
                  <span className="inline-flex items-center justify-center bg-white/10 p-1 rounded-md text-lux-gold">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </span> 
                  (Share)
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  {t.iosStep2} 
                  <span className="inline-flex items-center justify-center border border-gray-500 rounded p-0.5 text-white">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full bg-lux-gold text-black py-3 rounded-lg font-bold text-xs uppercase tracking-[0.2em] hover:bg-white shadow-gold-glow active:scale-95 transition-all"
              >
                {t.installBtn}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}