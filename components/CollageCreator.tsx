'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';

interface CollageCreatorProps {
  slug: string;
  selectedPhotos: string[];
  onClose: () => void;
  onSuccess: (url: string) => void;
}

export default function CollageCreator({ slug, selectedPhotos, onClose, onSuccess }: CollageCreatorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useAppContext();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    // Включаем вибрацию (эмуляция начала сложного процесса)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/collages/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: selectedPhotos }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate collage');
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
      setError(language === 'ru' ? 'Ошибка генерации коллажа' : language === 'fr' ? 'Erreur de génération du collage' : 'Collage generation error');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Ошибка
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const texts = {
    ru: { title: "L'Édition", subtitle: "Персональная обложка", generate: "Создать шедевр", processing: "Верстка коллажа..." },
    fr: { title: "L'Édition", subtitle: "Couverture personnelle", generate: "Créer un chef-d'œuvre", processing: "Mise en page..." },
    en: { title: "L'Édition", subtitle: "Personal Cover", generate: "Create Masterpiece", processing: "Layout processing..." }
  };
  const t = texts[language as keyof typeof texts] || texts.en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      className="fixed bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-[400px] z-[120] bg-[#0a0a0a]/95 backdrop-blur-xl border border-lux-gold/40 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      {/* Декоративный Ambient-фон */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-lux-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* Кнопка закрытия (Крестик) */}
      {!isGenerating && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex flex-col items-center text-center relative z-10">
        
        {/* Премиальная иконка */}
        <div className="w-12 h-12 rounded-full bg-lux-gold/10 border border-lux-gold/30 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>

        <h3 className="font-cinzel text-2xl text-lux-gold uppercase tracking-widest leading-none mb-1">
          {t.title}
        </h3>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-6">
          {t.subtitle} • {selectedPhotos.length} {language === 'ru' ? 'фото' : 'photos'}
        </p>

        {error && (
          <p className="text-red-400 text-xs mb-4">{error}</p>
        )}

        {isGenerating ? (
          <div className="w-full flex flex-col items-center">
            {/* Анимация сканирования в стиле Face ID (Golden Sweep) */}
            <div className="relative w-full h-2 bg-[#111] rounded-full overflow-hidden mb-4">
              <motion.div 
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-lux-gold to-transparent"
              />
            </div>
            <p className="text-lux-gold text-xs uppercase tracking-widest animate-pulse">
              {t.processing}
            </p>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            className="w-full py-4 bg-lux-gold text-black font-bold uppercase tracking-widest rounded-xl hover:bg-white transition-all active:scale-[0.98] shadow-gold-glow flex items-center justify-center gap-2"
          >
            {t.generate}
          </button>
        )}
      </div>
    </motion.div>
  );
}