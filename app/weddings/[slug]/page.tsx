'use client';

import { useState, useRef, use, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Gallery from '@/components/Gallery';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { useRouter } from 'next/navigation';

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
}

// === ПЕРЕВОДЫ (С комплиментарным отказом и Оффлайн режимом) ===
const translations = {
  fr: {
    welcome: "Bienvenue",
    subtitle: "Bienvenue dans votre galerie. Je suis l'assistant numérique de ce mariage.",
    findPhotos: "Trouver mes photos",
    takePhoto: "Prendre une photo maintenant",
    chooseGallery: "Choisir depuis la galerie",
    foundPhotos: "Vos souvenirs",
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
    offlineMode: "Mode hors ligne", 
    offlineReq: "Connexion Internet requise",
  },
  en: {
    welcome: "Welcome",
    subtitle: "Welcome to your gallery. I am the digital assistant of this wedding.",
    findPhotos: "Find my photos",
    takePhoto: "Take a photo now",
    chooseGallery: "Choose from gallery",
    foundPhotos: "Your memories",
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
    offlineMode: "Offline Mode", 
    offlineReq: "Internet connection required",
  },
  ru: {
    welcome: "Добро пожаловать",
    subtitle: "Добро пожаловать в вашу галерею. Я цифровой помощник этой свадьбы.",
    findPhotos: "Найти мои фото",
    takePhoto: "Сделать фото сейчас",
    chooseGallery: "Выбрать из галереи",
    foundPhotos: "Ваши воспоминания",
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
    offlineMode: "Режим оффлайн", 
    offlineReq: "Требуется интернет",
  }
} as const;

export default function WeddingGuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'network_error' | 'verify'>('idle');
  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false); 
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === НОВЫЕ СТЕЙТЫ ДЛЯ КАМЕРЫ (Digital Concierge) ===
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ДОБАВЛЯЕМ НОВЫЕ СТЕЙТЫ (Счетчик попыток, Замороженное фото, Фото для проверки):
  const [attemptCount, setAttemptCount] = useState(1);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<MatchedPhoto[]>([]);
  
  // Стейты для VIP-пароля
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // === ЯЗЫКОВОЕ СОСТОЯНИЕ ===
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');
  const t = translations[language];

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
        // СОХРАНЯЕМ ПАРОЛЬ КАК VIP-КЛЮЧ
        localStorage.setItem(`vip_code_${slug}`, passwordInput);
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

  // === УМНАЯ СИНХРОНИЗАЦИЯ (Язык + Память) ===
  useEffect(() => {
    // 1. Сначала проверяем глобальный язык с главной страницы
    const globalLang = localStorage.getItem('kurginian_global_lang') as 'fr' | 'en' | 'ru';
    // 2. Затем локальный язык этой конкретной свадьбы
    const savedSlugLang = localStorage.getItem(`lang_${slug}`) as 'fr' | 'en' | 'ru';
    
    if (globalLang) {
      setLanguage(globalLang);
    } else if (savedSlugLang) {
      setLanguage(savedSlugLang);
    }
  }, [slug]);

  // Сохраняем выбор языка локально при изменении
  useEffect(() => {
    localStorage.setItem(`lang_${slug}`, language);
  }, [language, slug]);

  // Загружаем фото из памяти только для этой свадьбы
  useEffect(() => {
    const saved = localStorage.getItem(`photos_${slug}`);
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
  }, [slug]);

  // === ФУНКЦИИ КАМЕРЫ ===
  const startCamera = async () => {
    triggerVibration(10);
    
    try {
      setShowChoiceModal(false);
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
        triggerVibration(50); // Имитация затвора камеры
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        stopCamera();
        handleSelfieUpload(file);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleTryAgain = () => {
    setAttemptCount(prev => prev + 1); 
    setCapturedImage(null);
    // НЕ сбрасываем status! Пусть экран ошибки висит на фоне, пока камера открыта.
    startCamera(); 
  };

  
  // === ИНТЕГРАЦИЯ API: Сжатие и отправка селфи ===
  const handleSelfieUpload = async (file: File) => {
    setStatus('loading');
    try {
      const compressedFile = await imageCompression(file, {
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
          setStatus('success');
          localStorage.setItem(`photos_${slug}`, JSON.stringify(sortedPhotos));
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
      setCapturedImage(URL.createObjectURL(file)); 
      handleSelfieUpload(file);
    }
  };

  // === СКАЧИВАНИЕ ВСЕХ ФОТО (ZIP) ===
  const downloadAllPhotos = async () => {
    
    if (photos.length === 0) return;
      
    setIsDownloadingAll(true);
    setDownloadProgress(0);
  
    try {
      const zip = new JSZip();
          
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fetchUrl = `${photo.urls.web}?download=${Date.now()}`;
        
        // Показываем прогресс загрузки по сети
        setDownloadProgress(Math.round(((i) / photos.length) * 100));
              
        const response = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        zip.file(photo.filename, blob);
      }
      
      // Финальная стадия: упаковка (здесь обычно зависает UI, поэтому меняем текст)
      setDownloadProgress(100); 
      // Мы будем использовать этот флаг в UI, чтобы написать "Archivage..."
          
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `mes_photos_${slug}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert(language === 'ru' ? "Ошибка при создании архива" : "Erreur lors de la création de l'archive");
    } finally {
      setIsDownloadingAll(false);
      setDownloadProgress(0);
    }
  };

  return (
    <main className="min-h-screen bg-lux-bg text-lux-text font-montserrat p-6 flex flex-col items-center justify-center selection:bg-lux-gold selection:text-black relative">
      
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
                          setLanguage(lang);
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
        
        {/* ЭКРАН ПРИВЕТСТВИЯ */}
        {status === 'idle' && photos.length === 0 && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: "blur(5px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center max-w-lg w-full"
          >
            <h1 className="font-cinzel text-3xl md:text-5xl text-lux-gold mb-6 uppercase tracking-widest">
              {t.welcome}
            </h1>
            <p className="font-cormorant text-xl md:text-2xl mb-12 italic text-gray-300">
              {t.subtitle}
            </p>
            <button 
              onClick={() => setShowChoiceModal(true)}
              className="px-10 py-5 bg-transparent border-2 border-lux-gold text-lux-gold font-montserrat uppercase tracking-[0.2em] rounded-sm hover:bg-lux-gold hover:text-black hover:shadow-gold-glow-hover transition-all duration-500 text-lg"
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
                  {language === 'ru' ? 'Анализ биометрии...' : 
                   language === 'en' ? 'Biometric analysis...' : 
                   'Analyse biométrique...'}
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
              {/* @ts-ignore - игнорируем ошибку TS, так как мы добавили ключи */}
              {t.verifyTitle}
            </h2>
            <p className="font-montserrat text-sm text-gray-300 mb-8 max-w-sm">
               {/* @ts-ignore */}
              {t.verifyDesc}
            </p>
            
            {/* Показываем кружочек с найденным лицом */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-lux-gold mb-8 shadow-gold-glow relative">
               <img src={pendingPhotos[0].urls.thumb} alt="Match" className="w-full h-full object-cover" />
            </div>

            <div className="flex gap-4 w-full max-w-sm">
              <button 
                onClick={handleTryAgain}
                className="flex-1 px-4 py-4 border border-lux-gold/50 text-gray-300 hover:text-lux-gold rounded-sm uppercase tracking-wider text-xs font-bold transition-all"
              >
                 {/* @ts-ignore */}
                {t.noTryAgain}
              </button>
              <button 
                onClick={() => {
                  setPhotos(pendingPhotos);
                  setStatus('success');
                  localStorage.setItem(`photos_${slug}`, JSON.stringify(pendingPhotos));
                }}
                className="flex-1 px-4 py-4 bg-lux-gold text-black rounded-sm uppercase tracking-wider text-xs font-bold shadow-gold-glow hover:bg-white transition-all"
              >
                 {/* @ts-ignore */}
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
              {language === 'ru' ? 'Ошибка соединения с сервером.' : 
               language === 'en' ? 'Connection error to the server.' : 
               'Erreur de connexion au serveur.'}
            </p>
            <button 
              onClick={() => setStatus('idle')}
              className="px-6 py-3 border border-lux-gold text-lux-gold uppercase tracking-wider rounded-sm hover:shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all duration-300"
            >
              {language === 'ru' ? 'Назад' : language === 'en' ? 'Back' : 'Retour'}
            </button>
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
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-cinzel text-3xl text-lux-gold">
                {t.foundPhotos} • {photos.length} photo{photos.length > 1 ? 's' : ''}
              </h2>
            </div>
            
            <Gallery photos={photos} slug={slug} />

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
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
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
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                      setShowMenu(false);
                    }}
                    className="fixed inset-0 bg-black/70 md:backdrop-blur-sm z-[100] will-change-[opacity]"
                  />

                  {/* Выезжающая шторка */}
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "tween", duration: 0.25, ease: [0.2, 0.9, 0.3, 1] }}
                    className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col items-center will-change-transform"
                  >
                    <div className="w-full max-w-md bg-[#0F0F0F] border-t border-white/10 rounded-t-3xl p-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                      
                      {/* Индикатор свайпа (Pill) */}
                      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8" />

                      <div className="space-y-3">
                        {/* 1. Скачать фото (с прогресс-баром) */}
                        <button
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                            if (!isDownloadingAll) downloadAllPhotos();
                          }}
                          disabled={isDownloadingAll}
                          className="relative w-full overflow-hidden bg-white/5 border border-white/10 hover:border-lux-gold/50 transition-colors rounded-2xl flex items-center justify-between p-5 group disabled:cursor-not-allowed"
                        >
                          {isDownloadingAll && (
                            <div 
                              className="absolute left-0 top-0 bottom-0 bg-lux-gold/20 transition-all duration-300 ease-out"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          )}
                          <div className="relative z-10 flex items-center gap-4">
                            <svg className={`w-5 h-5 ${isDownloadingAll ? 'text-lux-gold animate-bounce' : 'text-white group-hover:text-lux-gold transition-colors'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            <span className="text-white text-sm uppercase tracking-widest font-medium">
                              {isDownloadingAll 
                                ? (language === 'ru' ? (downloadProgress < 100 ? `Загрузка ${downloadProgress}%` : 'Создание архива...') : language === 'en' ? (downloadProgress < 100 ? `Loading ${downloadProgress}%` : 'Archiving...') : (downloadProgress < 100 ? `Chargement ${downloadProgress}%` : 'Archivage...'))
                                : t.downloadAll}
                            </span>
                          </div>
                        </button>

                        <div className="h-px bg-gradient-to-r from-transparent via-lux-gold/20 to-transparent my-4"></div>

                        {/* 2. Новый поиск */}
                        <button
                          onClick={() => { 
                            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                            setShowMenu(false); 
                            setShowChoiceModal(true); 
                          }}
                          className="w-full bg-transparent hover:bg-white/5 transition-colors rounded-2xl flex items-center gap-4 p-5 group"
                        >
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          </svg>
                          <span className="text-gray-300 group-hover:text-white transition-colors text-sm uppercase tracking-wider font-medium">{t.findMore}</span>
                        </button>

                        {/* 3. Ввести VIP код */}
                        <button
                          onClick={() => { 
                            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                            setShowMenu(false); 
                            setShowPasswordModal(true); 
                          }}
                          className="w-full bg-transparent hover:bg-white/5 transition-colors rounded-2xl flex items-center gap-4 p-5 group"
                        >
                          {/* Иконка ключа */}
                          <svg className="w-5 h-5 text-lux-gold group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                          </svg>
                          <span className="text-lux-gold group-hover:text-white transition-colors text-sm uppercase tracking-wider font-medium">{language === 'ru' ? 'Ввести VIP-код' : language === 'en' ? 'Enter VIP code' : 'Entrer le code VIP'}</span>
                        </button>

                        <div className="h-px bg-gradient-to-r from-transparent via-lux-gold/20 to-transparent my-4"></div>

                        {/* 4. Instagram */}
                        <button
                          onClick={() => { 
                            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
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

                        {/* 5. Website */}
                        <button
                          onClick={() => { 
                            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
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
                  stopCamera();
                  // ТОЧЕЧНОЕ ЛЕЧЕНИЕ: 
                  // Если мы не в success (например, застряли в error после неудачного селфи):
                  if (status !== 'success') {
                    // Если у юзера уже есть фото -> бережно возвращаем его в галерею
                    // Если фоток нет -> возвращаем на стартовый экран
                    setStatus(photos.length > 0 ? 'success' : 'idle');
                  }
                }} 
                className="text-white hover:text-lux-gold text-sm tracking-widest uppercase"
              >
                {t.cancel}
              </button>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            {/* Видоискатель */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
              {/* Эффект "Soft Ring Light" (Умная подсветка лица светом экрана) */}
              <div className="absolute inset-0 z-10 shadow-[inset_0_0_120px_rgba(255,255,255,0.15)] pointer-events-none" />
              
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

      {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ФОТО */}
      <AnimatePresence>
        {showChoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6"
            onClick={() => setShowChoiceModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-lux-card border border-lux-gold/50 p-8 rounded-sm max-w-sm w-full shadow-gold-glow text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-cinzel text-xl text-lux-gold mb-8 tracking-widest uppercase">
                {language === 'ru' ? 'Поиск фото' : language === 'en' ? 'Find photos' : 'Trouver des photos'}
              </h3>
              
              <div className="space-y-4">
                {/* Кнопка Камеры */}
                <button
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                    startCamera();
                  }}
                  className="w-full px-6 py-4 bg-lux-gold text-black font-bold hover:bg-white transition-all rounded-sm uppercase tracking-wider flex items-center justify-center gap-3 text-xs md:text-sm shadow-gold-glow"
                >
                  <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  <span>{t.takePhoto}</span>
                </button>

                {/* Кнопка Галереи */}
                <button
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                    setShowChoiceModal(false);
                    fileInputRef.current?.removeAttribute('capture');
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-6 py-4 bg-transparent border border-lux-gold/50 text-lux-gold font-medium hover:bg-lux-gold hover:text-black transition-all rounded-sm uppercase tracking-wider flex items-center justify-center gap-3 text-xs md:text-sm group"
                >
                  <svg className="w-5 h-5 text-lux-gold group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span>{t.chooseGallery}</span>
                </button>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setShowChoiceModal(false)}
                  className="text-gray-500 hover:text-white text-xs uppercase tracking-widest transition-colors underline underline-offset-4 decoration-transparent hover:decoration-white/50"
                >
                  {t.cancel}
                </button>
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
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-lux-card border border-lux-gold/50 p-8 rounded-sm max-w-sm w-full shadow-gold-glow text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-cinzel text-xl text-lux-gold mb-6 tracking-widest uppercase">
                {t.enterPassword}
              </h3>
              
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••"
                className={`w-full bg-[#111] border ${passwordError ? 'border-red-500' : 'border-lux-gold/30'} text-white px-4 py-4 rounded-sm text-center text-2xl tracking-[0.5em] pl-[0.5em] focus:outline-none focus:border-lux-gold transition-colors mb-2`}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              
              {/* Сообщение об ошибке */}
              <div className="h-6">
                <AnimatePresence>
                  {passwordError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-400 text-sm">
                      {t.wrongPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
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