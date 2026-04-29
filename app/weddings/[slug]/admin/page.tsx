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
    whatsappMsg: "Bonjour ! Je souhaite prolonger le projet {slug} pour {plan}. Le reçu de {price}€ est en pièce jointe.",
    paymentSuccessTitle: "Paiement réussi",
    paymentSuccessDesc: "L'accès à votre galerie a été prolongé avec succès."
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
    whatsappMsg: "Hello! I want to extend the project {slug} for {plan}. The receipt for {price}€ is attached.",
    paymentSuccessTitle: "Payment Successful",
    paymentSuccessDesc: "Access to your gallery has been successfully extended."
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
    whatsappMsg: "Здравствуйте! Я хочу продлить проект {slug} на {plan}. Квитанция об оплате на {price}€ в приложении.",
    paymentSuccessTitle: "Оплата успешна",
    paymentSuccessDesc: "Доступ к вашей галерее был успешно продлен."
  }
} as const;

export default function AdminGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
const [stats, setStats] = useState({ scans: 0, downloads: 0, shares: 0, save_all: 0 });
  const { language, setLanguage, getCartForSlug } = useAppContext();
  const cart = getCartForSlug(slug);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [guestClusters, setGuestClusters] = useState<any>(null);
  const [cinemaClipUrl, setCinemaClipUrl] = useState<string | undefined>(undefined); // <-- ДОБАВЛЕНО ДЛЯ КИНОЗАЛА
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<number | null>(null); // Хранит месяцы тарифа, который сейчас грузится
  const [showSuccessPayment, setShowSuccessPayment] = useState(false); // <-- ДЛЯ ПРЕМИУМ УВЕДОМЛЕНИЯ
  
  // Новое состояние для меню
  const [showMenu, setShowMenu] = useState(false);
  const [isGalleryOverlayActive, setIsGalleryOverlayActive] = useState(false); // Контроллер для скрытия UI

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

  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  useEffect(() => {
    // 0. Проверка успешной оплаты Stripe после редиректа
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success')) {
        setShowSuccessPayment(true); // <-- ВЫЗЫВАЕМ ПРЕМИУМ-МОДАЛКУ ВМЕСТО ALERT
        window.history.replaceState({}, '', window.location.pathname);
        // Автоматически закроем ее через 5 секунд для красоты
        setTimeout(() => setShowSuccessPayment(false), 5000);
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
          
          // === 🛡 ФИКС БЕЗОПАСНОСТИ: ПЕРЕХВАТ ЭКРАНА БЛОКИРОВКИ ===
          // Если срок вышел, очищаем VIP-сессию и выкидываем на ClientPage, где сработает The Reaper Lock Screen
          if (data.status === 'expired') {
            localStorage.removeItem(`vip_code_${slug}`);
            router.replace(`/weddings/${slug}`);
            return;
          }

          const sortedPhotos = data.data.sort((a: MatchedPhoto, b: MatchedPhoto) => 
            a.filename.localeCompare(b.filename)
          );
          setPhotos(sortedPhotos);
          setExpiresAt(data.expires_at);
          setGuestClusters(data.guest_clusters);
          if (data.cinema_clip_url) setCinemaClipUrl(data.cinema_clip_url); // <-- ДОБАВЛЕНО ДЛЯ КИНОЗАЛА

          // === 🛡 ФИКС GHOST LOCK: СИНХРОНИЗАЦИЯ LOCALSTORAGE ===
          // Обновляем дату в памяти после Stripe Webhook, чтобы сборщик мусора не удалил проект!
          if (data.expires_at) {
            localStorage.setItem(`expires_${slug}`, data.expires_at);
          }

          // Аналитика отключена для разгрузки сервера (Dashboard скрыт в UI)
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
    setProcessingPlan(plan.months); // Показываем лоадер только на нажатом тарифе
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: plan.months, price: plan.price, language }), 
      });
      
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url; // Редирект на защищенную шторку Apple Pay / Stripe
      }
    } catch (error) {
      console.error("Stripe Error:", error);
      alert(language === 'ru' ? 'Ошибка при создании платежа. Попробуйте позже.' : language === 'fr' ? 'Erreur de paiement. Veuillez réessayer.' : 'Payment error. Please try again.');
      setProcessingPlan(null);
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
      
      {/* УМНЫЙ ГЛОБУС ЯЗЫКОВ И КНОПКА ДОМОЙ (Скрываются при открытии Lightbox/Шторок) */}
      <AnimatePresence>
        {!isLightboxOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-[100]"
          >
            <div className="relative">
              <button
                onClick={() => {
                  triggerVibration(10);
                  setShowLangMenu(!showLangMenu);
                }}
                className="flex items-center gap-1.5 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 hover:border-lux-gold/50 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg hover:bg-lux-gold hover:text-black transition-all text-gray-400 group"
              >
                <span className="uppercase tracking-widest">{language}</span>
                <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </button>

              <AnimatePresence>
                {showLangMenu && (
                  <>
                    {/* Невидимый слой-перехватчик кликов */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowLangMenu(false)}
                    />
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
                            triggerVibration(10);
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
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МЕНЮ БУРГЕР / КРЕСТИК (Фиксировано СПРАВА СНИЗУ) */}
      <AnimatePresence>
        {!isLightboxOpen && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
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
        )}
      </AnimatePresence>

      {/* КНОПКА ДОМОЙ И VIP ИНДИКАТОР (Скроллятся вместе со страницей) */}
      <AnimatePresence>
        {!isLightboxOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute top-6 left-6 z-[60] flex flex-col items-start gap-4"
          >
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 bg-[#0a0a0a]/60 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 text-[10px] font-medium hover:border-lux-gold/50 hover:text-lux-gold text-gray-400 transition-all shadow-lg group uppercase tracking-[0.2em]"
            >
              <span className="text-lg group-hover:-translate-x-1 transition-transform opacity-70">←</span>
              {t.home}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto pt-24 pb-20">
        <div className="mb-12 flex flex-col items-center md:items-start gap-6">
          <div className="text-center md:text-left">
            <h1 className="font-cinzel text-3xl md:text-5xl text-lux-gold mb-3 uppercase tracking-widest drop-shadow-md">
              {t.allPhotos}
            </h1>
            <p className="font-cormorant text-lg md:text-xl text-gray-400 italic">
              {photos.length} {t.photosPlural}
            </p>
          </div>
          
          {/* ЭЛЕГАНТНЫЙ ИНДИКАТОР ВРЕМЕНИ (Pill-дизайн) */}
          {expiresAt && (
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-5 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 px-6 py-3.5 rounded-3xl sm:rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] w-full sm:w-auto">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="text-[10px] md:text-xs text-gray-300 uppercase tracking-widest leading-relaxed text-balance max-w-[180px] sm:max-w-none">
                  {t.archiveUntil} <span className="text-lux-gold font-bold ml-1">{new Date(expiresAt).toLocaleDateString()}</span>
                </p>
              </div>
              <div className="hidden sm:block w-px h-5 bg-white/20" />
              <div className="w-full h-px bg-white/10 sm:hidden" />
              <button 
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  window.history.pushState({ overlay: 'payment' }, "");
                  setShowPaymentModal(true);
                }}
                className="text-[10px] md:text-xs text-lux-gold font-bold uppercase tracking-[0.15em] hover:text-white transition-colors flex items-center gap-1.5 group py-1"
              >
                {t.extendArchive}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
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
          cinemaClipUrl={cinemaClipUrl}
          
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
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 800 }}
              dragElastic={0.1}
              onDragEnd={(e, info) => {
                if (info.offset.y > 80) {
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
                  
                  {/* 0. Услуга Печати (Всегда видима) */}
                  <button
                    onClick={() => { 
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                      closeModalSafe(() => setShowMenu(false));
                      setTimeout(() => {
                        if (cart.length > 0) {
                          window.dispatchEvent(new CustomEvent('open-print-cart'));
                        } else {
                          window.dispatchEvent(new CustomEvent('start-print-selection'));
                        }
                      }, 50); // Задержка защищает от конфликта с history.back()
                    }}
                    className={`w-full transition-colors flex items-center justify-between px-5 py-4 group border-b border-white/5 hover:bg-white/5 ${cart.length > 0 ? 'bg-lux-gold/10 border-lux-gold/20 hover:bg-lux-gold/20' : 'bg-transparent'}`}
                  >
                    <div className="flex items-center gap-4">
                      <svg className={`w-5 h-5 transition-colors ${cart.length > 0 ? 'text-lux-gold' : 'text-gray-400 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      <span className={`${cart.length > 0 ? 'text-lux-gold' : 'text-gray-300'} group-hover:text-white transition-colors text-xs uppercase tracking-widest font-bold`}>
                        {language === 'ru' ? 'Заказать печать' : language === 'fr' ? 'Commander l\'impression' : 'Order Prints'}
                      </span>
                    </div>
                    {cart.length > 0 ? (
                      <div className="bg-lux-gold text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {cart.length}
                      </div>
                    ) : (
                      <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
                    )}
                  </button>

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
      {/* === ПРЕМИАЛЬНОЕ ОКНО ОПЛАТЫ (ОДИН КЛИК) === */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => closeModalSafe(() => setShowPaymentModal(false))}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-lux-gold/30 p-8 rounded-3xl shadow-gold-glow relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Блик на фоне */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-lux-gold/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex justify-between items-start mb-8 relative z-10">
                <h2 className="font-cinzel text-xl md:text-2xl text-lux-gold uppercase tracking-widest leading-snug">
                  {t.paymentTitle}
                </h2>
                <button 
                  onClick={() => closeModalSafe(() => setShowPaymentModal(false))} 
                  className="text-gray-500 hover:text-white transition-colors p-1"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <p className="text-gray-400 text-xs mb-6 uppercase tracking-wider font-mono text-center">
                  {t.selectPeriod}
                </p>
                
                {[
                  { months: 6, price: 50, label: t.plan6m },
                  { months: 12, price: 90, label: t.plan1y, popular: true },
                  { months: 60, price: 350, label: t.plan5y }
                ].map((plan, idx) => {
                  const isProcessing = processingPlan === plan.months;
                  const isDisabled = processingPlan !== null && !isProcessing;

                  return (
                    <button 
                      key={idx} 
                      disabled={isDisabled}
                      onClick={() => handleStripeCheckout(plan)}
                      className={`w-full group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 active:scale-[0.98] ${
                        plan.popular 
                          ? 'bg-lux-gold/10 border-lux-gold/50 hover:bg-lux-gold hover:border-lux-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]' 
                          : 'bg-[#111] border-white/10 hover:border-lux-gold/50 hover:bg-white/5'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className={`font-cinzel text-lg md:text-xl transition-colors ${plan.popular ? 'text-lux-gold group-hover:text-black' : 'text-gray-200 group-hover:text-lux-gold'}`}>
                          {plan.label}
                        </span>
                        {plan.popular && (
                          <span className="text-[9px] uppercase tracking-widest bg-lux-gold text-black px-2 py-0.5 rounded-sm font-bold">
                            Most Popular
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`font-mono text-xl transition-colors ${plan.popular ? 'text-lux-gold group-hover:text-black' : 'text-lux-gold'}`}>
                          {plan.price} €
                        </span>
                        
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-inner ${
                          plan.popular ? 'bg-lux-gold text-black group-hover:bg-black group-hover:text-lux-gold' : 'bg-white/10 text-white group-hover:bg-lux-gold group-hover:text-black'
                        }`}>
                          {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 opacity-50 relative z-10">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                  <path d="M11.996 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.545 8.796-6.19 8.252a.858.858 0 0 1-1.344.152l-3.553-3.32a.857.857 0 1 1 1.173-1.253l2.846 2.659 5.585-7.442a.857.857 0 1 1 1.483 1.026v-.074z"/>
                </svg>
                <span className="text-[9px] uppercase tracking-widest text-white">Secured by Stripe & Apple Pay</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === ПРЕМИУМ-УВЕДОМЛЕНИЕ ОБ УСПЕШНОЙ ОПЛАТЕ === */}
      <AnimatePresence>
        {showSuccessPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowSuccessPayment(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-sm w-full bg-[#0a0a0a] border border-lux-gold/50 p-8 rounded-2xl shadow-gold-glow text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-full bg-lux-gold/10 border border-lux-gold/30 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              
              <h3 className="font-cinzel text-xl md:text-2xl text-lux-gold uppercase tracking-widest mb-3">
                {t.paymentSuccessTitle}
              </h3>
              
              <p className="text-gray-400 text-sm font-montserrat leading-relaxed mb-8">
                {t.paymentSuccessDesc}
              </p>
              
              <button
                onClick={() => setShowSuccessPayment(false)}
                className="w-full py-4 bg-lux-gold text-black uppercase tracking-[0.2em] font-bold text-xs rounded-sm hover:bg-white transition-colors shadow-lg active:scale-95"
              >
                ОК
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </main>
  );
}