'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');

  useEffect(() => {
    // 0. ТИХАЯ РЕГИСТРАЦИЯ SERVICE WORKER (Для чистой иконки на Android)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW ref:', err));
    }
    
    // 1. Устанавливаем язык
    const globalLang = localStorage.getItem('kurginian_global_lang') as 'fr' | 'en' | 'ru';
    if (globalLang) setLanguage(globalLang);

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
        className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-lux-card/95 backdrop-blur-xl border border-lux-gold/30 rounded-2xl p-5 shadow-gold-glow z-[200]"
      >
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-4 text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>
        
        <div className="flex gap-4 items-start">
          <div className="w-12 h-12 rounded-xl bg-lux-gold/20 flex items-center justify-center flex-shrink-0 border border-lux-gold/50">
            <span className="text-2xl">📱</span>
          </div>
          
          <div className="flex-1 pr-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1">
              {t.title}
            </h3>
            <p className="text-gray-400 text-xs mb-4 leading-relaxed">
              {t.desc}
            </p>

            {isIOS ? (
              <div className="bg-white/5 rounded-lg p-3 text-xs text-gray-300">
                {t.iosStep1} <span className="inline-block mx-1 bg-white/20 p-1 rounded">↗</span> (Share) <br className="mt-1"/>
                {t.iosStep2} <strong>+</strong>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full bg-lux-gold text-black py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors"
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