'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// --- ИНТЕРФЕЙСЫ ---
interface MatchedPhoto {
  filename: string;
  width: number;
  height: number;
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
}

// --- ПЕРЕВОДЫ ДЛЯ LIGHTBOX ---
const translations = {
  fr: { 
    download: "Télécharger", share: "Partager", saveAll: "Enregistrer mes photos", copied: "Lien copié !", shareText: "Regardez cette magnifique photo sur KURGINIAN Premium Gallery ✨",
    expiresText: "L'accès à la galerie premium sera clôturé le",
    feedbackTitle: "Merci !", feedbackText: "Vos émotions sont précieuses. Partagez votre avis sur Instagram.", instagramBtn: "Écrire sur Instagram",
    noPhotos: "Aucune photo trouvée.",
    copyPrompt: "Copiez ce lien :",
    shareTitle: "Mes photos KURGINIAN"
  },
  en: { 
    download: "Download", share: "Share", saveAll: "Save my photos", copied: "Link copied!", shareText: "Look at this beautiful photo on KURGINIAN Premium Gallery ✨",
    expiresText: "Access to the premium gallery will close on",
    feedbackTitle: "Thank you!", feedbackText: "Your emotions are precious. Share your review on Instagram.", instagramBtn: "Write on Instagram",
    noPhotos: "No photos found.",
    copyPrompt: "Copy this link:",
    shareTitle: "My KURGINIAN photos"
  },
  ru: {
    download: "Скачать", share: "Поделиться", saveAll: "Сохранить мои фото", copied: "Ссылка скопирована!", shareText: "Посмотрите на это великолепное фото в KURGINIAN Premium Gallery ✨",
    expiresText: "Доступ к премиум-галерее будет закрыт",
    feedbackTitle: "Спасибо!", feedbackText: "Ваши эмоции бесценны. Поделитесь отзывом в Instagram.", instagramBtn: "Написать в Instagram",
    noPhotos: "Фотографии не найдены.",
    copyPrompt: "Скопируйте ссылку:",
    shareTitle: "Мои фото KURGINIAN"
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

// --- КОМПОНЕНТ ОДНОГО ФОТО ---
function PhotoRowItem({ photo, index, onOpen }: { photo: MatchedPhoto; index: number; onOpen: () => void }) {
  const flexGrow = photo.width / photo.height;
  const flexBasis = flexGrow * 250; 
  const [isLoaded, setIsLoaded] = useState(false); // <-- Умный статус загрузки

  return (
    <motion.div
      variants={brickVariants}
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
      {/* Премиальный лоадер (Скелетон), виден ТОЛЬКО пока фото грузится */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#070707] flex items-center justify-center animate-pulse z-10">
          <span className="font-cinzel text-[10px] text-lux-gold/30 tracking-widest">KURGINIAN</span>
        </div>
      )}

      <Image
        src={photo.urls.thumb}
        alt={photo.filename}
        fill
        priority={index < 6}
        sizes="(max-width: 768px) 100vw, 50vw"
        onLoad={() => setIsLoaded(true)} // <-- Запускаем появление, когда сеть реально отдала файл
        className={`object-cover group-hover:scale-105 transition-all duration-[800ms] ease-out ${
          isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md scale-105'
        }`}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none" />
    </motion.div>
  );
}

// --- ОСНОВНАЯ ГАЛЕРЕЯ ---
export default function Gallery({ photos, slug, expiresAt, isVip = false }: GalleryProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Новые стейты для локализации и уведомлений прямо в галерее
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');
  const [showToast, setShowToast] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Синхронизация языка
  useEffect(() => {
    const globalLang = localStorage.getItem('kurginian_global_lang') as 'fr' | 'en' | 'ru';
    const localLang = localStorage.getItem(`lang_${slug}`) as 'fr' | 'en' | 'ru';
    if (globalLang) setLanguage(globalLang);
    else if (localLang) setLanguage(localLang);
  }, [slug]);

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
        keepalive: true, // Гарантирует отправку, даже если юзер закрыл вкладку
      }).catch(() => {}); // Абсолютно тихий перехват, чтобы не спамить в консоль
    } catch (e) {
      // Игнорируем ошибки (главное - не сломать UX гостя)
    }
  };

  // Функция скачивания
  const handleDownload = async (filename: string, url: string) => {
    triggerVibration(50);
    trackAction('download', filename); // СИГНАЛ АНАЛИТИКИ
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
        const oneDay = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах

        if (!lastShown || now - parseInt(lastShown) > oneDay) {
          setShowFeedbackModal(true);
          localStorage.setItem('kurginian_feedback_shown', now.toString());
        }
      }, 1500); // Задержка 1.5 сек, чтобы не перебивать само скачивание

    } catch (err) {
      console.error(err);
    }
  };

  // Функция "Поделиться" (Native Web Share + Fallback)
  const handleShare = async (filename: string) => {
    triggerVibration(50);
    trackAction('share', filename); // СИГНАЛ АНАЛИТИКИ
    const shareLink = `${window.location.origin}/weddings/${slug}/photo/${filename}?mode=share`;
    
    // Проверяем поддержку Native Web Share API (мобильные ОС и современные браузеры)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KURGINIAN Premium',
          text: t.shareText, // Используем премиальный текст вместо просто слова "Поделиться"
          url: shareLink,
        });
        return; // Успешно поделились через нативную шторку
      } catch (err) {
        // Если юзер сам закрыл шторку (AbortError) - просто игнорируем
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
        return; 
      }
    }
    
    // Fallback: Если Web Share API недоступен, копируем в буфер (старое поведение)
    try {
      await navigator.clipboard.writeText(shareLink);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      prompt(t.copyPrompt, shareLink);
    }
  };

  // === НОВАЯ ФУНКЦИЯ: МАССОВОЕ СОХРАНЕНИЕ ФОТО ===
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAll = async () => {
    if (isSaving) return;
    setIsSaving(true);
    triggerVibration([50, 30, 50]);
    trackAction('save_all'); // СИГНАЛ АНАЛИТИКИ

    try {
      const filesToShare: File[] = [];
      
      // Берем все фото из текущей выборки
      for (const photo of photos) {
        const fetchUrl = `${photo.urls.web}?download=${Date.now()}`;
        const response = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' });
        const blob = await response.blob();
        filesToShare.push(new File([blob], photo.filename, { type: "image/jpeg" }));
      }

      // Пытаемся открыть шторку, но с перехватом ошибки безопасности
      try {
        if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
          await navigator.share({
            files: filesToShare,
            title: t.shareTitle,
          });
        } else {
          throw new Error("Share not supported"); // Искусственно переходим к Fallback
        }
      } catch (shareErr) {
        console.warn("Share API timeout/blocked, falling back to individual downloads:", shareErr);
        // FALLBACK: Качаем файлы по одному с паузой, чтобы браузер не счел это спамом
        for (const photo of photos) {
          await handleDownload(photo.filename, photo.urls.web);
          await new Promise(r => setTimeout(r, 600)); // Пауза 0.6 сек
        }
      }

    } catch (err) {
      console.error("Save all failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // === HISTORY API: Умный перехват кнопки Назад ===
  const openLightbox = (index: number) => {
    triggerVibration(10); // Легкий "тык" при открытии фото
    window.history.pushState({ lightbox: true }, "");
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    triggerVibration(10);
    setSelectedIndex(null);
    if (window.history.state && window.history.state.lightbox) {
      window.history.back();
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (selectedIndex !== null) setSelectedIndex(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedIndex]);

  // Обработка клавиатуры и свайпов (Стрелки и Escape)
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, photos.length]);

  const goToNext = () => {
    triggerVibration(10); // Легкий "тык" при свайпе
    setSelectedIndex((prev) => (prev! + 1) % photos.length);
  };
  
  const goToPrev = () => {
    triggerVibration(10); // Легкий "тык" при свайпе
    setSelectedIndex((prev) => (prev! - 1 + photos.length) % photos.length);
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
        {/* Кнопка "Сохранить всё" над сеткой */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8 px-4"
        >
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full max-w-sm py-4 bg-lux-gold text-black font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-sm shadow-gold-glow flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            {t.saveAll}
          </button>
        </motion.div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-wrap gap-2 md:gap-4 pt-10 pb-20 after:content-[''] after:flex-grow-[999]"
        >
          {photos.map((photo, index) => (
            <PhotoRowItem 
              key={photo.filename} 
              photo={photo} 
              index={index} 
              onOpen={() => openLightbox(index)} // ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ
            />
          ))}
        </motion.div>

        {/* === ПРЕМИАЛЬНАЯ НАДПИСЬ ОБ ОКОНЧАНИИ ДОСТУПА (Только для гостей) === */}
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
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center select-none touch-none"
          >
            {/* Кнопка закрытия (Справа) */}
            <button 
              onClick={closeLightbox}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-[120] w-16 h-16 flex items-center justify-center text-white/70 hover:text-lux-gold text-3xl md:text-4xl transition-colors"
            >
              ✕
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

            {/* Основное фото с поддержкой СВАЙПА */}
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <motion.div
                key={selectedIndex}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.8}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 80) goToPrev();
                  else if (info.offset.x < -80) goToNext();
                }}
                className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing z-[102]"
              >
                <Image
                  src={photos[selectedIndex].urls.web}
                  alt="Full view"
                  fill
                  className="object-contain pointer-events-none"
                  quality={95}
                  priority
                  draggable={false}
                  placeholder="blur" // 🔥 Временная подложка размытия
                  blurDataURL={photos[selectedIndex].urls.thumb} // Используем уже загруженный thumb
                />
              </motion.div>

              {/* 🔥 ТИХАЯ ПРЕДЗАГРУЗКА СОСЕДНИХ ФОТО 🔥 */}
              <div className="hidden">
                <Image 
                  src={photos[(selectedIndex + 1) % photos.length].urls.web} 
                  alt="preload next" 
                  width={1} height={1} priority 
                />
                <Image 
                  src={photos[(selectedIndex - 1 + photos.length) % photos.length].urls.web} 
                  alt="preload prev" 
                  width={1} height={1} priority 
                />
              </div>

              {/* Стрелки по бокам (Только для ПК) */}
              <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="hidden md:block absolute left-8 text-6xl text-white/30 hover:text-lux-gold transition-all select-none z-[105]">‹</button>
              <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="hidden md:block absolute right-8 text-6xl text-white/30 hover:text-lux-gold transition-all select-none z-[105]">›</button>
            </div>

            {/* НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 px-6 z-[110]">
              
              {/* Toast Уведомление о копировании ссылки */}
              <AnimatePresence>
                {showToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-lux-gold text-black px-4 py-2 rounded-sm font-bold shadow-gold-glow text-xs uppercase tracking-wider mb-2"
                  >
                    ✅ {t.copied}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Bar (Скачать / Поделиться) */}
              <div className="w-full max-w-md flex gap-3">
                <button
                  onClick={() => handleDownload(photos[selectedIndex].filename, photos[selectedIndex].urls.web)}
                  className="flex-[3] flex items-center justify-center gap-2 bg-lux-gold text-black px-4 py-3 rounded-sm transition-all active:scale-[0.98] shadow-gold-glow hover:bg-white font-bold"
                >
                  <span className="text-lg leading-none">↓</span>
                  <span className="uppercase tracking-widest text-xs">{t.download}</span>
                </button>
                
                <button
                  onClick={() => handleShare(photos[selectedIndex].filename)}
                  className="flex-[2] flex items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-lux-gold/30 text-lux-gold px-4 py-3 rounded-sm transition-all active:scale-[0.98] shadow-lg"
                >
                  <span className="text-lg leading-none">↗</span>
                  <span className="font-medium uppercase tracking-widest text-xs">{t.share}</span>
                </button>
              </div>

              {/* Счетчик */}
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-sm text-white/60 text-xs font-mono">
                {selectedIndex + 1} / {photos.length}
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
              onClick={(e) => e.stopPropagation()} // Чтобы клик по карточке не закрывал её
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