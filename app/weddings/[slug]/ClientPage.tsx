// === ФАЙЛ: app/weddings/[slug]/ClientPage.tsx ===
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Gallery from '@/components/Gallery';
import imageCompression from 'browser-image-compression';
import { useRouter } from 'next/navigation';
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { useAppContext } from '@/context/AppContext'; // <-- ДОБАВЛЕНО

// === ТИПИЗАЦИЯ API ===
export interface MatchedPhoto {
  filename: string;
  width: number;
  height: number;
  urls: { web: string; thumb: string; };
}

export interface AuthResponse {
  status: string;
  message: string;
  matches_count: number;
  data: MatchedPhoto[];
  expires_at?: string | null;
}

export interface WeddingMeta {
  title: string;
  subtitle: string;
  covers: string[];
  is_expired?: boolean;
  days_left?: number;
}

// === ПЕРЕВОДЫ (С комплиментарным отказом, Оффлайном и Premium Copywriting) ===
const translations = {
  fr: {
    welcome: "Bienvenue",
    subtitle: "Dévoilez vos souvenirs. Une collection privée, créée pour vous.",
    findPhotos: "Trouver mes photos",
    takePhoto: "Prendre une photo",
    chooseGallery: "Choisir depuis la galerie",
    foundPhotos: "Vos moments inoubliables",
    downloadAll: "Télécharger toutes les photos",
    findMore: "Trouver encore des photos",
    contactPhotographer: "Suivre sur Instagram",
    discoverServices: "Découvrir mon univers",
    thanks: "Merci d'avoir utilisé KURGINIAN Premium Gallery",
    home: "Mes galeries",
    viewAll: "Toutes les photos",
    enterPassword: "Code d'accès VIP",
    submit: "Valider",
    cancel: "Annuler",
    wrongPassword: "Code incorrect",
    camPermission: "Veuillez autoriser l'accès à la caméra",
    takeSelfie: "Prendre la photo",
    errorTitle: "Vous étiez éblouissante ! ✨",
    errorDesc: "Notre IA ne vous a pas reconnue dans ce nouveau look. Prenez un selfie réalisé lors de l'événement.",
    tryAgain: "Réessayer",
    verifyTitle: "Est-ce bien vous ?",
    verifyDesc: "Nous avons trouvé ces photos avec une correspondance partielle. Confirmez-vous qu'il s'agit de vous ?",
    yesItsMe: "Oui, c'est moi",
    noTryAgain: "Non, réessayer",
    privacyText: "Confidentiel. Votre photo ne sera ni partagée ni conservée.",
    cameraAction: "Prendre un selfie",
    yourSelfie: "Votre selfie",
    analyzing: "Analyse biométrique...",
    networkError: "Erreur de connexion au serveur.",
    backBtn: "Retour",
    enterVipCode: "Entrer le code VIP",
    vipPromptTitle: "Accès Privilégié",
    vipPromptDesc: "Êtes-vous les mariés ou possédez-vous un code d'accès VIP ?",
    yesHaveCode: "Oui, j'ai un code",
    noGuest: "Non, trouver mes photos",
    guestHint: "L'IA trouvera vos photos parmi les invités",
    expiredTitle: "Collection Verrouillée",
    expiredDesc: "La période d'accès à votre galerie privée est arrivée à son terme. Afin de préserver la confidentialité de vos souvenirs selon nos standards d'excellence, cette collection sera définitivement retirée de nos serveurs sécurisés dans {days} jours.",
    extendBtn: "Prolonger l'accès",
    contactSupportBtn: "Contacter le support",
    paymentTitle: "Extension de l'accès",
    selectPeriod: "Sélectionnez la période de prolongation :",
    plan6m: "6 mois",
    plan1y: "1 an",
    plan5y: "5 ans (Premium)",
    whatsappMsg: "Bonjour ! Je souhaite prolonger le projet {slug} pour {plan}. Le reçu de {price}€ est en pièce jointe.",
    // === НОВЫЕ КЛЮЧИ ДЛЯ ДВУХШАГОВОГО ПРОДЛЕНИЯ ===
    backToPlans: "Retour aux tarifs",
    bankDetails: "Coordonnées bancaires :",
    paymentInstruction: "Veuillez effectuer le virement. Ensuite, cliquez sur le bouton ci-dessous pour envoyer le reçu sur WhatsApp afin d'activer.",
    sendReceipt: "Envoyer le reçu sur WhatsApp"
  },

  en: {
    welcome: "Welcome",
    subtitle: "Unveil your memories. A private collection, curated for you.",
    findPhotos: "Find my photos",
    takePhoto: "Take a photo",
    chooseGallery: "Choose from gallery",
    foundPhotos: "Your unforgettable moments",
    downloadAll: "Download all photos",
    findMore: "Find more photos",
    contactPhotographer: "Follow on Instagram",
    discoverServices: "Discover my work",
    thanks: "Thank you for using KURGINIAN Premium Gallery",
    home: "My galleries",
    viewAll: "All photos",
    enterPassword: "VIP Access Code",
    submit: "Submit",
    cancel: "Cancel",
    wrongPassword: "Incorrect code",
    camPermission: "Please allow camera access",
    takeSelfie: "Take photo",
    errorTitle: "You looked stunning! ✨",
    errorDesc: "Our AI didn't recognize your new look. Please upload a photo taken at the event.",
    tryAgain: "Try Again",
    verifyTitle: "Is this you?",
    verifyDesc: "We found these photos with a partial match. Can you confirm this is you?",
    yesItsMe: "Yes, it's me",
    noTryAgain: "No, try again",
    privacyText: "Confidential. Your photo will not be shared or stored.",
    cameraAction: "Take a selfie",
    yourSelfie: "Your selfie",
    analyzing: "Biometric analysis...",
    networkError: "Connection error to the server.",
    backBtn: "Back",
    enterVipCode: "Enter VIP code",
    vipPromptTitle: "Privileged Access",
    vipPromptDesc: "Are you the newlyweds or do you have a VIP access code?",
    yesHaveCode: "Yes, I have a code",
    noGuest: "No, find my photos",
    guestHint: "AI will find your photos among all guests",
    expiredTitle: "Collection Locked",
    expiredDesc: "The viewing period for your private gallery has concluded. To uphold our uncompromising standards of digital privacy, this collection will be permanently erased from our secure servers in {days} days.",
    extendBtn: "Extend Access",
    contactSupportBtn: "Contact Support",
    paymentTitle: "Extend Access",
    selectPeriod: "Select extension period:",
    plan6m: "6 months",
    plan1y: "1 year",
    plan5y: "5 years (Premium)",
    whatsappMsg: "Hello! I want to extend the project {slug} for {plan}. The receipt for {price}€ is attached.",
    // === НОВЫЕ КЛЮЧИ ДЛЯ ДВУХШАГОВОГО ПРОДЛЕНИЯ ===
    backToPlans: "Back to plans",
    bankDetails: "Bank details:",
    paymentInstruction: "Please make the transfer. Then click the button below to send the receipt via WhatsApp for activation.",
    sendReceipt: "Send receipt via WhatsApp"
  },

  ru: {
    welcome: "Добро пожаловать",
    subtitle: "Откройте свои воспоминания. Приватная коллекция, созданная для вас.",
    findPhotos: "Найти мои фото",
    takePhoto: "Сделать фото",
    chooseGallery: "Выбрать из галереи",
    foundPhotos: "Ваши незабываемые моменты",
    downloadAll: "Скачать все фото",
    findMore: "Найти ещё фото",
    contactPhotographer: "Подписаться в Instagram",
    discoverServices: "Узнать о моих услугах",
    thanks: "Спасибо, что воспользовались KURGINIAN Premium Gallery",
    home: "Мои галереи",
    viewAll: "Все фотографии",
    enterPassword: "VIP Код доступа",
    submit: "Войти",
    cancel: "Отмена",
    wrongPassword: "Неверный код",
    camPermission: "Пожалуйста, разрешите доступ к камере",
    takeSelfie: "Сделать фото",
    errorTitle: "Вы выглядели ослепительно! ✨",
    errorDesc: "Наш ИИ не узнал вас в новом образе. Пожалуйста, загрузите селфи, сделанное прямо на мероприятии.",
    tryAgain: "Попробовать снова",
    verifyTitle: "Это вы?",
    verifyDesc: "Мы нашли эти фотографии с частичным совпадением. Подтверждаете, что это вы?",
    yesItsMe: "Да, это я",
    noTryAgain: "Нет, попробовать еще",
    privacyText: "Конфиденциально. Ваше фото не будет сохранено или передано.",
    cameraAction: "Сделать селфи",
    yourSelfie: "Ваше селфи",
    analyzing: "Анализ биометрии...",
    networkError: "Ошибка соединения с сервером.",
    backBtn: "Назад",
    enterVipCode: "Ввести VIP-код",
    vipPromptTitle: "Привилегированный доступ",
    vipPromptDesc: "Вы виновники торжества или у вас есть код VIP-доступа?",
    yesHaveCode: "Да, у меня есть код",
    noGuest: "Нет, найти свои фото",
    guestHint: "ИИ найдет ваши снимки среди всех гостей",
    expiredTitle: "Коллекция Заблокирована",
    expiredDesc: "Период доступа к вашей частной галерее завершен. В целях соблюдения наших высочайших стандартов цифровой приватности, эта коллекция будет безвозвратно удалена с защищенных серверов через {days} дней.",
    extendBtn: "Продлить доступ",
    contactSupportBtn: "Связаться с нами",
    paymentTitle: "Продление доступа",
    selectPeriod: "Выберите период продления:",
    plan6m: "6 месяцев",
    plan1y: "1 год",
    plan5y: "5 лет (Премиум)",
    whatsappMsg: "Здравствуйте! Я хочу продлить проект {slug} на {plan}. Квитанция об оплате на {price}€ в приложении.",
    // === НОВЫЕ КЛЮЧИ ДЛЯ ДВУХШАГОВОГО ПРОДЛЕНИЯ ===
    backToPlans: "Назад к тарифам",
    bankDetails: "Банковские реквизиты:",
    paymentInstruction: "Пожалуйста, совершите перевод. Затем нажмите кнопку ниже, чтобы отправить квитанцию в WhatsApp для активации.",
    sendReceipt: "Отправить чек в WhatsApp"
  }
} as const;

// === ПРЕМИАЛЬНЫЙ ВЕЕР ФОТОГРАФИЙ (WELCOME ZONE) ===
function PhotoFan({ covers }: { covers: string[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      setTilt({ x, y });
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      const x = Math.max(-20, Math.min(20, e.gamma / 2.5));
      const y = Math.max(-20, Math.min(20, (e.beta - 45) / 2.5)); 
      setTilt({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const handleTap = (index: number) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    setActiveIndex(index);
    setTimeout(() => setActiveIndex((prev) => (prev === index ? null : prev)), 2000);
  };

  const rotations = [-12, 0, 12];
  const xOffsets = [-45, 0, 45];
  const yOffsets = [15, 0, 15];

  return (
    <div className="relative w-48 h-64 md:w-56 md:h-72 flex items-center justify-center my-8 select-none" style={{ WebkitTouchCallout: 'none', perspective: '1000px' }}>
      {covers.map((src, i) => {
        const isActive = activeIndex === i;
        const depthFactor = i === 1 ? 0.4 : 1.2;
        
        return (
          <motion.div
            key={i}
            onClick={() => handleTap(i)}
            initial={{ opacity: 0, y: 50, rotate: 0 }}
            animate={{ 
              opacity: 1, 
              y: isActive ? -20 : yOffsets[i] + (tilt.y * depthFactor), 
              x: isActive ? 0 : xOffsets[i] + (tilt.x * depthFactor), 
              rotate: isActive ? 0 : rotations[i] + (tilt.x * 0.15), 
              scale: isActive ? 1.08 : 1,
              zIndex: isActive ? 50 : (i === 1 ? 30 : 10)
            }}
            transition={{ 
              duration: isActive ? 0.6 : 0.4, 
              delay: activeIndex === null && tilt.x === 0 && tilt.y === 0 ? i * 0.15 : 0, 
              type: "spring", stiffness: isActive ? 200 : 120, damping: isActive ? 15 : 25
            }}
            className="absolute w-full h-full rounded-sm shadow-[0_15px_35px_rgba(0,0,0,0.6)] border border-lux-gold/20 overflow-hidden cursor-pointer bg-[#111] will-change-transform"
            style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
          >
            <img src={src} alt="cover" draggable={false} className="w-full h-full object-cover opacity-90 pointer-events-none" />
            <motion.div animate={{ opacity: isActive ? 0 : Math.max(0, 0.2 + (tilt.y * -0.01)) }} className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none mix-blend-overlay" />
            <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.6)] pointer-events-none" />
          </motion.div>
        );
      })}
    </div>
  );
}

export default function ClientPage({ slug, initialMeta }: { slug: string, initialMeta: WeddingMeta | null }) {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const router = useRouter();

  // ЕСЛИ СЕРВЕР СКАЗАЛ, ЧТО ПРОЕКТ МЕРТВ - МГНОВЕННО БЛОКИРУЕМ (Никаких камер и экранов приветствия)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'network_error' | 'verify' | 'expired'>(
    initialMeta?.is_expired ? 'expired' : 'idle'
  );
  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  
  const { language, setLanguage, refreshSessions, cart, isMounted } = useAppContext();
  const t = translations[language];

  // === ПРЕДЗАГРУЗКА ИИ (Pre-warming) ===
  // Тихо качаем весы нейросети, пока гость читает приветствие
  useEffect(() => {
    if (status === 'idle' && !faceDetectorRef.current) {
      FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm")
        .then(vision => FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite", delegate: "CPU" },
          runningMode: "IMAGE"
        }))
        .then(detector => { faceDetectorRef.current = detector; })
        .catch(() => {});
    }
  }, [status]);

  // === ЗВУК ЗАТВОРА КАМЕРЫ (Синтезатор Web Audio API - 0 байт трафика) ===
  const playShutterSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
  };

    // Стейты для модуля продления (Upsell) — ОДИН КЛИК (STRIPE)
  const [showPayment, setShowPayment] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<number | null>(null);

  const handleStripeCheckout = async (plan: { months: number; price: number; label: string }) => {
    setProcessingPlan(plan.months);
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
        window.location.href = data.url; 
      }
    } catch (error) {
      console.error("Stripe Error:", error);
      alert(language === 'ru' ? 'Ошибка при создании платежа. Попробуйте позже.' : language === 'fr' ? 'Erreur de paiement. Veuillez réessayer.' : 'Payment error. Please try again.');
      setProcessingPlan(null);
    }
  };

  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === НОВЫЕ СТЕЙТЫ ДЛЯ КАМЕРЫ (Digital Concierge) ===
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null); // Хранилище для MediaPipe

  // ДОБАВЛЯЕМ НОВЫЕ СТЕЙТЫ (Счетчик попыток, Замороженное фото, Фото для проверки):
  const [attemptCount, setAttemptCount] = useState(1);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<MatchedPhoto[]>([]);

  // ИСПРАВЛЕНО: Глобальная очистка памяти Safari (Blob URL Leak) и аппаратной камеры
  // Спасет iPhone от крашей RAM и отключит зеленую точку камеры, если гость просто закрыл окно.
  useEffect(() => {
    return () => {
      // 1. Очищаем оперативную память от фото
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
      // 2. Жестко глушим аппаратный стрим камеры при закрытии компонента
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [capturedImage]);
  
  // Стейты для VIP-пароля
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Стейты умного онбординга (Вопрос при первом входе)
  const [showInitialVipPrompt, setShowInitialVipPrompt] = useState(false);

  // === УМНЫЙ ПЕРЕХВАТ СВАЙПА НАЗАД (HISTORY API) ===
  useEffect(() => {
    const handlePopState = () => {
      if (showMenu) setShowMenu(false);
      if (showPasswordModal) setShowPasswordModal(false);
      if (showPayment) setShowPayment(false);
      if (showChoiceModal) setShowChoiceModal(false);
      if (isCameraActive) {
        stopCamera();
        if (status !== 'success') setStatus(photos.length > 0 ? 'success' : 'idle');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showMenu, showPasswordModal, showPayment, showChoiceModal, isCameraActive, status, photos.length]);

  // Универсальная функция для безопасного закрытия окон
  const closeModalSafe = (closeFn: () => void) => {
    closeFn();
    if (window.history.state?.overlay) window.history.back();
  };

  // Логика умного показа вопроса
  useEffect(() => {
    // Проверяем: спрашивали ли мы уже? Есть ли уже фото? Вошел ли уже как VIP?
    const promptShown = localStorage.getItem(`vip_prompt_shown_${slug}`);
    const hasVip = localStorage.getItem(`vip_code_${slug}`);
    const hasPhotos = localStorage.getItem(`photos_${slug}`);

    // Если это самый первый заход и стартовый экран (не загрузка по ссылке)
    if (!promptShown && !hasVip && !hasPhotos && status === 'idle') {
      const timer = setTimeout(() => {
        setShowInitialVipPrompt(true);
      }, 1500); // Кинематографичная пауза 1.5 секунды перед вопросом
      return () => clearTimeout(timer);
    }
  }, [slug, status]);

  // Функции обработки ответов
  const dismissVipPrompt = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    localStorage.setItem(`vip_prompt_shown_${slug}`, 'true');
    setShowInitialVipPrompt(false);
  };

  const startGuestFlow = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    localStorage.setItem(`vip_prompt_shown_${slug}`, 'true');
    setShowInitialVipPrompt(false);
    setTimeout(() => {
      window.history.pushState({ overlay: 'camera_flow' }, "");
      setShowChoiceModal(true); 
    }, 300); 
  };

  const acceptVipPrompt = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    localStorage.setItem(`vip_prompt_shown_${slug}`, 'true');
    setShowInitialVipPrompt(false);
    setTimeout(() => {
      window.history.pushState({ overlay: 'vip' }, "");
      setShowPasswordModal(true); 
    }, 300); 
  };


  // === ДИНАМИЧЕСКИЕ ДАННЫЕ МЕРОПРИЯТИЯ (ПРИШЛИ С СЕРВЕРА БЕЗ МЕРЦАНИЯ) ===
  const [metaInfo, setMetaInfo] = useState<WeddingMeta | null>(initialMeta);

  // === ОФФЛАЙН И ТАКТИЛЬНОСТЬ ===

  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };


  // Обработчик проверки пароля через API
  const handlePasswordSubmit = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/verify-vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Перехват API Shield: Проект заморожен
        if (data.status === 'expired') {
          setStatus('expired');
          setShowPasswordModal(false);
          triggerVibration([50, 100, 50]);
          return;
        }

        // СОХРАНЯЕМ ПАРОЛЬ И КРАСИВОЕ ИМЯ
        localStorage.setItem(`vip_code_${slug}`, passwordInput);
        if (metaInfo?.title) localStorage.setItem(`title_${slug}`, metaInfo.title);
        refreshSessions(); // <-- ОБНОВЛЯЕМ ДАШБОРД
        setShowPasswordModal(false);
        triggerVibration(50);
        router.push(`/weddings/${slug}/admin`);
      } else {
        triggerVibration([50, 100, 50]);
        setPasswordError(true);
        setTimeout(() => setPasswordError(false), 2000);
      }
    } catch (error) {
      triggerVibration([50, 100, 50]);
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  // Загружаем фото из памяти ИЛИ перехватываем магическую ссылку-подборку
  // ИСПРАВЛЕНИЕ: Приоритет — актуальному статусу expired с сервера (initialMeta)
  useEffect(() => {
    const loadGallery = async () => {
      // 1. Проверяем, не перешел ли гость по ссылке "Поделиться подборкой" (?guest=... или ?p=...)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const guestParam = params.get('guest');
        const pParam = params.get('p');
        
        if (guestParam || pParam) {
          setStatus('loading'); // Включаем красивый экран биометрии (как лоадер)
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const endpoint = guestParam 
              ? `/api/weddings/${slug}/collection/${guestParam}`
              : `/api/weddings/${slug}/shared-selection?p=${pParam}`;
              
            const res = await fetch(`${apiUrl}${endpoint}`);
            
            if (res.ok) {
              const data = await res.json();
              
              // Перехват API Shield: Если сервер ответил, что проект заморожен
              if (data.status === 'expired') {
                setStatus('expired');
                return;
              }

              setPhotos(data.data);
              if (data.expires_at) setExpiresAt(data.expires_at);
              setStatus('success');
              
              // ИСПРАВЛЕНО: Оставляем ?guest= в URL! 
              // Если гость случайно обновит страницу свайпом вниз, он не потеряет свою подборку.
              // Ссылка элегантно очистится сама только при нажатии "✕ Сбросить фильтр" в галерее.
              
              // Мы НЕ сохраняем эти фото в localStorage. 
              // Это защищает дашборд гостя от замусоривания чужими фото.
              return;
            }
          } catch (e) {
            console.error("Ошибка загрузки подборки:", e);
          }
          // Если ссылка битая или устарела, скидываем статус обратно в idle
          setStatus('idle');
        }
      }

      // 2. ПРИОРИТЕТНАЯ ПРОВЕРКА: Если сервер говорит, что проект expired — сразу показываем экран блокировки
      if (initialMeta?.is_expired) {
        setStatus('expired');
        return;
      }

      // 3. Обычный флоу: ищем собственные фото гостя в памяти устройства
      const saved = localStorage.getItem(`photos_${slug}`);
      const savedExpiry = localStorage.getItem(`expires_${slug}`);
      if (savedExpiry) setExpiresAt(savedExpiry);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            setPhotos(parsed);
            setStatus('success');
          }
        } catch (e) {
          localStorage.removeItem(`photos_${slug}`);
        }
      }
    };

    loadGallery();
  }, [slug]);

  // === ФУНКЦИИ КАМЕРЫ ===
  const startCamera = async () => {
    triggerVibration(10);
    
    try {
      setShowChoiceModal(false);
      
      // ИСПРАВЛЕНО: Жестко убиваем старый поток перед открытием нового,
      // чтобы на телефоне не зависал зеленый индикатор активной камеры (Privacy Leak).
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      alert(t.camPermission);
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error("Ошибка остановки камеры:", err);
    } finally {
      streamRef.current = null;
      setIsCameraActive(false);
    }
  };

  // 1. Привязываем поток к <video> когда оно отрендерится
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  // 2. CLEANUP: Аппаратно выключаем камеру ТОЛЬКО при полном уходе со страницы (unmount)
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx?.translate(canvas.width, 0);
    ctx?.scale(-1, 1);
    ctx?.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        // СОХРАНЯЕМ ФОТО ДЛЯ КРАСИВОГО ФОНА СКАНИРОВАНИЯ
        setCapturedImage(URL.createObjectURL(blob)); 
        triggerVibration([30, 50]); // Более резкая тактильная отдача
        playShutterSound();         // Звуковой щелчок (100% уверенность)
        
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        stopCamera();
        handleSelfieUpload(file);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleTryAgain = () => {
    setAttemptCount(prev => prev + 1); 
    if (capturedImage) URL.revokeObjectURL(capturedImage); // <-- ОЧИЩАЕМ ПАМЯТЬ БРАУЗЕРА!
    setCapturedImage(null);
    startCamera(); 
  };

  
  // === ИИ-КРОППИНГ НА КЛИЕНТЕ (MediaPipe WebAssembly) ===
  const cropFaceFromImage = async (file: File): Promise<File> => {
    try {
      // 1. Инициализируем детектор (скачиваем WASM только 1 раз)
      if (!faceDetectorRef.current) {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            // Легковесная модель для поиска лиц вблизи (селфи)
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "CPU" // На мобильных браузерах CPU надежнее для одиночных кадров
          },
          runningMode: "IMAGE"
        });
      }

      // 2. Превращаем File в картинку для анализа
      const img = document.createElement("img");
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // 3. Ищем лицо
      const detections = faceDetectorRef.current.detect(img);
      URL.revokeObjectURL(objectUrl); // Очищаем память

      // Если лицо не найдено фронтендом — отдаем оригинал (Пусть мощный бэкенд перепроверит)
      if (detections.detections.length === 0) return file; 

      // 4. Вычисляем координаты самого уверенного лица
      const face = detections.detections[0].boundingBox;
      if (!face) return file;

      // Делаем отступы (margin), чтобы захватить прическу, шею и подбородок полностью
      const marginX = face.width * 0.4; 
      const marginY = face.height * 0.5;

      const startX = Math.max(0, face.originX - marginX);
      const startY = Math.max(0, face.originY - marginY);
      const cropWidth = Math.min(img.width - startX, face.width + marginX * 2);
      const cropHeight = Math.min(img.height - startY, face.height + marginY * 2);

      // 5. Вырезаем этот кусок на невидимый холст (Canvas)
      const canvas = document.createElement("canvas");
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.drawImage(
        img,
        startX, startY, cropWidth, cropHeight, // Откуда берем
        0, 0, cropWidth, cropHeight          // Куда кладем
      );

      // 6. Упаковываем вырезанное лицо обратно в File
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], "cropped_selfie.jpg", { type: "image/jpeg" }));
          else resolve(file);
        }, "image/jpeg", 0.95);
      });

    } catch (error) {
      console.error("MediaPipe Cropping Error:", error);
      return file; // При любой ошибке браузера безопасно отдаем оригинальное фото
    }
  };

  // === ИНТЕГРАЦИЯ API: Сжатие и отправка селфи ===
  const handleSelfieUpload = async (file: File) => {
    setStatus('loading');
    try {
      // 1. Сначала вырезаем идеальный квадрат с лицом (MediaPipe)
      const croppedFile = await cropFaceFromImage(file);

      // 2. Затем сжимаем результат (Страховка на случай старых телефонов или фолбэка)
      const compressedFile = await imageCompression(croppedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append('selfie', compressedFile);

      // === УМНОЕ СНИЖЕНИЕ ПОРОГА ===
      // 1 попытка: 0.5 | 2 попытка: 0.4 | 3 и далее попытки: 0.3
      const currentThreshold = attemptCount === 1 ? 0.5 : attemptCount === 2 ? 0.4 : 0.3;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/weddings/${slug}/auth?threshold=${currentThreshold}`, {
        method: 'POST',
        body: formData,
      });

      // ДОБАВИТЬ ЭТОТ БЛОК: Явный перехват 400 ошибки (Лицо не найдено)
      if (!response.ok) {
        triggerVibration([50, 100, 50]);
        setStatus('error');
        return; // Прерываем выполнение, чтобы не парсить пустой JSON
      }

      const data: AuthResponse = await response.json();

      // Перехват API Shield: Проект заморожен
      if (data.status === 'expired') {
        setStatus('expired');
        triggerVibration([50, 100, 50]);
        return;
      }

      if (data.matches_count > 0) {
        const sortedPhotos = data.data.sort((a: MatchedPhoto, b: MatchedPhoto) => 
          a.filename.localeCompare(b.filename)
        );

        // Если это 3-я попытка (порог 0.3), мы не пускаем сразу, а просим подтвердить
        if (attemptCount >= 3) {
          triggerVibration([30, 50, 30]); // Мягкое внимание
          setPendingPhotos(sortedPhotos);
          setStatus('verify');
        } else {
          // Обычный успех
          triggerVibration(50); // Успех!
          setPhotos(sortedPhotos);
          setExpiresAt(data.expires_at || null); // <-- Записываем в стейт
          setStatus('success');
          localStorage.setItem(`photos_${slug}`, JSON.stringify(sortedPhotos));
          if (data.expires_at) {
            localStorage.setItem(`expires_${slug}`, data.expires_at);
          }
          if (metaInfo?.title) {
            localStorage.setItem(`title_${slug}`, metaInfo.title);
          }
          refreshSessions(); // <-- ОБНОВЛЯЕМ ДАШБОРД
        }
      } else {
        triggerVibration([50, 100, 50]); // Ошибка распознавания
        setStatus('error');
      }
    } catch (error) {
      console.error(error);
      setStatus('network_error');
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerVibration(10); // Тактильный отклик при выборе файла
      // ИСПРАВЛЕНО: Очищаем старый Blob перед созданием нового, спасаем RAM
      if (capturedImage) URL.revokeObjectURL(capturedImage);
      setCapturedImage(URL.createObjectURL(file)); 
      handleSelfieUpload(file);
    }
  };


  if (!isMounted) return <main className="min-h-[100dvh] bg-lux-bg" />;

  return (
    <main className="min-h-[100dvh] bg-lux-bg text-lux-text font-montserrat p-6 flex flex-col items-center justify-center selection:bg-lux-gold selection:text-black relative">
      
      {/* УМНЫЙ ГЛОБУС ЯЗЫКОВ (Всегда фиксирован сверху справа) */}
      <AnimatePresence>
        {(status === 'idle' || status === 'success') && (
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
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* КНОПКА НАЗАД (Скроллится вместе со страницей) */}
      <AnimatePresence>
        {(status === 'idle' || status === 'success') && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute top-6 left-6 z-[60]"
          >
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl px-5 py-2.5 text-sm font-medium shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all text-gray-300 group"
            >
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              <span className="hidden md:inline uppercase tracking-widest">{t.home}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        
        {/* ЭКРАН ПРИВЕТСТВИЯ (DIGITAL INVITATION) */}
        {status === 'idle' && photos.length === 0 && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: "blur(5px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center max-w-2xl w-full px-4 flex flex-col items-center justify-center min-h-[75vh]"
          >
            {/* Тонкий микро-хедер (Две строки с идеальным центрированием) */}
            <div className="flex flex-col items-center gap-1.5 mb-6 text-center">
              <span className="font-cinzel text-[9px] md:text-[10px] text-lux-gold/50 tracking-[0.4em] uppercase pl-[0.4em]">
                Kurginian
              </span>
              <span className="font-cinzel text-[9px] md:text-[10px] text-lux-gold/50 tracking-[0.4em] uppercase pl-[0.4em]">
                Premium Collection
              </span>
            </div>

            {/* ВЕЕР ФОТОГРАФИЙ (Берем из API, если интернет слабый - показываем элегантные заглушки) */}
            <PhotoFan covers={metaInfo?.covers?.length ? metaInfo.covers : [
              "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=800&auto=format&fit=crop"
            ]} />

            {/* ИДЕНТИФИКАЦИЯ МЕРОПРИЯТИЯ (Динамические данные из базы) */}
            <div className="mt-8 mb-6 relative">
              <h1 className="font-cinzel text-4xl md:text-5xl text-lux-gold tracking-widest drop-shadow-lg">
                {metaInfo?.title || "Kurginian Premium"}
              </h1>
              <p className="font-cormorant text-gray-400 italic text-lg md:text-xl mt-3 tracking-wide">
                {metaInfo?.subtitle || "Exclusive Event"}
              </p>
            </div>

            {/* ЭЛЕГАНТНЫЙ ТЕКСТ-ХУК */}
            <p className="font-montserrat text-xs md:text-sm text-gray-300/80 max-w-xs md:max-w-sm leading-relaxed mb-10">
              {t.subtitle}
            </p>

            {/* КНОПКА (Исправлено залипание и конфликт Z-index) */}
            <button
              onClick={(e) => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                // Снимаем фокус с кнопки, чтобы сбросить состояние :active
                e.currentTarget.blur();
                // Даем 50мс на отыгрыш анимации "отжатия" перед открытием шторки
                setTimeout(() => {
                  window.history.pushState({ overlay: 'camera_flow' }, ""); // <-- ПУШ
                  setShowChoiceModal(true);
                }, 50);
              }}
              className="w-full max-w-sm py-5 bg-lux-gold text-black font-bold uppercase tracking-[0.2em] text-xs md:text-sm shadow-gold-glow hover:bg-white transition-all flex items-center justify-center gap-3 group relative z-10"
            >
              {t.findPhotos}
            </button>
          </motion.div>
        )}

        {/* === ЭКРАН ЗАГРУЗКИ (МАГИЯ FACE ID С ЗАМОРОЖЕННЫМ ФОТО) === */}
        {status === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[150] overflow-hidden"
          >
            {/* Замороженное фото на фоне (глубокое кинематографичное размытие) */}
            {capturedImage && (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-50 scale-105 blur-[6px]"
                  style={{ backgroundImage: `url(${capturedImage})` }}
                />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              </>
            )}
            
            {/* Анимация сканирования поверх лица */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-64 h-80 mb-10 overflow-hidden">
                {/* Фокусная рамка (Статичная во время сканирования) */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-lux-gold/70" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-lux-gold/70" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-lux-gold/70" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-lux-gold/70" />
                
                {/* Широкий градиентный скан (Golden Sweep) */}
                <motion.div 
                  animate={{ y: [-150, 400] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                  className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b from-transparent via-lux-gold/10 to-lux-gold/60 border-b border-lux-gold shadow-[0_4px_20px_rgba(212,175,55,0.4)]"
                />
              </div>
              
              {/* Премиальный текст с переливом */}
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="bg-black/50 border border-lux-gold/20 px-8 py-3 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(212,175,55,0.1)]"
              >
                <p className="font-cinzel text-xs md:text-sm text-lux-gold tracking-[0.3em] uppercase">
                  {t.analyzing}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* === ЭКРАН ОШИБКИ (КОМПЛИМЕНТАРНЫЙ ОТКАЗ) === */}
        {status === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center max-w-md bg-lux-card/80 backdrop-blur-xl p-8 border border-lux-gold/20 rounded-2xl shadow-2xl z-[150]"
          >
            <div className="text-4xl mb-4">✨</div>
            <h2 className="font-cinzel text-xl text-lux-gold uppercase tracking-widest mb-4">
              {t.errorTitle}
            </h2>
            <p className="font-montserrat text-sm text-gray-300 mb-8 leading-relaxed">
              {t.errorDesc}
            </p>
            <button 
              onClick={handleTryAgain} // ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ (Чинит черный экран)
              className="w-full px-6 py-4 bg-lux-gold text-black uppercase tracking-wider rounded-sm hover:bg-white transition-all duration-300 font-bold text-sm shadow-gold-glow"
            >
              {t.tryAgain}
            </button>
          </motion.div>
        )}

        {/* === ЭКРАН ВЕРИФИКАЦИИ (3-я попытка: Это вы?) === */}
        {status === 'verify' && pendingPhotos.length > 0 && (
          <motion.div 
            key="verify"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[150] p-6 text-center"
          >
            <h2 className="font-cinzel text-2xl text-lux-gold uppercase tracking-widest mb-4">
              {t.verifyTitle}
            </h2>
            <p className="font-montserrat text-sm text-gray-300 mb-10 max-w-sm">
              {t.verifyDesc}
            </p>

            <div className="flex gap-4 w-full max-w-sm">
              <button 
                onClick={handleTryAgain}
                className="flex-1 px-4 py-4 border border-lux-gold/50 text-gray-300 hover:text-lux-gold rounded-sm uppercase tracking-wider text-xs font-bold transition-all"
              >
                {t.noTryAgain}
              </button>
              <button 
                onClick={() => {
                  setPhotos(pendingPhotos);
                  setStatus('success');
                  localStorage.setItem(`photos_${slug}`, JSON.stringify(pendingPhotos));
                  if (metaInfo?.title) localStorage.setItem(`title_${slug}`, metaInfo.title);
                  refreshSessions(); // <-- ОБНОВЛЯЕМ ДАШБОРД
                }}
                className="flex-1 px-4 py-4 bg-lux-gold text-black rounded-sm uppercase tracking-wider text-xs font-bold shadow-gold-glow hover:bg-white transition-all"
              >
                {t.yesItsMe}
              </button>
            </div>
          </motion.div>
        )}

        {/* ЭКРАН СЕТЕВОЙ ОШИБКИ */}
        {status === 'network_error' && (
          <motion.div 
            key="network_error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-md bg-red-900/20 border border-red-500/50 p-8 rounded-sm"
          >
            <p className="font-cormorant text-2xl text-red-400 mb-6">
              {t.networkError}
            </p>
            <button 
              onClick={() => setStatus('idle')}
              className="px-6 py-3 border border-lux-gold text-lux-gold uppercase tracking-wider rounded-sm hover:shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all duration-300"
            >
              {t.backBtn}
            </button>
          </motion.div>
        )}

                {/* === ПРЕМИУМ ЭКРАН БЛОКИРОВКИ (THE REAPER LOCK SCREEN) === */}
        {status === 'expired' && (
          <motion.div 
            key="expired"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 overflow-hidden bg-black"
          >
            {/* AMBIENT GLOW ОТ ОБЛОЖКИ СВАДЬБЫ */}
            {metaInfo?.covers?.[0] && (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 scale-110 blur-2xl"
                  style={{ backgroundImage: `url(${metaInfo.covers[0]})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />
              </>
            )}

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="relative z-10 w-full max-w-md bg-lux-card/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center"
            >
              {/* Премиальная иконка Замка/Песочных часов */}
              <div className="w-16 h-16 rounded-full bg-lux-gold/10 border border-lux-gold/30 flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-pulse" />
                <svg className="w-6 h-6 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>

              <h2 className="font-cinzel text-xl text-lux-gold uppercase tracking-widest mb-4">
                {t.expiredTitle}
              </h2>
              
              <p className="font-montserrat text-xs md:text-sm text-gray-300 leading-relaxed mb-10">
                {t.expiredDesc.replace('{days}', (metaInfo?.days_left ?? 7).toString())}
              </p>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    triggerVibration(10);
                    window.history.pushState({ overlay: 'payment' }, "");
                    setShowPayment(true);
                  }}
                  className="w-full py-4 bg-lux-gold text-black uppercase tracking-[0.15em] rounded-xl hover:bg-white transition-all duration-300 font-bold text-xs shadow-gold-glow"
                >
                  {t.extendBtn}
                </button>
                
                <a 
                  href="https://wa.me/33743300000"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerVibration(10)}
                  className="w-full py-4 bg-transparent border border-white/20 text-gray-400 hover:text-white hover:bg-white/5 uppercase tracking-[0.15em] rounded-xl transition-all duration-300 text-xs flex items-center justify-center"
                >
                  {t.contactSupportBtn}
                </a>
              </div>
            </motion.div>

            {/* === ПРЕМИАЛЬНОЕ ОКНО ОПЛАТЫ (ОДИН КЛИК) === */}
            <AnimatePresence>
              {showPayment && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                    className="w-full max-w-md bg-[#0a0a0a] border border-lux-gold/30 p-8 rounded-3xl shadow-gold-glow relative overflow-hidden text-left"
                  >
                    {/* Блик на фоне */}
                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-lux-gold/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <h2 className="font-cinzel text-xl md:text-2xl text-lux-gold uppercase tracking-widest leading-snug">
                        {t.paymentTitle}
                      </h2>
                      <button 
                        onClick={() => closeModalSafe(() => setShowPayment(false))} 
                        className="text-gray-500 hover:text-white text-2xl transition-colors leading-none"
                      >
                        ✕
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
          </motion.div>
        )}
        
        {/* ЭКРАН УСПЕХА */}
        {status === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-7xl pt-10 relative"
          >
            {/* ПРЕМИАЛЬНЫЙ ЗАГОЛОВОК ГАЛЕРЕИ */}
            <div className="text-center mb-12 flex flex-col items-center mt-4">
              <h2 className="font-cinzel text-3xl md:text-4xl text-lux-gold mb-4 uppercase tracking-widest">
                {t.foundPhotos}
              </h2>
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-lux-gold/50 to-transparent mb-4"></div>
              <p className="font-montserrat text-xs text-gray-400 uppercase tracking-widest">
                {photos.length} photo{photos.length > 1 ? 's' : ''}
              </p>
            </div>
            
            {/* ПЕРЕДАЕМ ДАТУ И ЯЗЫК В КОМПОНЕНТ */}
            <Gallery photos={photos} slug={slug} expiresAt={expiresAt} currentLanguage={language} />

            {/* ПРЕМИУМ БЛОК КОНВЕРСИИ */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-16 border-t border-lux-gold/20 pt-12 text-center"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <button
                  onClick={() => window.open("https://www.instagram.com/hdart26/", "_blank")}
                  className="flex-1 px-8 py-5 border border-lux-gold text-lux-gold hover:bg-lux-gold hover:text-black transition-all duration-300 flex items-center justify-center gap-3 rounded-sm text-base"
                >
                  📸 {t.contactPhotographer}
                </button>
                <button
                  onClick={() => window.open("https://kurginian.pro", "_blank")}
                  className="flex-1 px-8 py-5 bg-lux-gold text-black hover:bg-white transition-all duration-300 flex items-center justify-center gap-3 rounded-sm font-medium text-base"
                >
                  🌐 {t.discoverServices}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-12">
                {t.thanks}
              </p>
            </motion.div>
            
            {/* МЕНЮ БУРГЕР / КРЕСТИК (Фиксировано СПРАВА СНИЗУ) */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                if (!showMenu) window.history.pushState({ overlay: 'menu' }, ""); // <-- ПУШ
                else if (window.history.state?.overlay) window.history.back(); // <-- ОТКАТ КРЕСТИКОМ
                setShowMenu(!showMenu);
              }}
              className="fixed bottom-6 right-6 z-[105] bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 w-14 h-14 rounded-full flex items-center justify-center shadow-gold-glow hover:bg-lux-gold hover:scale-105 group transition-all"
            >
              <span className={`w-6 h-0.5 bg-lux-gold group-hover:bg-black transition-all duration-300 absolute ${showMenu ? 'rotate-45' : '-translate-y-1.5'}`}></span>
              <span className={`w-6 h-0.5 bg-lux-gold group-hover:bg-black transition-all duration-300 absolute ${showMenu ? '-rotate-45' : 'translate-y-1.5'}`}></span>
            </motion.button>

            {/* МОДАЛЬНОЕ МЕНЮ (PREMIUM BOTTOM SHEET КАК В АДМИНКЕ) */}
            <AnimatePresence>
              {showMenu && (
                <>
                  {/* Затемняющий фон */}
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

                  {/* Выезжающая шторка */}
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
                      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8" />

                      {/* Единый блок меню (iOS Style List) */}
                      <div className="bg-[#111] border border-white/10 rounded-2xl flex flex-col w-full shadow-lg">
                        
                        {/* 0. Услуга Печати (Всегда видима) */}
                        <button
                          onClick={() => { 
                            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                            closeModalSafe(() => setShowMenu(false));
                            if (cart.length > 0) {
                              window.dispatchEvent(new CustomEvent('open-print-cart'));
                            } else {
                              window.dispatchEvent(new CustomEvent('start-print-selection'));
                            }
                          }}
                          className={`w-full transition-colors flex items-center justify-between px-5 py-4 group border-b border-white/5 hover:bg-white/5 ${cart.length > 0 ? 'bg-lux-gold/10 border-lux-gold/20 hover:bg-lux-gold/20' : 'bg-transparent'}`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xl grayscale group-hover:grayscale-0 transition-all">🛒</span>
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

                        {/* 1. Новый поиск */}
                        <button
                          onClick={() => { 
                            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                            closeModalSafe(() => setShowMenu(false));
                            setTimeout(() => {
                              window.history.pushState({ overlay: 'camera_flow' }, "");
                              setShowChoiceModal(true); 
                            }, 50);
                          }}
                          className="w-full bg-transparent hover:bg-white/5 transition-colors flex items-center justify-between px-5 py-4 group border-b border-white/5"
                        >
                          <div className="flex items-center gap-4">
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                            <span className="text-gray-300 group-hover:text-white transition-colors text-xs uppercase tracking-widest font-medium">{t.findMore}</span>
                          </div>
                          <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
                        </button>

                        {/* 2. Ввести VIP код (Исправлено залипание) */}
                        <button
                          onClick={(e) => { 
                            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                            e.currentTarget.blur();
                            closeModalSafe(() => setShowMenu(false));
                            setTimeout(() => {
                              window.history.pushState({ overlay: 'vip' }, "");
                              setShowPasswordModal(true); 
                            }, 50);
                          }}
                          className="w-full bg-transparent hover:bg-white/5 transition-colors flex items-center justify-between px-5 py-4 group border-b border-lux-gold/20"
                        >
                          <div className="flex items-center gap-4">
                            <svg className="w-5 h-5 text-lux-gold group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                            </svg>
                            <span className="text-lux-gold group-hover:text-white transition-colors text-xs uppercase tracking-widest font-medium">{t.enterVipCode}</span>
                          </div>
                          <span className="text-lux-gold/40 group-hover:text-lux-gold/80 transition-colors">→</span>
                        </button>

                        {/* 3. Instagram */}
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

                        {/* 4. Website */}
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
          </motion.div>
        )}

      </AnimatePresence>

      {/* === ВСТРОЕННАЯ КАМЕРА (DIGITAL CONCIERGE) === */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col"
          >
            {/* Верхняя панель камеры */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
              <button 
                onClick={() => {
                  closeModalSafe(() => {
                    stopCamera();
                    if (status !== 'success') setStatus(photos.length > 0 ? 'success' : 'idle');
                  });
                }} 
                className="text-white hover:text-lux-gold text-sm tracking-widest uppercase"
              >
                {t.cancel}
              </button>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            {/* Видоискатель */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
              {/* Эффект "Soft Ring Light" (Аппаратная подсветка лица светом экрана без потери FPS) */}
              <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(255,255,255,0.15)_100%)] pointer-events-none" />
              
              <video
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-0" 
              />
              
              {/* Премиальный фокус Leica / Hasselblad */}
              <motion.div 
                animate={{ scale: [1, 1.02, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-64 h-80 z-20 pointer-events-none"
              >
                {/* Золотые уголки */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-lux-gold" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-lux-gold" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-lux-gold" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-lux-gold" />
                
                {/* Центральный крестик фокуса (тонкий и элегантный) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 opacity-40">
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-lux-gold" />
                  <div className="absolute top-0 left-1/2 w-[1px] h-full bg-lux-gold" />
                </div>
              </motion.div>

              {/* Умная подсказка консьержа */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute top-[15%] left-0 right-0 flex justify-center z-20 pointer-events-none"
              >
                <div className="bg-black/30 backdrop-blur-md border border-white/10 px-5 py-2 rounded-full">
                  <p className="font-montserrat text-[10px] md:text-xs text-gray-300 uppercase tracking-widest text-center">
                    {language === 'ru' ? 'Поместите лицо в центр' : language === 'fr' ? 'Placez votre visage au centre' : 'Place your face in the center'}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Кнопка съемки */}
            <div className="absolute bottom-0 left-0 right-0 p-10 flex justify-center bg-gradient-to-t from-black/80 to-transparent">
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full border-4 border-lux-gold flex items-center justify-center hover:scale-95 transition-transform bg-white/10 backdrop-blur-sm"
              >
                <div className="w-16 h-16 bg-lux-gold rounded-full" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ФОТО (PREMIUM BOTTOM SHEET) */}
      <AnimatePresence>
        {showChoiceModal && (
          <>
            {/* Затемняющий фон */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] will-change-[opacity]"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                closeModalSafe(() => setShowChoiceModal(false));
              }}
            />

            {/* Выезжающая шторка */}
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
                  closeModalSafe(() => setShowChoiceModal(false));
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[150] flex flex-col items-center touch-none will-change-transform"
            >
              <div className="w-full max-w-md bg-[#0a0a0a] border-t border-white/10 rounded-t-[2.5rem] p-8 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative">
                
                {/* Индикатор свайпа (Pill) */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8" />

                <h3 className="font-cinzel text-xl text-lux-gold mb-8 text-center tracking-widest uppercase">
                  {t.yourSelfie}
                </h3>
                
                <div className="space-y-4">
                  {/* Primary Кнопка: Камера (Выделена заливкой) */}
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                      startCamera();
                    }}
                    className="w-full px-6 py-4 bg-lux-gold text-black font-bold hover:bg-white transition-all rounded-2xl uppercase tracking-wider flex items-center justify-center gap-3 text-sm shadow-gold-glow"
                  >
                    <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <span>{t.cameraAction}</span>
                  </button>

                  {/* Secondary Кнопка: Галерея (Скромнее, без заливки) */}
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                      setShowChoiceModal(false);
                      fileInputRef.current?.removeAttribute('capture');
                      fileInputRef.current?.click();
                    }}
                    className="w-full px-6 py-4 bg-transparent border border-lux-gold/30 text-lux-gold font-medium hover:bg-lux-gold hover:text-black transition-all rounded-2xl uppercase tracking-wider flex items-center justify-center gap-3 text-sm group"
                  >
                    <svg className="w-5 h-5 text-lux-gold group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span>{t.chooseGallery}</span>
                  </button>
                </div>

                {/* Текст конфиденциальности (Психологический триггер Apple-level) */}
                <p className="mt-8 text-center text-[10px] md:text-[11px] leading-relaxed text-gray-500 uppercase tracking-widest px-4">
                  {t.privacyText}
                </p>
                
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* === УМНЫЙ ВОПРОС О VIP ДОСТУПЕ (Smart Onboarding) === */}
      <AnimatePresence>
        {showInitialVipPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={dismissVipPrompt} // Закрытие по клику на фон
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-[#0a0a0a] border border-lux-gold/30 rounded-[2rem] p-8 shadow-[0_10px_40px_rgba(212,175,55,0.15)] text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Блик на фоне */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-lux-gold/10 rounded-full blur-3xl pointer-events-none" />

              {/* Премиальная иконка (Замочек) */}
              <div className="w-14 h-14 rounded-full bg-lux-gold/10 border border-lux-gold/30 flex items-center justify-center mx-auto mb-6 relative z-10">
                <svg className="w-6 h-6 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>

              <h3 className="font-cinzel text-xl text-lux-gold uppercase tracking-widest mb-3 relative z-10 leading-snug">
                {t.vipPromptTitle}
              </h3>
              <p className="font-montserrat text-xs md:text-sm text-gray-400 mb-8 leading-relaxed relative z-10 px-2">
                {t.vipPromptDesc}
              </p>

              {/* Кнопки */}
              <div className="flex flex-col gap-4 relative z-10 mt-2">
                {/* Главная кнопка VIP */}
                <button
                  onClick={acceptVipPrompt}
                  className="w-full py-5 bg-lux-gold text-black font-bold uppercase tracking-[0.15em] text-xs rounded-xl shadow-gold-glow hover:bg-white transition-all active:scale-[0.98]"
                >
                  {t.yesHaveCode}
                </button>
                
                {/* Кнопка гостя с подсказкой */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={startGuestFlow}
                    className="w-full py-5 bg-transparent border border-white/20 text-gray-300 hover:text-white hover:bg-white/10 uppercase tracking-[0.15em] text-xs rounded-xl transition-all active:scale-[0.98]"
                  >
                    {t.noGuest}
                  </button>
                  {/* Новая премиальная подсказка */}
                  <p className="text-[9px] md:text-[10px] text-gray-500 mt-4 tracking-widest uppercase text-center max-w-[80%] leading-relaxed">
                    {t.guestHint}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛЬНОЕ ОКНО VIP ПАРОЛЯ */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={() => closeModalSafe(() => setShowPasswordModal(false))}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-lux-card border border-lux-gold/50 p-8 rounded-sm max-w-sm w-full shadow-gold-glow text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-cinzel text-xl text-lux-gold mb-8 tracking-widest uppercase">
                {t.enterPassword}
              </h3>
              
              {/* === APPLE-LEVEL PIN CODE (Native UI) === */}
              <div className="relative flex justify-center mb-6">
                {/* Невидимый инпут для вызова системной клавиатуры */}
                <input
                  type="tel"
                  maxLength={6}
                  value={passwordInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPasswordInput(val);
                    if (val.length > passwordInput.length) triggerVibration(10); // Вибрация при вводе
                    if (val.length === 6) setTimeout(handlePasswordSubmit, 100); // Авто-отправка
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
                  autoFocus
                />
                
                {/* Стеклянные кружочки с физикой Framer Motion */}
                <motion.div 
                  animate={passwordError ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="flex gap-4 pointer-events-none"
                >
                  {[...Array(6)].map((_, i) => {
                    const isActive = passwordInput.length > i;
                    return (
                      <motion.div 
                        key={i}
                        animate={{ 
                          scale: isActive ? [1, 1.2, 1] : 1,
                          backgroundColor: isActive ? '#D4AF37' : 'transparent',
                          borderColor: passwordError ? '#ef4444' : isActive ? '#D4AF37' : 'rgba(255,255,255,0.2)'
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="w-4 h-4 md:w-5 md:h-5 rounded-full border-[1.5px] transition-colors"
                      />
                    );
                  })}
                </motion.div>
              </div>
              
              {/* Сообщение об ошибке */}
              <div className="h-6 mb-2">
                <AnimatePresence>
                  {passwordError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-400 text-xs uppercase tracking-widest">
                      {t.wrongPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => closeModalSafe(() => setShowPasswordModal(false))}
                  className="flex-1 px-4 py-3 text-gray-400 hover:text-white transition-colors uppercase text-xs md:text-sm tracking-wider border border-white/5 rounded-sm hover:bg-white/5"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!passwordInput.trim()}
                  className="flex-1 px-4 py-3 bg-lux-gold text-black font-bold hover:bg-white transition-colors rounded-sm uppercase text-xs md:text-sm tracking-wider disabled:opacity-50"
                >
                  {t.submit}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}