'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { Blurhash } from 'react-blurhash';

// --- НОВЫЕ ИНТЕРФЕЙСЫ ДЛЯ ИИ ---
export interface GuestCluster {
  avatar_filename: string;
  bbox: number[];
  photo_count: number;
}

// --- ИНТЕРФЕЙСЫ ---
export interface MatchedPhoto {
  filename: string;
  width: number;
  height: number;
  blurhash?: string;
  cluster_ids?: string[]; // <-- ДОБАВЛЕНО ДЛЯ ИИ
  urls: {
    web: string;
    thumb: string;
  };
}

interface GalleryProps {
  photos: MatchedPhoto[];
  slug: string;
  expiresAt?: string | null;
  isVip?: boolean;
  currentLanguage?: 'fr' | 'en' | 'ru';
  guestClusters?: Record<string, GuestCluster>; // <-- ДОБАВЛЕНА БАЗА ЛИЦ
}

// --- ПЕРЕВОДЫ ДЛЯ LIGHTBOX И SMART SEARCH ---
const translations = {
  fr: { 
    download: "Télécharger", share: "Partager", saveAll: "Enregistrer mes photos", copied: "Lien copié !", shareText: "Regardez cette magnifique photo sur KURGINIAN Premium Gallery ✨",
    expiresText: "Votre abonnement premium est actif jusqu'au",
    feedbackTitle: "Merci !", feedbackText: "Vos émotions sont précieuses. Partagez votre avis sur Instagram.", instagramBtn: "Écrire sur Instagram",
    noPhotos: "Aucune photo trouvée.",
    copyPrompt: "Copiez ce lien :",
    shareTitle: "Mes photos KURGINIAN",
    saveToGallery: "Enregistrer dans la pellicule",
    guests: "Invités",
    foundForGuest: "photos trouvées",
    resetFilter: "✕ Réinitialiser",
    downloadGuest: "Télécharger la sélection",
    whoIsHere: "Qui est sur la photo ?",
    closeScanner: "✕ Fermer",
    shareGuest: "Partager la sélection",
    shareGuestText: "Regardez ma sélection de photos personnelle de l'événement ! ✨"
  },
  en: { 
    download: "Download", share: "Share", saveAll: "Save my photos", copied: "Link copied!", shareText: "Look at this beautiful photo on KURGINIAN Premium Gallery ✨",
    expiresText: "Your premium subscription is active until",
    feedbackTitle: "Thank you!", feedbackText: "Your emotions are precious. Share your review on Instagram.", instagramBtn: "Write on Instagram",
    noPhotos: "No photos found.",
    copyPrompt: "Copy this link:",
    shareTitle: "My KURGINIAN photos",
    saveToGallery: "Save to Camera Roll",
    guests: "Guests",
    foundForGuest: "photos found",
    resetFilter: "✕ Reset Filter",
    downloadGuest: "Download selection",
    whoIsHere: "Who is here?",
    closeScanner: "✕ Close",
    shareGuest: "Share collection",
    shareGuestText: "Check out my personal photo collection from the event! ✨"
  },
  ru: {
    download: "Скачать", share: "Поделиться", saveAll: "Сохранить мои фото", copied: "Ссылка скопирована!", shareText: "Посмотрите на это великолепное фото в KURGINIAN Premium Gallery ✨",
    expiresText: "Ваша премиум-подписка активна до",
    feedbackTitle: "Спасибо!", feedbackText: "Ваши эмоции бесценны. Поделитесь отзывом в Instagram.", instagramBtn: "Написать в Instagram",
    noPhotos: "Фотографии не найдены.",
    copyPrompt: "Скопируйте ссылку:",
    shareTitle: "Мои фото KURGINIAN",
    saveToGallery: "Сохранить в фотопленку",
    guests: "Гости",
    foundForGuest: "фото найдено",
    resetFilter: "✕ Сбросить фильтр",
    downloadGuest: "Скачать архив гостя",
    whoIsHere: "Кто на фото?",
    closeScanner: "✕ Скрыть",
    shareGuest: "Поделиться подборкой",
    shareGuestText: "Посмотрите мою персональную подборку фотографий с мероприятия! ✨"
  }
} as const;

// --- ВАРИАНТЫ АНИМАЦИИ ---
const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, 
    },
  },
};

const brickVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  },
};

// --- КОМПОНЕНТ АВАТАРА ГОСТЯ (CSS МАГИЯ КРОПА ЛИЦА) ---
function FaceBubble({ cluster, photos, isSelected, onClick }: { cluster: GuestCluster, photos: MatchedPhoto[], isSelected: boolean, onClick: () => void }) {
  const photo = photos.find(p => p.filename === cluster.avatar_filename);
  if (!photo) return null;

  const [x1, y1, x2, y2] = cluster.bbox;
  const faceWidth = x2 - x1;
  const faceHeight = y2 - y1;
  
  // 1. Смещаем центр лица чуть выше (0.4 вместо 0.5), чтобы глаза были по центру, а не нос
  const cx = x1 + faceWidth / 2;
  const cy = y1 + faceHeight * 0.4;
  
  // 2. Коэффициент запаса (1.8 = 180%). Добавляем «воздух», чтобы влезли волосы, подбородок и шея.
  const paddingFactor = 1.8;
  const targetSize = Math.max(faceWidth, faceHeight) * paddingFactor;

  // 3. Вычисляем, во сколько раз оригинальная картинка больше нашего целевого "квадрата лица"
  const widthPercent = (photo.width / targetSize) * 100;
  const heightPercent = (photo.height / targetSize) * 100;

  // 4. Вычисляем точные проценты для сдвига картинки
  const transX = (cx / photo.width) * 100;
  const transY = (cy / photo.height) * 100;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden cursor-pointer transition-all duration-300 
        ${isSelected ? 'ring-2 ring-lux-gold shadow-gold-glow scale-110' : 'ring-1 ring-white/20 opacity-70 hover:opacity-100'}`}
    >
      {/* Используем абсолютное позиционирование с отрицательным сдвигом для безупречного центрирования */}
      <img 
        src={photo.urls.thumb} 
        alt="Guest"
        className="absolute max-w-none pointer-events-none select-none"
        style={{
          width: `${widthPercent}%`,
          height: `${heightPercent}%`,
          left: '50%',
          top: '50%',
          transform: `translate(-${transX}%, -${transY}%)`
        }}
      />
    </motion.button>
  );
}

// --- КОМПОНЕНТ ОДНОГО ФОТО ---
function PhotoRowItem({ photo, index, onOpen }: { photo: MatchedPhoto; index: number; onOpen: () => void }) {
  const flexGrow = photo.width / photo.height;
  const flexBasis = flexGrow * 250; 
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      layout // <-- КЛЮЧ ДЛЯ ПЛАВНОЙ ФИЛЬТРАЦИИ ГОСТЕЙ
      id={`photo-card-${index}`}
      variants={brickVariants}
      initial="hidden"       // <-- ДОБАВЛЕНО ДЛЯ АНИМАЦИИ ИСЧЕЗНОВЕНИЯ
      animate="visible"      // <-- ДОБАВЛЕНО ДЛЯ АНИМАЦИИ ИСЧЕЗНОВЕНИЯ
      exit={{ opacity: 0, scale: 0.8 }} // <-- ДОБАВЛЕНО ДЛЯ АНИМАЦИИ ИСЧЕЗНОВЕНИЯ
      whileHover={{ scale: 1.015, zIndex: 1 }}
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="relative overflow-hidden group border border-lux-gold/10 hover:border-lux-gold/60 transition-colors shadow-lg active:shadow-gold-glow cursor-pointer bg-lux-card"
      style={{
        flexGrow: flexGrow,
        flexBasis: `${flexBasis}px`,
        aspectRatio: `${photo.width} / ${photo.height}`,
      }}
    >
      {/* ПРЕМИАЛЬНЫЙ BLURHASH ИЛИ СКЕЛЕТОН */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10 overflow-hidden bg-[#0a0a0a]">
          {photo.blurhash ? (
            <Blurhash
              hash={photo.blurhash}
              width="100%"
              height="100%"
              resolutionX={32}
              resolutionY={32}
              punch={1}
            />
          ) : (
            <motion.div 
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
            />
          )}
        </div>
      )}

      <Image
        src={photo.urls.thumb}
        alt={photo.filename}
        fill
        unoptimized
        priority={index < 6}
        sizes="(max-width: 768px) 100vw, 50vw"
        onLoad={() => setIsLoaded(true)}
        className={`object-cover group-hover:scale-105 transition-all duration-[800ms] ease-out ${
          isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md scale-105'
        }`}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none" />
    </motion.div>
  );
}

// --- ОСНОВНАЯ ГАЛЕРЕЯ ---
export default function Gallery({ photos, slug, expiresAt, isVip = false, currentLanguage, guestClusters }: GalleryProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [showLightboxGuests, setShowLightboxGuests] = useState(false);
  const lastTapRef = useRef<number>(0);
  const [panBounds, setPanBounds] = useState({ x: 1000, y: 1000 }); // <-- БЕЗОПАСНЫЕ ГРАНИЦЫ ДЛЯ SSR

  // --- СТЕЙТЫ SMART SEARCH (ИИ ГОСТЕЙ) ---
  const [showGuests, setShowGuests] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  // --- ФИЛЬТРАЦИЯ ФОТОГРАФИЙ ПО ВЫБРАННОМУ ГОСТЮ ---
  const filteredPhotos = selectedGuestId 
    ? photos.filter(p => p.cluster_ids?.includes(selectedGuestId))
    : photos;

  // МАГИЧЕСКАЯ ССЫЛКА: Читаем параметр ?guest= из URL при загрузке
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const guestParam = params.get('guest');
      if (guestParam && guestClusters && guestClusters[guestParam]) {
        setSelectedGuestId(guestParam);
      }
    }
  }, [guestClusters]);

  // ФУНКЦИЯ ШАРИНГА ПОДБОРКИ
  const handleShareGuest = async () => {
    triggerVibration(50);
    trackAction('share'); 
    // Генерируем магическую ссылку, которая сразу откроет этого гостя
    const shareLink = `${window.location.origin}/weddings/${slug}?guest=${selectedGuestId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KURGINIAN Premium',
          text: t.shareGuestText, 
          url: shareLink,
        });
        return; 
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
        return; 
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      prompt(t.copyPrompt, shareLink);
    }
  };

  useEffect(() => {
    // Вычисляем 80% экрана для комфортного панорамирования без улетания в бесконечность
    setPanBounds({ x: window.innerWidth * 0.8, y: window.innerHeight * 0.8 });
  }, []);
  
  // === РЕФЫ ДЛЯ МУЛЬТИТАЧА (PINCH-TO-ZOOM) ===
  const initialTouchDistance = useRef<number | null>(null);
  const currentScale = useRef<number>(1);
  
  // Стейты уведомлений
  const [showToast, setShowToast] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Получаем язык из глобального контекста
  const { language: contextLanguage } = useAppContext();
  
  // Если язык пришел сверху (prop), используем его, иначе — глобальный
  const language = currentLanguage || contextLanguage;
  const t = translations[language];

  // === HAPTIC FEEDBACK (Тактильность) ===
  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  // === ТИХАЯ АНАЛИТИКА (B2B Dashboard) ===
  const trackAction = (action: 'download' | 'share' | 'save_all', filename?: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      fetch(`${apiUrl}/api/weddings/${slug}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, filename }),
        keepalive: true, 
      }).catch(() => {}); 
    } catch (e) {}
  };

  // Функция скачивания
  const handleDownload = async (filename: string, url: string) => {
    triggerVibration(50);
    trackAction('download', filename); 
    try {
      const fetchUrl = `${url}?download=${Date.now()}`;
      const response = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' });
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      // --- УМНЫЙ ПОКАЗ ОКНА ОТЗЫВОВ (1 раз в сутки) ---
      setTimeout(() => {
        const lastShown = localStorage.getItem('kurginian_feedback_shown');
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; 

        if (!lastShown || now - parseInt(lastShown) > oneDay) {
          setShowFeedbackModal(true);
          localStorage.setItem('kurginian_feedback_shown', now.toString());
        }
      }, 1500); 

    } catch (err) {
      console.error(err);
    }
  };

  // Функция "Поделиться" (Native Web Share + Fallback)
  const handleShare = async (filename: string) => {
    triggerVibration(50);
    trackAction('share', filename); 
    const shareLink = `${window.location.origin}/weddings/${slug}/photo/${filename}?mode=share`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KURGINIAN Premium',
          text: t.shareText, 
          url: shareLink,
        });
        return; 
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
        return; 
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      prompt(t.copyPrompt, shareLink);
    }
  };

  // === УЛУЧШЕННАЯ ФУНКЦИЯ СОХРАНЕНИЯ С PROGRESS BAR ===
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // ПРИНИМАЕТ targetPhotos, чтобы можно было скачать либо всё, либо только фото гостя
  const handleSaveAll = async (targetPhotos: MatchedPhoto[]) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveProgress(0);
    triggerVibration([50, 30, 50]);
    trackAction('save_all');

    // 🔥 ИМИТАЦИЯ ПРОГРЕССА (Smart UX)
    const progressInterval = setInterval(() => {
      setSaveProgress((prev) => {
        const step = Math.floor(Math.random() * 10) + 5; 
        const next = prev + step;
        return next > 90 ? 90 : next; 
      });
    }, 300);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/generate-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: targetPhotos.map(p => p.filename) })
      });

      if (!response.ok) throw new Error("ZIP generation failed");
      const data = await response.json();
      if (!data.url) throw new Error("No URL in response");

      clearInterval(progressInterval);
      setSaveProgress(100); // 100% успех

      setTimeout(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = data.url;
        } else {
          const link = document.createElement('a');
          link.href = data.url;
          link.download = `KURGINIAN_${slug.toUpperCase()}_PHOTOS.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setIsSaving(false);
        setSaveProgress(0);
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      console.error("Save all failed:", err);
      const msg = language === 'ru' 
        ? 'Ошибка скачивания архива. Попробуйте позже или скачайте фото по одному.' 
        : language === 'en' 
        ? 'Archive download error. Please try again or download photos individually.' 
        : 'Erreur de téléchargement. Veuillez réessayer ou télécharger les photos une par une.';
      alert(msg);
      setIsSaving(false);
      setSaveProgress(0);
    }
  };

  // === HISTORY API: Умный перехват кнопки Назад ===
  const openLightbox = (index: number) => {
    triggerVibration(10); 
    setZoomScale(1); // Сброс зума при открытии
    setShowLightboxGuests(false); // Сбрасываем сканер лиц
    window.history.pushState({ lightbox: true }, "");
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    
    // SMART SCROLL: Возвращаем фокус на фото в сетке
    if (selectedIndex !== null) {
      const currentIdx = selectedIndex;
      setTimeout(() => {
        const element = document.getElementById(`photo-card-${currentIdx}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }

    setSelectedIndex(null);
    setZoomScale(1);
    if (window.history.state && window.history.state.lightbox) {
      window.history.back();
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (selectedIndex !== null) {
        setSelectedIndex(null);
        setZoomScale(1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedIndex]);

  // Обработка клавиатуры и свайпов
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredPhotos.length, zoomScale]);

  const goToNext = () => {
    if (zoomScale > 1) setZoomScale(1); // Сброс зума при перелистывании
    setShowLightboxGuests(false); // Скрываем сканер при перелистывании
    triggerVibration(10); 
    setSelectedIndex((prev) => (prev! + 1) % filteredPhotos.length);
  };
  
  const goToPrev = () => {
    if (zoomScale > 1) setZoomScale(1);
    setShowLightboxGuests(false); // Скрываем сканер при перелистывании
    triggerVibration(10); 
    setSelectedIndex((prev) => (prev! - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  // Функция переключения зума (Double Tap)
  const toggleZoom = () => {
    triggerVibration(15);
    setZoomScale(prev => (prev > 1 ? 1 : 2.5));
  };

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-20 bg-lux-card border border-lux-gold/20 rounded-sm">
        <p className="font-cinzel text-lux-gold/60 uppercase tracking-widest">
          {t.noPhotos}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* СЕТКА ФОТОГРАФИЙ */}
      <Suspense fallback={<div className="min-h-screen bg-lux-bg" />}>
        
        {/* === БЛОК КНОПОК И SMART SEARCH === */}
        <div className="flex flex-col items-center mb-8 px-4 gap-3">
          
          {/* Главные кнопки (Сохранить всё + Гости) */}
          {!selectedGuestId && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex w-full max-w-sm gap-2">
              <button
                onClick={() => handleSaveAll(photos)}
                disabled={isSaving}
                className={`flex-[2] py-4 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-sm flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
                  isSaving ? 'bg-[#111] text-lux-gold border border-lux-gold/30' : 'bg-lux-gold text-black shadow-gold-glow active:scale-[0.98]'
                }`}
              >
                {/* 🔥 ПОЛЗУНОК ПРОГРЕССА (Заполняет кнопку золотым фоном) */}
                {isSaving && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-lux-gold/20 transition-all duration-300 ease-out"
                    style={{ width: `${saveProgress}%` }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-2">
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-lux-gold/20 border-t-lux-gold rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                  <span>
                    {isSaving 
                      ? `${language === 'ru' ? 'АРХИВАЦИЯ' : language === 'fr' ? 'ARCHIVAGE' : 'ARCHIVING'} ${saveProgress}%` 
                      : t.saveAll}
                  </span>
                </div>
              </button>

              {/* Кнопка "Гости" только для VIP */}
              {isVip && guestClusters && Object.keys(guestClusters).length > 0 && (
                <button
                  onClick={() => { triggerVibration(15); setShowGuests(!showGuests); }}
                  className={`flex-[1] flex items-center justify-center gap-2 py-4 font-bold uppercase tracking-widest text-[10px] md:text-xs rounded-sm transition-all border ${
                    showGuests ? 'bg-lux-gold text-black border-transparent shadow-gold-glow' : 'bg-[#111] text-lux-gold border-lux-gold/30 hover:bg-white/5'
                  }`}
                >
                  ✨ {t.guests}
                </button>
              )}
            </motion.div>
          )}

          {/* === КАРУСЕЛЬ ГОСТЕЙ (Выезжает по клику) === */}
          <AnimatePresence>
            {showGuests && !selectedGuestId && guestClusters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full max-w-2xl overflow-hidden"
              >
                <div className="flex gap-4 overflow-x-auto py-4 px-2 no-scrollbar items-center justify-start snap-x snap-mandatory">
                  {Object.entries(guestClusters).map(([id, cluster]) => (
                    <div key={id} className="snap-center">
                      <FaceBubble 
                        cluster={cluster} 
                        photos={photos} 
                        isSelected={selectedGuestId === id} 
                        onClick={() => { triggerVibration(30); setSelectedGuestId(id); setShowGuests(false); }} 
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* === ПАНЕЛЬ АКТИВНОГО ФИЛЬТРА (Показывается когда выбран гость) === */}
          <AnimatePresence>
            {selectedGuestId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-[#111] border border-lux-gold/30 rounded-xl p-5 flex flex-col items-center gap-5 shadow-lg relative overflow-hidden"
              >
                {/* Шапка с аватаркой и счетчиком */}
                <div className="flex items-center gap-5 w-full">
                  <FaceBubble cluster={guestClusters![selectedGuestId]} photos={photos} isSelected={true} onClick={() => {}} />
                  <div className="flex flex-col">
                    <span className="text-lux-gold font-cinzel text-2xl font-bold leading-none">{filteredPhotos.length}</span>
                    <span className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest mt-1">{t.foundForGuest}</span>
                  </div>
                </div>

                {/* === БЛОК КНОПОК (ПРЕМИАЛЬНАЯ КОМПОНОВКА) === */}
                <div className="flex flex-col w-full gap-2">
                  
                  {/* Главная кнопка: Скачать архив */}
                  <button
                    onClick={() => handleSaveAll(filteredPhotos)}
                    disabled={isSaving}
                    className={`w-full py-3.5 font-bold uppercase tracking-widest text-[10px] md:text-xs rounded-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all relative overflow-hidden ${
                      isSaving ? 'bg-[#0a0a0a] text-lux-gold border border-lux-gold/30' : 'bg-lux-gold text-black shadow-gold-glow'
                    }`}
                  >
                    {/* Ползунок прогресса для архивации */}
                    {isSaving && (
                      <div className="absolute left-0 top-0 bottom-0 bg-lux-gold/20 transition-all duration-300 ease-out" style={{ width: `${saveProgress}%` }} />
                    )}

                    <div className="relative z-10 flex items-center gap-2">
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      )}
                      <span>
                        {isSaving 
                          ? `${language === 'ru' ? 'АРХИВАЦИЯ' : language === 'fr' ? 'ARCHIVAGE' : 'ARCHIVING'} ${saveProgress}%` 
                          : t.downloadGuest}
                      </span>
                    </div>
                  </button>

                  {/* Вторичные действия: Поделиться подборкой + Сбросить фильтр */}
                  <div className="flex w-full gap-2">
                    <button
                      onClick={handleShareGuest}
                      className="flex-[2] py-3 bg-[#1a1a1a] hover:bg-[#222] border border-lux-gold/30 text-lux-gold uppercase text-[9px] md:text-[10px] font-bold tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                      </svg>
                      {t.shareGuest}
                    </button>
                    
                    <button
                      onClick={() => {
                        triggerVibration(10);
                        // Сбрасываем URL параметр при закрытии (чтобы ссылка снова стала чистой)
                        if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname);
                        setSelectedGuestId(null);
                      }}
                      className="flex-[1] py-3 text-white/50 hover:text-white uppercase text-[9px] md:text-[10px] font-bold tracking-widest border border-white/10 rounded-sm hover:bg-white/5 transition-all active:scale-[0.98]"
                    >
                      {t.resetFilter}
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div 
          layout // <-- Добавлено для плавной анимации фильтрации сетки
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-wrap justify-center gap-2 md:gap-4 pt-4 pb-20 after:content-[''] after:flex-grow-[999]"
        >
          {/* Оборачиваем элементы сетки в AnimatePresence для плавного исчезновения */}
          <AnimatePresence>
            {filteredPhotos.map((photo, index) => (
              <PhotoRowItem 
                key={photo.filename} 
                photo={photo} 
                index={index} 
                onOpen={() => openLightbox(index)} 
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* === ПРЕМИАЛЬНОЕ НАДПИСЬ ОБ ОКОНЧАНИИ ДОСТУПА (Только для гостей) === */}
        {!isVip && expiresAt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center pb-12 px-4"
          >
            <p className="font-cinzel text-xs md:text-sm text-lux-gold/60 uppercase tracking-[0.2em]">
              {t.expiresText} <span className="text-lux-gold font-bold">{new Date(expiresAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'fr' ? 'fr-FR' : 'en-US')}</span>
            </p>
            <div className="w-12 h-[1px] bg-lux-gold/30 mx-auto mt-4" />
          </motion.div>
        )}
      </Suspense>

      {/* ПРЕМИАЛЬНЫЙ LIGHTBOX (Всплывающее окно) */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center select-none touch-none overflow-hidden"
          >
            {/* Кнопка закрытия (Справа) */}
            <button 
              onClick={closeLightbox}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-[120] p-4 flex items-center justify-center text-white/70 hover:text-lux-gold transition-colors"
            >
              <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* === ПРЕМИУМ-БРЕНДИНГ (Слева сверху) === */}
            <motion.a
              href="https://kurginian.pro"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerVibration(10)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
              className="absolute top-8 left-6 md:top-10 md:left-10 z-[105] font-cinzel text-lux-gold/40 hover:text-lux-gold tracking-[0.4em] text-[10px] md:text-xs uppercase transition-all duration-500 drop-shadow-lg whitespace-nowrap"
            >
              Kurginian Premium
            </motion.a>

            {/* Основное фото с поддержкой СВАЙПА И ЗУМА (Multitouch Pinch-to-Zoom Edition) */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none">
              <motion.div
                key={selectedIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  scale: zoomScale,
                  x: zoomScale === 1 ? 0 : undefined, // Умный возврат в центр
                  y: zoomScale === 1 ? 0 : undefined  // Умный возврат в центр
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                drag={true}
                dragDirectionLock={zoomScale === 1} 
                // Твоя математика (80% экрана), чтобы object-contain фото не блокировалось, но и не улетало насовсем
                dragConstraints={zoomScale > 1 ? { left: -panBounds.x, right: panBounds.x, top: -panBounds.y, bottom: panBounds.y } : { left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={zoomScale > 1 ? 0.15 : 0.6}
                dragMomentum={true}
                // --- ЛОГИКА PINCH-TO-ZOOM (Два пальца) ---
                onTouchStart={(e) => {
                  if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    initialTouchDistance.current = Math.hypot(dx, dy);
                    currentScale.current = zoomScale;
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2 && initialTouchDistance.current !== null) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const distance = Math.hypot(dx, dy);
                    const scaleFactor = distance / initialTouchDistance.current;
                    // Ограничиваем зум от 1 до 4
                    const newScale = Math.min(Math.max(1, currentScale.current * scaleFactor), 4);
                    setZoomScale(newScale);
                  }
                }}
                onTouchEnd={(e) => {
                  if (e.touches.length < 2) {
                    initialTouchDistance.current = null;
                    // Автоматический сброс в центр, если масштаб после щипка близок к 1
                    if (zoomScale < 1.1) {
                      setZoomScale(1);
                    }
                  }
                }}
                // --- ЛОГИКА ДВОЙНОГО ТАПА ---
                onTap={() => {
                  const now = Date.now();
                  if (now - lastTapRef.current < 300) {
                    toggleZoom();
                  }
                  lastTapRef.current = now;
                }}
                // --- УМНАЯ ЛОГИКА СВАЙПОВ И ЗАКРЫТИЯ (Intent Detection) ---
                onDragEnd={(_, info) => {
                  if (zoomScale === 1) {
                    // Вычисляем доминирующую ось (намерение пользователя)
                    const isHorizontal = Math.abs(info.offset.x) > Math.abs(info.offset.y);

                    if (isHorizontal) {
                      // Строго горизонтальный свайп: игнорируем Y-инерцию
                      if (info.offset.x > 80 || info.velocity.x > 500) {
                        goToPrev();
                      } else if (info.offset.x < -80 || info.velocity.x < -500) {
                        goToNext();
                      }
                    } else {
                      // Строго вертикальный свайп: логика закрытия
                      if (Math.abs(info.offset.y) > 120 || Math.abs(info.velocity.y) > 500) {
                        closeLightbox();
                      }
                    }
                  }
                }}
                className="relative w-full h-full flex items-center justify-center z-[102]"
                style={{ cursor: zoomScale > 1 ? 'move' : 'grab' }}
              >
                <Image
                  src={filteredPhotos[selectedIndex].urls.web}
                  alt="Full view"
                  fill
                  unoptimized
                  className="object-contain pointer-events-none select-none"
                  priority
                  draggable={false}
                  placeholder="blur" 
                  blurDataURL={filteredPhotos[selectedIndex].urls.thumb} 
                />
              </motion.div>

              {/* 🔥 ТИХАЯ ПРЕДЗАГРУЗКА СОСЕДНИХ ФОТО 🔥 */}
              <div className="hidden">
                <Image 
                  src={filteredPhotos[(selectedIndex + 1) % filteredPhotos.length].urls.web} 
                  alt="preload next" 
                  width={1} height={1} priority 
                />
                <Image 
                  src={filteredPhotos[(selectedIndex - 1 + filteredPhotos.length) % filteredPhotos.length].urls.web} 
                  alt="preload prev" 
                  width={1} height={1} priority 
                />
              </div>

              {/* Стрелки по бокам (Только для ПК) */}
              <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="hidden md:block absolute left-8 p-4 text-white/30 hover:text-lux-gold transition-all select-none z-[105]">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="hidden md:block absolute right-8 p-4 text-white/30 hover:text-lux-gold transition-all select-none z-[105]">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 px-6 z-[110]">
              
              {/* === ЛОКАТОР ГОСТЕЙ В ФОТОГРАФИИ (Smart In-Photo Search) === */}
              {isVip && guestClusters && filteredPhotos[selectedIndex].cluster_ids && filteredPhotos[selectedIndex].cluster_ids.length > 0 && (
                <div className="flex flex-col items-center mb-2 w-full z-[115]">
                  <AnimatePresence>
                    {showLightboxGuests && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="flex gap-3 overflow-x-auto max-w-full p-3 bg-[#050505]/80 backdrop-blur-xl border border-lux-gold/30 rounded-2xl mb-4 shadow-[0_0_30px_rgba(212,175,55,0.15)] pointer-events-auto"
                      >
                        {filteredPhotos[selectedIndex].cluster_ids.map(id => {
                          const cluster = guestClusters[id];
                          if (!cluster) return null;
                          return (
                            <FaceBubble
                              key={id}
                              cluster={cluster}
                              photos={photos} 
                              isSelected={false}
                              onClick={() => {
                                triggerVibration([30, 50]);
                                setShowLightboxGuests(false);
                                closeLightbox();
                                setTimeout(() => setSelectedGuestId(id), 300); // Даем шторке плавно закрыться
                              }}
                            />
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => {
                      triggerVibration(10);
                      setShowLightboxGuests(!showLightboxGuests);
                    }}
                    className={`px-5 py-2.5 rounded-full font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 border pointer-events-auto ${
                      showLightboxGuests 
                        ? 'bg-lux-gold text-black border-transparent shadow-gold-glow' 
                        : 'bg-[#111]/80 backdrop-blur-md text-lux-gold border-lux-gold/40 hover:bg-white/10'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    {showLightboxGuests ? t.closeScanner : t.whoIsHere}
                  </button>
                </div>
              )}
              {/* === КОНЕЦ ЛОКАТОРА === */}

              {/* Toast Уведомление о копировании ссылки */}
              <AnimatePresence>
                {showToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-lux-gold text-black px-4 py-2 rounded-sm font-bold shadow-gold-glow text-[10px] md:text-xs uppercase tracking-wider mb-2 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {t.copied}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Bar (Скачать / Поделиться) */}
              <div className="w-full max-w-md flex gap-3">
                <button
                  onClick={() => handleDownload(filteredPhotos[selectedIndex].filename, filteredPhotos[selectedIndex].urls.web)}
                  className="flex-[3] flex items-center justify-center gap-2 bg-lux-gold text-black px-4 py-3.5 rounded-sm transition-all active:scale-[0.98] shadow-gold-glow hover:bg-white font-bold"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span className="uppercase tracking-widest text-[10px] md:text-xs">{t.download}</span>
                </button>
                
                <button
                  onClick={() => handleShare(filteredPhotos[selectedIndex].filename)}
                  className="flex-[2] flex items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-lux-gold/30 text-lux-gold px-4 py-3.5 rounded-sm transition-all active:scale-[0.98] shadow-lg"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="font-medium uppercase tracking-widest text-[10px] md:text-xs">{t.share}</span>
                </button>
              </div>

              {/* Счетчик */}
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-sm text-white/60 text-xs font-mono">
                {selectedIndex + 1} / {filteredPhotos.length}
              </div>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* === ПРЕМИАЛЬНОЕ ОКНО ОТЗЫВА (Pop-up после скачивания) === */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 touch-none"
            onClick={() => setShowFeedbackModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()} 
              className="w-full max-w-sm bg-[#0a0a0a] border border-lux-gold/30 rounded-xl p-8 text-center shadow-gold-glow relative"
            >
              {/* Кнопка закрытия крестиком */}
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>

              {/* Декоративный элемент (Имитация логотипа/иконки) */}
              <div className="w-12 h-12 rounded-full bg-lux-gold/10 border border-lux-gold/40 flex items-center justify-center mx-auto mb-5">
                <svg className="w-5 h-5 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>

              <h3 className="font-cinzel text-lux-gold text-lg mb-2 uppercase tracking-widest">
                {t.feedbackTitle}
              </h3>
              <p className="text-white/80 font-cormorant text-[1.1rem] italic mb-8 leading-relaxed">
                {t.feedbackText}
              </p>

              <a
                href="https://instagram.com/hdart26"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  triggerVibration(10);
                  setShowFeedbackModal(false);
                }}
                className="block w-full py-3.5 bg-lux-gold text-black text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors rounded-sm shadow-lg active:scale-95"
              >
                {t.instagramBtn}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}