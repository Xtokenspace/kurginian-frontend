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
}

// --- ПЕРЕВОДЫ ДЛЯ LIGHTBOX ---
const translations = {
  fr: { download: "Télécharger", share: "Partager", copied: "Lien copié !" },
  en: { download: "Download", share: "Share", copied: "Link copied!" },
  ru: { download: "Скачать", share: "Поделиться", copied: "Ссылка скопирована!" }
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

  return (
    <motion.div
      variants={brickVariants}
      whileHover={{ scale: 1.015, zIndex: 1 }}
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="relative overflow-hidden group border border-lux-gold/10 hover:border-lux-gold/60 transition-colors shadow-lg active:shadow-gold-glow cursor-pointer"
      style={{
        flexGrow: flexGrow,
        flexBasis: `${flexBasis}px`,
        aspectRatio: `${photo.width} / ${photo.height}`,
      }}
    >
      <div className="absolute inset-0 bg-[#070707] flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="font-cinzel text-[10px] text-lux-gold/30 tracking-widest"
        >
          KURGINIAN
        </motion.div>
      </div>

      <Image
        src={photo.urls.thumb}
        alt={photo.filename}
        fill
        priority={index < 6}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover transition-opacity duration-700 group-hover:scale-105"
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}

// --- ОСНОВНАЯ ГАЛЕРЕЯ ---
export default function Gallery({ photos, slug }: GalleryProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Новые стейты для локализации и уведомлений прямо в галерее
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');
  const [showToast, setShowToast] = useState(false);

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

  // Функция скачивания
  const handleDownload = async (filename: string, url: string) => {
    triggerVibration(50); // Уверенный отклик при скачивании
    try {
      const fetchUrl = `${url}?download=${Date.now()}`;
      const response = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' });
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
    }
  };

  // Функция "Поделиться"
  const handleShare = async (filename: string) => {
    triggerVibration(50); // Уверенный отклик
    const shareLink = `${window.location.origin}/weddings/${slug}/photo/${filename}?mode=share`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      prompt(language === 'ru' ? 'Скопируйте ссылку:' : 'Copiez ce lien :', shareLink);
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
          No photos found.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* СЕТКА ФОТОГРАФИЙ */}
      <Suspense fallback={<div className="min-h-screen bg-lux-bg" />}>
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
      </Suspense>

      {/* ПРЕМИАЛЬНЫЙ LIGHTBOX */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center select-none touch-none"
          >
            {/* Кнопка закрытия */}
            <button 
              onClick={closeLightbox} // ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ
              className="absolute top-6 right-6 z-[110] w-12 h-12 flex items-center justify-center text-white text-4xl hover:text-lux-gold transition-colors"
            >
              ✕
            </button>

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
    </>
  );
}