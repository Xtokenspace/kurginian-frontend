'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';

// --- ИНТЕРФЕЙСЫ БЭКЕНДА (V10) ---
interface BlueprintItem {
  filename: string;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  focus_x: number;
  focus_y: number;
}

interface PreviewData {
  blueprint: BlueprintItem[];
  bg_color: number[];
}

// --- ИНТЕРАКТИВНЫЙ ФРЕЙМ (Скраббер) ---
function ScrubbableFrame({ item, offsets, setOffsets }: { item: BlueprintItem, offsets: any, setOffsets: any }) {
  const { language } = useAppContext();
  const dragHint = language === 'ru' ? 'Двигать' : language === 'fr' ? 'Glisser' : 'Drag';

  // Текущая позиция: кастомная или дефолтная от ИИ
  const currentX = offsets[item.filename]?.x ?? item.focus_x;
  const currentY = offsets[item.filename]?.y ?? item.focus_y;
  
  const handlePan = (e: any, info: any) => {
    // Вычисляем смещение. Делитель 150 определяет мягкость свайпа (чуть-чуть сдвинул палец = сдвинулось фото)
    const deltaX = -info.delta.x / 150; 
    const deltaY = -info.delta.y / 150;
    setOffsets((prev: any) => ({
      ...prev,
      [item.filename]: {
        x: Math.max(0, Math.min(1, currentX + deltaX)),
        y: Math.max(0, Math.min(1, currentY + deltaY))
      }
    }));
  };

  return (
    <motion.div 
      style={{
        position: 'absolute',
        left: `${item.x * 100}%`, top: `${item.y * 100}%`,
        width: `${item.w * 100}%`, height: `${item.h * 100}%`,
        overflow: 'hidden',
        backgroundColor: '#111'
      }}
      className="border-2 border-transparent hover:border-lux-gold/50 transition-colors cursor-grab active:cursor-grabbing group shadow-[0_0_15px_rgba(0,0,0,0.5)]"
    >
      <motion.img 
        src={item.url}
        className="w-full h-full object-cover pointer-events-auto"
        draggable={false}
        style={{ objectPosition: `${currentX * 100}% ${currentY * 100}%` }}
        onPan={handlePan}
      />
      {/* Стеклянный индикатор-подсказка для гостя */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
         <div className="bg-black/60 text-lux-gold text-[9px] px-3 py-1.5 rounded-full backdrop-blur-md uppercase tracking-widest border border-lux-gold/30">
           {dragHint}
         </div>
      </div>
    </motion.div>
  );
}

interface CollageCreatorProps {
  slug: string;
  selectedPhotos: string[];
  onClose: () => void;
  onSuccess: (url: string) => void;
}

const STYLES = [
  { id: 1, name: "Noire" },
  { id: 2, name: "Fine Art" },
  { id: 3, name: "Cinematic" }
];

export default function CollageCreator({ slug, selectedPhotos, onClose, onSuccess }: CollageCreatorProps) {
  const dragControls = useDragControls(); // <-- Контроллер для изолированной зоны свайпа
  const [isClosing, setIsClosing] = useState(false); // <-- Защита от двойных кликов

  const [selectedStyle, setSelectedStyle] = useState<number>(1);
  const [previews, setPreviews] = useState<Record<number, PreviewData>>({});
  const [offsets, setOffsets] = useState<Record<string, {x: number, y: number}>>({}); // <-- Храним кастомный кроп
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(true);
  const [isGeneratingFinal, setIsGeneratingFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { language } = useAppContext();

  // Железобетонная защита от двойного срабатывания History API
  const handleSafeClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    onClose();
  };

  // Умный ключ зависимостей для защиты от бесконечного рендера (React Infinite Loop Fix)
  const photosKey = selectedPhotos.join(',');

  // 1. Мгновенная генерация 3-х вариантов превью при открытии
  useEffect(() => {
    // Защита от 400 Bad Request во время анимации закрытия (когда массив уже пуст)
    if (selectedPhotos.length < 2) return;

    const fetchPreviews = async () => {
      setIsLoadingPreviews(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        
        // Отправляем 3 параллельных запроса на быстрые WebP-макеты
        const promises = STYLES.map(async (style) => {
          const response = await fetch(`${apiUrl}/api/weddings/${slug}/collages/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames: selectedPhotos, style_id: style.id, is_preview: true }),
          });
          if (response.ok) {
            const data = await response.json();
            return { id: style.id, data: data }; // Сохраняем математический Blueprint
          }
          return { id: style.id, data: null };
        });

        const results = await Promise.all(promises);
        const newPreviews: Record<number, PreviewData> = {};
        results.forEach(r => { if (r.data?.blueprint) newPreviews[r.id] = r.data; });
        
        setPreviews(newPreviews);
        
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(15); // Мягкий тактильный отклик о загрузке
        }
      } catch (err) {
        console.error(err);
        setError(language === 'ru' ? 'Ошибка загрузки превью' : language === 'fr' ? 'Erreur de chargement' : 'Preview error');
      } finally {
        setIsLoadingPreviews(false);
      }
    };

    fetchPreviews();
  }, [slug, photosKey, language]); // <-- Зависим строго от текстового ключа, а не от ссылки на массив!

  // 2. Генерация финального HD-шедевра
  const handleGenerateFinal = async () => {
    setIsGeneratingFinal(true);
    setError(null);
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]); // Эмуляция тяжелого процесса
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/collages/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Отправляем кастомные смещения на сервер для идеального HD рендера!
        body: JSON.stringify({ filenames: selectedPhotos, style_id: selectedStyle, is_preview: false, offsets }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate final HD collage');
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.url) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([50, 100, 50]); // Успех
        }
        onSuccess(data.url);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error(err);
      setError(language === 'ru' ? 'Ошибка сборки HD' : language === 'fr' ? 'Erreur de génération HD' : 'HD Generation error');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Ошибка
      }
    } finally {
      setIsGeneratingFinal(false);
    }
  };

  const texts = {
    ru: { title: "L'Édition", subtitle: "Журнальная стилизация", generate: "Создать HD шедевр", processing: "Рендеринг HD...", loading: "Генерация макетов...", noPreview: "Превью недоступно" },
    fr: { title: "L'Édition", subtitle: "Stylisation Magazine", generate: "Créer en HD", processing: "Rendu HD...", loading: "Génération des maquettes...", noPreview: "Aperçu indisponible" },
    en: { title: "L'Édition", subtitle: "Editorial Stylization", generate: "Create HD Masterpiece", processing: "HD Rendering...", loading: "Generating mockups...", noPreview: "Preview not available" }
  };
  const t = texts[language as keyof typeof texts] || texts.en;

  const isBusy = isGeneratingFinal || isLoadingPreviews;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      drag={!isBusy ? "y" : false}
      dragControls={dragControls}
      dragListener={false} // <-- ОТКЛЮЧАЕМ глобальный свайп. Теперь шторка стоит намертво!
      dragConstraints={{ top: 0, bottom: 300 }}
      dragElastic={0.2}
      onDragEnd={(e, info) => {
        if (info.offset.y > 100 && !isBusy) {
          handleSafeClose();
        }
      }}
      className="fixed bottom-12 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-[400px] z-[120] bg-[#0a0a0a]/95 backdrop-blur-xl border border-lux-gold/40 rounded-3xl p-6 pt-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden touch-none"
    >
      {/* --- НОВАЯ ЗОНА СВАЙПА (DRAG HANDLE) --- */}
      <div 
        className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing mb-2 touch-none"
        onPointerDown={(e) => {
          if (!isBusy) dragControls.start(e);
        }}
      >
        {!isBusy && <div className="w-14 h-1.5 bg-white/20 hover:bg-white/40 transition-colors rounded-full pointer-events-none" />}
      </div>

      <div className="absolute -top-20 -right-20 w-40 h-40 bg-lux-gold/10 rounded-full blur-3xl pointer-events-none" />

      {!isBusy && (
        <button 
          onClick={(e) => { e.stopPropagation(); handleSafeClose(); }}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 z-20"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex flex-col items-center text-center relative z-10 w-full">
        
        <h3 className="font-cinzel text-2xl text-lux-gold uppercase tracking-widest leading-none mb-1">
          {t.title}
        </h3>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-5">
          {t.subtitle} • {selectedPhotos.length} {language === 'ru' ? 'фото' : 'photos'}
        </p>

        {/* ПРЕВЬЮ ЗОНА (Интерактивный Blueprint Canvas 4:5) */}
        <div 
          className="relative w-full max-w-[240px] aspect-[4/5] mb-5 rounded-xl overflow-hidden border border-lux-gold/30 shadow-[0_0_40px_rgba(212,175,55,0.15)] touch-none"
          style={{ 
            backgroundColor: previews[selectedStyle]?.bg_color 
              ? `rgba(${previews[selectedStyle].bg_color[0]}, ${previews[selectedStyle].bg_color[1]}, ${previews[selectedStyle].bg_color[2]}, ${previews[selectedStyle].bg_color[3] / 255})` 
              : '#111' 
          }}
        >
          <AnimatePresence mode="wait">
            {isLoadingPreviews ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]"
              >
                <div className="w-6 h-6 border-2 border-lux-gold/20 border-t-lux-gold rounded-full animate-spin mb-3" />
                <span className="text-[9px] uppercase tracking-widest text-lux-gold/70 animate-pulse">{t.loading}</span>
              </motion.div>
            ) : (
              <motion.div
                key={selectedStyle}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                {previews[selectedStyle]?.blueprint ? (
                  previews[selectedStyle].blueprint.map((item) => (
                    <ScrubbableFrame 
                      key={item.filename} 
                      item={item} 
                      offsets={offsets} 
                      setOffsets={setOffsets} 
                    />
                  ))
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-red-400 text-xs text-center p-4">
                    {error || t.noPreview}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ПЕРЕКЛЮЧАТЕЛИ СТИЛЕЙ (Apple Segmented Style) */}
        <div className="flex gap-2 w-full overflow-x-auto no-scrollbar justify-center mb-6 px-1">
          {STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                setSelectedStyle(s.id);
              }}
              disabled={isLoadingPreviews || isGeneratingFinal}
              className={`flex-1 px-2 py-2.5 rounded-xl border text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap disabled:opacity-50 active:scale-95 ${
                selectedStyle === s.id
                  ? 'bg-lux-gold text-black border-lux-gold shadow-gold-glow'
                  : 'bg-[#111] text-gray-400 border-white/10 hover:text-white hover:border-white/30'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {error && !isLoadingPreviews && (
          <p className="text-red-400 text-xs mb-4">{error}</p>
        )}

        {/* ГЛАВНАЯ КНОПКА */}
        {isGeneratingFinal ? (
          <div className="w-full flex flex-col items-center">
            <div className="relative w-full h-2 bg-[#111] rounded-full overflow-hidden mb-4 border border-white/5">
              <motion.div 
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-lux-gold to-transparent"
              />
            </div>
            <p className="text-lux-gold text-xs uppercase tracking-widest animate-pulse font-bold">
              {t.processing}
            </p>
          </div>
        ) : (
          <button
            onClick={handleGenerateFinal}
            disabled={isLoadingPreviews}
            className="w-full py-4 bg-lux-gold text-black font-bold uppercase tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-[0.98] shadow-gold-glow flex items-center justify-center gap-2"
          >
            {t.generate}
          </button>
        )}
      </div>
    </motion.div>
  );
}