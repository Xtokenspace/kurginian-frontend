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
  canvas_aspect?: "portrait" | "landscape"; // <-- Ловим форму холста
}

// --- ИНТЕРАКТИВНЫЙ ФРЕЙМ (Скраббер) ---
function ScrubbableFrame({ item, styleOffsets, setStyleOffsets, styleId, isLast }: { item: BlueprintItem, styleOffsets: Record<number, Record<string, {x: number, y: number}>>, setStyleOffsets: any, styleId: number, isLast: boolean }) {
  const { language } = useAppContext();
  const dragHint = language === 'ru' ? 'Двигать' : language === 'fr' ? 'Glisser' : 'Drag';

  // Текущая позиция: изолированная кастомная для текущего стиля или дефолтная от ИИ
  const currentOffsets = styleOffsets[styleId] || {};
  const currentX = currentOffsets[item.filename]?.x ?? item.focus_x;
  const currentY = currentOffsets[item.filename]?.y ?? item.focus_y;
  
  // ПРЕМИУМ-ОПТИМИЗАЦИЯ: Локальный стейт для 60FPS без рендера всего модального окна
  const [localPos, setLocalPos] = useState({ x: currentX, y: currentY });
  
  const startX = useRef(currentX);
  const startY = useRef(currentY);

  // Синхронизируем локальный стейт, если ИИ-фокус изменился извне
  useEffect(() => {
    setLocalPos({ x: currentX, y: currentY });
  }, [currentX, currentY]);

  const handlePanStart = () => {
    startX.current = localPos.x;
    startY.current = localPos.y;
  };

  const handlePan = (e: any, info: any) => {
    const deltaX = -info.offset.x / 150; 
    const deltaY = -info.offset.y / 150;
    setLocalPos({
      x: Math.max(0, Math.min(1, startX.current + deltaX)),
      y: Math.max(0, Math.min(1, startY.current + deltaY))
    });
  };

  const handlePanEnd = () => {
    // Изолируем сохранение координат строго в рамках текущего styleId
    setStyleOffsets((prev: any) => ({
      ...prev,
      [styleId]: {
        ...(prev[styleId] || {}),
        [item.filename]: localPos
      }
    }));
  };

  // === CSS МАГИЯ: Эмуляция Python-логики бэкенда ===
  const isGrayscale = styleId === 1 && isLast; // Эффект Vogue (последнее фото ЧБ)
  const borderColor = styleId === 2 ? 'rgba(40,40,40,1)' : 'rgba(212,175,55,1)';
  const borderWidth = styleId === 2 ? '1px' : '2px';

  return (
    <motion.div 
      style={{
        position: 'absolute',
        left: `${item.x * 100}%`, top: `${item.y * 100}%`,
        width: `${item.w * 100}%`, height: `${item.h * 100}%`,
        overflow: 'hidden',
        backgroundColor: '#111',
        border: `${borderWidth} solid ${borderColor}`,
      }}
      className="hover:border-white transition-colors cursor-grab active:cursor-grabbing group shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
    >
      <motion.img 
        src={item.url}
        className="w-full h-full object-cover pointer-events-auto select-none"
        draggable={false}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        style={{ 
          objectPosition: `${localPos.x * 100}% ${localPos.y * 100}%`,
          filter: isGrayscale ? 'grayscale(100%)' : 'none',
          transition: 'filter 0.3s ease',
          WebkitTouchCallout: 'none'
        }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
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
  trueAspectRatios?: Record<string, number>; // <-- 💎 ЗАЩИТА АРХИТЕКТУРЫ
  onClose: () => void;
  onSuccess: (url: string, aspect?: "portrait" | "landscape") => void;
}

const STYLES = [
  { id: 1, name: "Noire" },
  { id: 2, name: "Fine Art" },
  { id: 3, name: "Cinematic" }
];

export default function CollageCreator({ slug, selectedPhotos, trueAspectRatios, onClose, onSuccess }: CollageCreatorProps) {
  const dragControls = useDragControls(); // <-- Контроллер для изолированной зоны свайпа
  const [isClosing, setIsClosing] = useState(false); // <-- Защита от двойных кликов
  const abortRef = useRef(false); // <-- Защита от всплывающего превью, если гость отменил генерацию

  const [selectedStyle, setSelectedStyle] = useState<number>(1);
  const [previews, setPreviews] = useState<Record<number, PreviewData>>({});
  // 💎 ПРЕМИУМ-ИЗОЛЯЦИЯ: Храним кроп отдельно для каждой сетки стиля (id),
  // чтобы свайп в Noire не сломал пропорции в Fine Art.
  const [styleOffsets, setStyleOffsets] = useState<Record<number, Record<string, {x: number, y: number}>>>({});
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(true);
  const [isGeneratingFinal, setIsGeneratingFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { language } = useAppContext();

  // --- HAPTIC HEARTBEAT (Эмоциональная инженерия) ---
  // Пока сервер собирает HD-коллаж, телефон гостя пульсирует как бьющееся сердце
  useEffect(() => {
    let heartbeat: NodeJS.Timeout;
    if (isGeneratingFinal && typeof navigator !== 'undefined' && navigator.vibrate) {
      heartbeat = setInterval(() => {
        navigator.vibrate([20, 150, 30]); // Ритм: "Тук-тук..."
      }, 1200);
    }
    return () => clearInterval(heartbeat);
  }, [isGeneratingFinal]);

  // Железобетонная защита от двойного срабатывания History API
  const handleSafeClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    abortRef.current = true;
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    onClose();
  };

  // Умный ключ зависимостей для защиты от бесконечного рендера (React Infinite Loop Fix)
  const photosKey = selectedPhotos.join(',');

  // 1. Мгновенная генерация 3-х вариантов превью при открытии
  useEffect(() => {
    // Защита от 400 Bad Request во время анимации закрытия (когда массив уже пуст)
    if (selectedPhotos.length < 2) return;

    let isMounted = true; // ПРЕМИУМ-ЗАЩИТА: Предотвращение Memory Leak

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
            body: JSON.stringify({ filenames: selectedPhotos, style_id: style.id, is_preview: true, aspect_ratios: trueAspectRatios }),
          });
          if (response.ok) {
            const data = await response.json();
            return { id: style.id, data: data }; // Сохраняем математический Blueprint
          }
          return { id: style.id, data: null };
        });

        const results = await Promise.all(promises);
        if (!isMounted) return; // Прерываем стейт-апдейты, если компонент уже закрыт

        const newPreviews: Record<number, PreviewData> = {};
        results.forEach(r => { if (r.data?.blueprint) newPreviews[r.id] = r.data; });
        
        setPreviews(newPreviews);
        
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(15); // Мягкий тактильный отклик о загрузке
        }
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError(language === 'ru' ? 'Ошибка загрузки превью' : language === 'fr' ? 'Erreur de chargement' : 'Preview error');
      } finally {
        if (isMounted) setIsLoadingPreviews(false);
      }
    };

    fetchPreviews();

    return () => {
      isMounted = false; // Очистка при размонтировании
    };
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
        // Отправляем кастомные смещения строго для выбранного стиля и ИСТИННЫЕ пропорции!
        body: JSON.stringify({ filenames: selectedPhotos, style_id: selectedStyle, is_preview: false, offsets: styleOffsets[selectedStyle] || {}, aspect_ratios: trueAspectRatios }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate final HD collage');
      }

      const data = await response.json();
      
      if (abortRef.current) return; // <-- Тихий выход, если гость уже закрыл окно свайпом
      
      if (data.status === 'success' && data.url) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([50, 100, 50]); // Успех
        }
        // Передаем ориентацию текущего стиля наверх для красивой отрисовки
        const currentAspect = previews[selectedStyle]?.canvas_aspect || "portrait";
        onSuccess(data.url, currentAspect);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      if (abortRef.current) return; // <-- Защита от вывода ошибок отмененного запроса
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
    <>
      {/* --- КИНЕМАТОГРАФИЧНЫЙ ФОН (Затемнение галереи) --- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleSafeClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[115] touch-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 300 }}
      dragElastic={0.2}
      onDragEnd={(e, info) => {
        if (info.offset.y > 100) {
          handleSafeClose();
        }
      }}
      // 💎 МАГИЯ: Адаптивное центрирование для ПК (Pro Studio Layout) без конфликтов с Framer Motion
      className="fixed bottom-12 left-4 right-4 md:inset-0 md:m-auto md:w-full md:max-w-[760px] md:h-fit z-[120] bg-[#0a0a0a]/95 backdrop-blur-xl border border-lux-gold/40 rounded-3xl p-6 pt-2 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] md:shadow-[0_0_80px_rgba(0,0,0,0.9)] touch-none"
    >
      {/* --- ЗОНА СВАЙПА (DRAG HANDLE) --- */}
      <div 
        className="w-full flex justify-center py-5 -mt-2 md:py-0 md:-mt-0 md:mb-0 cursor-grab active:cursor-grabbing md:cursor-default touch-none relative z-20"
        onPointerDown={(e) => dragControls.start(e)}
      >
        {/* Скрываем ползунок-подсказку на десктопе (так как там окно по центру) */}
        <div className="w-14 h-1.5 bg-white/20 hover:bg-white/40 transition-colors rounded-full pointer-events-none md:hidden" />
      </div>

      <div className="absolute -top-20 -right-20 w-40 h-40 bg-lux-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* КРЕСТИК ТЕПЕРЬ ДОСТУПЕН ВСЕГДА */}
      <button 
        onClick={(e) => { e.stopPropagation(); handleSafeClose(); }}
        className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-500 hover:text-white transition-colors p-2 z-30"
      >
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* === ДВОЙНОЙ ИНТЕРФЕЙС (Mobile Flex / Desktop Grid) === */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-12 relative z-10 w-full items-center">
        
        {/* Мобильная шапка (Скрывается на ПК) */}
        <div className="md:hidden flex flex-col items-center text-center w-full mb-1">
          <h3 className="font-cinzel text-2xl text-lux-gold uppercase tracking-widest leading-none mb-1">
            {t.title}
          </h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-2">
            {t.subtitle} • {selectedPhotos.length} {language === 'ru' ? 'фото' : 'photos'}
          </p>
        </div>

        {/* Левая колонка: ПРЕВЬЮ ЗОНА (Холст) */}
        {/* Обертка с min-h защищает верстку от схлопывания во время анимации */}
        <div className="flex justify-center items-center w-full min-h-[350px] md:min-h-[450px] shrink-0 px-2 md:px-0">
          <div 
            className="relative shrink-0 rounded-xl overflow-hidden border border-lux-gold/30 shadow-[0_0_40px_rgba(212,175,55,0.15)] touch-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ 
              backgroundColor: previews[selectedStyle]?.bg_color 
                ? `rgba(${previews[selectedStyle].bg_color[0]}, ${previews[selectedStyle].bg_color[1]}, ${previews[selectedStyle].bg_color[2]}, ${previews[selectedStyle].bg_color[3] / 255})` 
                : '#111',
              // 💎 ЖЕЛЕЗОБЕТОННАЯ МАТЕМАТИКА CSS (Обход багов Tailwind JIT):
              width: '100%',
              maxWidth: previews[selectedStyle]?.canvas_aspect === 'landscape' ? '480px' : '340px',
              aspectRatio: previews[selectedStyle]?.canvas_aspect === 'landscape' ? '5 / 4' : '4 / 5',
              // Гарантийная защита от схлопывания (Fallback Height):
              minHeight: previews[selectedStyle]?.canvas_aspect === 'landscape' ? '280px' : '380px'
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
                  <>
                    {previews[selectedStyle].blueprint.map((item, idx) => (
                      <ScrubbableFrame 
                        key={item.filename} 
                        item={item} 
                        styleOffsets={styleOffsets} 
                        setStyleOffsets={setStyleOffsets}
                        styleId={selectedStyle}
                        isLast={idx === previews[selectedStyle].blueprint!.length - 1}
                      />
                    ))}
                    
                    {/* === ЭМУЛЯЦИЯ ФИНАЛЬНОГО РЕНДЕРА (Cinematic Scrim & Typography) === */}
                    <div 
                      className={`absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t ${
                        selectedStyle === 2 ? 'from-[#FAFAFA] via-[#FAFAFA]/70' : 'from-[#0C0C0C] via-[#0C0C0C]/70'
                      } to-transparent pointer-events-none z-10`} 
                    />
                    
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end items-center pb-5 z-20">
                      <h4 className={`font-cinzel text-xl tracking-widest leading-none ${selectedStyle === 2 ? 'text-[#141414]' : 'text-[#FAFAFA]'}`}>
                        KURGINIAN
                      </h4>
                      <p className={`text-[7px] uppercase tracking-[0.2em] mt-1 ${selectedStyle === 2 ? 'text-gray-500' : 'text-lux-gold'}`}>
                        Édition Limitée
                      </p>
                    </div>

                    {/* Индикатор "Макета" для гостя */}
                    <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none z-20">
                      <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="text-[7px] text-white/70 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-lux-gold rounded-full animate-pulse" />
                          {language === 'ru' ? 'ИНТЕРАКТИВНЫЙ МАКЕТ' : language === 'fr' ? 'MAQUETTE INTERACTIVE' : 'INTERACTIVE BLUEPRINT'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-red-400 text-xs text-center p-4">
                    {error || t.noPreview}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>

        {/* Правая колонка: Управление (Стили + Кнопка) */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left w-full mt-4 md:mt-0 min-w-0">
          
          {/* Десктопная шапка (Проявляется только на ПК) */}
          <div className="hidden md:flex flex-col mb-8">
            <h3 className="font-cinzel text-4xl text-lux-gold uppercase tracking-widest leading-none mb-3">
              {t.title}
            </h3>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">
              {t.subtitle} • {selectedPhotos.length} {language === 'ru' ? 'фото' : 'photos'}
            </p>
          </div>

          {/* ПЕРЕКЛЮЧАТЕЛИ СТИЛЕЙ */}
          <div className="flex w-full max-w-sm gap-2 mb-6">
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  setSelectedStyle(s.id);
                }}
                disabled={isLoadingPreviews || isGeneratingFinal}
                className={`flex-1 px-1 py-3 rounded-xl border text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all truncate disabled:opacity-50 active:scale-95 ${
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
            <p className="text-red-400 text-xs mb-4 md:mb-6">{error}</p>
          )}

          {/* ГЛАВНАЯ КНОПКА */}
          <div className="w-full max-w-sm">
            {isGeneratingFinal ? (
              <div className="w-full flex flex-col items-center md:items-start">
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
                className="w-full py-4 md:py-5 bg-lux-gold text-black font-bold uppercase tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-[0.98] shadow-gold-glow flex items-center justify-center gap-2 md:text-sm"
              >
                {t.generate}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}