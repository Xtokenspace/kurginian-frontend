// === ФАЙЛ: app/weddings/[slug]/admin/page.tsx (VIP-ГАЛЕРЕЯ) ===

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Gallery from '@/components/Gallery';
import { useAppContext } from '@/context/AppContext';

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
    loadingArchive: "Chargement de la galerie...",
    home: "Accueil",
    allPhotos: "Toutes les photos",
    photosPlural: "photos",
    archiveUntil: "Votre abonnement premium est actif jusqu'au :",
    extendArchive: "Prolonger l'abonnement",
    paymentTitle: "Extension de l'accès",
    selectPeriod: "Sélectionnez la période de prolongation :",
    plan6m: "6 mois",
    plan1y: "1 an",
    plan5y: "5 ans (Premium)",
    backToPlans: "Retour aux tarifs",
    bankDetails: "Coordonnées bancaires :",
    paymentInstruction: "Veuillez effectuer le virement. Ensuite, cliquez sur le bouton ci-dessous pour envoyer le reçu sur WhatsApp afin d'activer.",
    sendReceipt: "Envoyer le reçu sur WhatsApp",
    whatsappMsg: "Bonjour ! Je souhaite prolonger le projet {slug} pour {plan}. Le reçu de {price}€ est en pièce jointe."
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
    loadingArchive: "Loading gallery...",
    home: "Home",
    allPhotos: "All Photos",
    photosPlural: "photos",
    archiveUntil: "Premium subscription active until:",
    extendArchive: "Extend subscription",
    paymentTitle: "Extend Access",
    selectPeriod: "Select extension period:",
    plan6m: "6 months",
    plan1y: "1 year",
    plan5y: "5 years (Premium)",
    backToPlans: "Back to plans",
    bankDetails: "Bank details:",
    paymentInstruction: "Please make the transfer. Then click the button below to send the receipt via WhatsApp for activation.",
    sendReceipt: "Send receipt via WhatsApp",
    whatsappMsg: "Hello! I want to extend the project {slug} for {plan}. The receipt for {price}€ is attached."
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
    loadingArchive: "Загрузка галереи...",
    home: "Домой",
    allPhotos: "Все фотографии",
    photosPlural: "снимков",
    archiveUntil: "Ваша премиум-подписка активна до:",
    extendArchive: "Продлить подписку",
    paymentTitle: "Продление доступа",
    selectPeriod: "Выберите период продления:",
    plan6m: "6 месяцев",
    plan1y: "1 год",
    plan5y: "5 лет (Премиум)",
    backToPlans: "Назад к тарифам",
    bankDetails: "Банковские реквизиты:",
    paymentInstruction: "Пожалуйста, совершите перевод. Затем нажмите кнопку ниже, чтобы отправить квитанцию в WhatsApp для активации.",
    sendReceipt: "Отправить чек в WhatsApp",
    whatsappMsg: "Здравствуйте! Я хочу продлить проект {slug} на {plan}. Квитанция об оплате на {price}€ в приложении."
  }
} as const;

export default function AdminGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
const [stats, setStats] = useState({ scans: 0, downloads: 0, shares: 0, save_all: 0 });
  const { language, setLanguage } = useAppContext();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [guestClusters, setGuestClusters] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Новое состояние для меню
  const [showMenu, setShowMenu] = useState(false);

  // === УМНЫЙ СЕРВИС КНОПОК "НАЗАД" ДЛЯ ВСЕХ ОВЕРЛЕЕВ ===
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  // === УМНЫЙ ПЕРЕХВАТ КНОПКИ "НАЗАД" БРАУЗЕРА ===
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Делегируем управление Lightbox и GuestFilter компоненту Gallery.
      // Здесь управляем только локальными оверлеями админки (Меню и Оплата),
      // проверяя e.state, чтобы не закрывать их ложно при свайпах из Lightbox.
      
      if (showMenu && !(e.state && e.state.overlay === 'menu')) {
        setShowMenu(false);
      }
      if (showPaymentModal && !(e.state && e.state.overlay === 'payment')) {
        setShowPaymentModal(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showMenu, showPaymentModal]);

  const closeModalSafe = (closeFn: () => void) => {
    closeFn();
    if (window.history.state?.overlay) window.history.back();
  };

  const t = translations[language];

  useEffect(() => {
    // 0. Проверка успешной оплаты Stripe после редиректа
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success')) {
        alert(language === 'ru' ? 'Оплата успешно завершена! Доступ продлен.' : language === 'fr' ? 'Paiement réussi ! Accès prolongé.' : 'Payment successful! Access extended.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    // 1. Ищем VIP-пароль
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
          setExpiresAt(data.expires_at);
          setGuestClusters(data.guest_clusters);

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

  // === ВЫЗОВ STRIPE API ===
  const handleStripeCheckout = async (plan: { months: number; price: number; label: string }) => {
    setIsProcessingPayment(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: plan.months, price: plan.price }),
      });
      
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url; // Редирект на защищенную шторку Apple Pay / Stripe
      }
    } catch (error) {
      console.error("Stripe Error:", error);
      alert(language === 'ru' ? 'Ошибка при создании платежа. Попробуйте позже.' : language === 'fr' ? 'Erreur de paiement. Veuillez réessayer.' : 'Payment error. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lux-bg flex items-center justify-center">
        <motion.p 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="font-cinzel text-xl text-lux-gold tracking-widest uppercase"
        >
          {t.loadingArchive}
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
                className="absolute top-9 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl flex flex-col min-w-[70px] z-50 overflow-hidden"
              >
                {(['fr', 'en', 'ru'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setShowLangMenu(false);
                    }}
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

      {/* МЕНЮ БУРГЕР / КРЕСТИК (Фиксировано СПРАВА СНИЗУ) */}
      <motion.button 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
          if (!showMenu) window.history.pushState({ overlay: 'menu' }, "");
          else if (window.history.state?.overlay) window.history.back();
          setShowMenu(!showMenu);
        }}
        className="fixed bottom-6 right-6 z-[105] bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 w-14 h-14 rounded-full flex items-center justify-center shadow-gold-glow hover:bg-lux-gold hover:scale-105 group transition-all"
      >
        {/* Анимация превращения 2-х полосок бургера в крестик (Х) */}
        <span className={`w-6 h-0.5 bg-lux-gold group-hover:bg-black transition-all duration-300 absolute ${showMenu ? 'rotate-45' : '-translate-y-1.5'}`}></span>
        <span className={`w-6 h-0.5 bg-lux-gold group-hover:bg-black transition-all duration-300 absolute ${showMenu ? '-rotate-45' : 'translate-y-1.5'}`}></span>
      </motion.button>

      {/* КНОПКА ДОМОЙ И VIP ИНДИКАТОР (Скроллятся вместе со страницей) */}
      <div className="absolute top-6 left-6 z-[60] flex flex-col items-start gap-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl px-5 py-2.5 text-sm font-medium hover:bg-lux-gold hover:text-black text-gray-300 transition-all shadow-lg group"
        >
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
          <span className="hidden md:inline uppercase tracking-widest">
            {t.home}
          </span>
        </button>
        
        <div className="bg-lux-gold text-black px-4 py-2 rounded-3xl font-cinzel font-bold text-xs tracking-[0.2em] shadow-gold-glow">
          VIP ACCESS
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto pt-24 pb-20">
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-cinzel text-3xl md:text-5xl text-lux-gold mb-4 uppercase tracking-widest">
              {t.allPhotos}
            </h1>
            <p className="font-cormorant text-xl text-gray-400 italic">
              {photos.length} {t.photosPlural}
            </p>
          </div>
          
          {/* VIP ИНДИКАТОР ВРЕМЕНИ И КНОПКА ПРОДЛЕНИЯ */}
          {expiresAt && (
            <div className="bg-lux-card/50 border border-lux-gold/20 p-4 md:p-5 rounded-sm flex flex-col items-center md:items-start gap-3 backdrop-blur-sm">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">
                {t.archiveUntil} <br/>
                <span className="text-lux-gold text-lg">{new Date(expiresAt).toLocaleDateString()}</span>
              </p>
              <button 
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  window.history.pushState({ overlay: 'payment' }, "");
                  setShowPaymentModal(true);
                }}
                className="w-full px-6 py-2.5 bg-lux-gold/10 hover:bg-lux-gold text-lux-gold hover:text-black border border-lux-gold transition-all text-[10px] md:text-xs font-bold uppercase tracking-widest"
              >
                {t.extendArchive}
              </button>
            </div>
          )}
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
        <Gallery 
          key={`gallery-${selectedGuestId || 'all'}`}
          photos={photos} 
          slug={slug} 
          expiresAt={expiresAt} 
          isVip={true} 
          currentLanguage={language} 
          guestClusters={guestClusters}
          
          // === Передаём управление Lightbox и фильтром по гостю ===
          isLightboxOpen={isLightboxOpen}
          setIsLightboxOpen={setIsLightboxOpen}
          selectedGuestId={selectedGuestId}
          setSelectedGuestId={setSelectedGuestId}
        />
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
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                closeModalSafe(() => setShowMenu(false));
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] will-change-[opacity]"
            />

            {/* Сама шторка меню */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.15}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  closeModalSafe(() => setShowMenu(false));
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[130] flex flex-col items-center touch-none will-change-transform"
            >
              <div className="w-full max-w-md bg-[#0a0a0a] border-t border-white/10 rounded-t-[2.5rem] p-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative">
                
                {/* Индикатор свайпа (Pill) */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-10" />

                {/* Единый блок меню (iOS Style List) */}
                <div className="bg-[#111] border border-white/10 rounded-2xl flex flex-col w-full shadow-lg">
                  
                  {/* 1. Instagram */}
                  <button
                    onClick={() => { 
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                      closeModalSafe(() => setShowMenu(false));
                      window.open("https://www.instagram.com/hdart26/", "_blank"); 
                    }}
                    className="w-full bg-transparent hover:bg-white/5 transition-colors flex items-center justify-between px-5 py-4 group border-b border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-lux-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      <span className="text-gray-300 group-hover:text-white transition-colors text-xs uppercase tracking-widest font-medium">{t.contactPhotographer}</span>
                    </div>
                    <span className="text-gray-600 group-hover:text-gray-400 transition-colors">↗</span>
                  </button>
                  
                  {/* 2. Website */}
                  <button
                    onClick={() => { 
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                      closeModalSafe(() => setShowMenu(false));
                      window.open("https://kurginian.pro", "_blank"); 
                    }}
                    className="w-full bg-transparent hover:bg-white/5 transition-colors flex items-center justify-between px-5 py-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-lux-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                      <span className="text-gray-300 group-hover:text-white transition-colors text-xs uppercase tracking-widest font-medium">{t.discoverServices}</span>
                    </div>
                    <span className="text-gray-600 group-hover:text-gray-400 transition-colors">↗</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* === МОДАЛЬНОЕ ОКНО ПРОДЛЕНИЯ (ОПЛАТА) === */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-lux-gold/30 p-6 md:p-10 shadow-gold-glow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-8">
                <h2 className="font-cinzel text-xl md:text-2xl text-lux-gold uppercase tracking-widest">
                  {t.paymentTitle}
                </h2>
                <button 
                  onClick={() => closeModalSafe(() => {
                    setShowPaymentModal(false); 
                    setSelectedPlan(null); 
                  })} 
                  className="text-gray-500 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {!selectedPlan ? (
                // ВЫБОР ТАРИФА
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm mb-6 uppercase tracking-wider font-mono">
                    {t.selectPeriod}
                  </p>
                  {[
                    { months: 6, price: 50, label: t.plan6m },
                    { months: 12, price: 90, label: t.plan1y },
                    { months: 60, price: 350, label: t.plan5y }
                  ].map((plan, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedPlan(plan)}
                      className="border border-white/10 hover:border-lux-gold p-6 cursor-pointer group transition-all flex justify-between items-center bg-white/5"
                    >
                      <span className="font-cinzel text-lg group-hover:text-lux-gold transition-colors">{plan.label}</span>
                      <span className="font-mono text-xl text-lux-gold">{plan.price} €</span>
                    </div>
                  ))}
                </div>
              ) : (
                // ИНТЕГРАЦИЯ STRIPE / APPLE PAY
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <button onClick={() => setSelectedPlan(null)} className="text-lux-gold text-xs uppercase tracking-widest flex items-center gap-2 mb-4">
                    ← {t.backToPlans}
                  </button>
                  
                  <div className="bg-[#111] border border-lux-gold/20 p-8 text-center rounded-sm">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                      <svg className="w-6 h-6 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                    </div>
                    <h3 className="font-cinzel text-xl text-white mb-2">{selectedPlan.label} Premium</h3>
                    <p className="text-3xl font-mono text-lux-gold mb-8">{selectedPlan.price} €</p>
                    
                    <button 
                      onClick={() => handleStripeCheckout(selectedPlan)}
                      disabled={isProcessingPayment}
                      className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest text-[11px] md:text-xs rounded-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                      {isProcessingPayment ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M11.996 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.545 8.796-6.19 8.252a.858.858 0 0 1-1.344.152l-3.553-3.32a.857.857 0 1 1 1.173-1.253l2.846 2.659 5.585-7.442a.857.857 0 1 1 1.483 1.026v-.074z"/>
                        </svg>
                      )}
                      Pay with Stripe / Apple Pay
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center mt-4">
                    Secured by Stripe
                  </p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}