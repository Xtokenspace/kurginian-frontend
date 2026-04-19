// === ФАЙЛ: app\weddings\\[slug]\\photo\\[filename]/page.tsx ===

'use client';

import { use, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAppContext, PrintSize, PRINT_PRICES } from '@/context/AppContext';
import CollageCreator from '@/components/CollageCreator';

const translations = {
  fr: {
    title: "Souvenir",
    download: "Télécharger",
    share: "Partager",
    backToGallery: "Retour",
    findAllMyPhotos: "Trouver toutes mes photos",
    searchAgain: "Nouvelle recherche",
    instagram: "Instagram",
    discover: "Site Web",
    thanks: "Merci d'utiliser KURGINIAN Premium Gallery",
    toast: "Lien copié",
    shareText: "Regardez cette magnifique photo ✨",
    copyPrompt: "Copiez ce lien :",
    confirmReset: "Sûr ? (Appuyez à nouveau)",
    selected: "sélectionné(s)",
    cancel: "Annuler",
    orderPrints: "Commander tirages",
    createCollage: "L'Édition"
  },
  en: {
    title: "Memory",
    download: "Download",
    share: "Share",
    backToGallery: "Back",
    findAllMyPhotos: "Find all my photos",
    searchAgain: "New search",
    instagram: "Instagram",
    discover: "Website",
    thanks: "Thank you for using KURGINIAN Premium Gallery",
    toast: "Link copied",
    shareText: "Take a look at this wonderful photo ✨",
    copyPrompt: "Copy this link:",
    confirmReset: "Are you sure? (Tap again)",
    selected: "selected",
    cancel: "Cancel",
    orderPrints: "Order prints",
    createCollage: "L'Édition"
  },
  ru: {
    title: "Воспоминание",
    download: "Скачать",
    share: "Поделиться",
    backToGallery: "Назад",
    findAllMyPhotos: "Найти все мои фото",
    searchAgain: "Новый поиск",
    instagram: "Instagram",
    discover: "Сайт",
    thanks: "Спасибо, что воспользовались KURGINIAN Premium Gallery",
    toast: "Ссылка скопирована",
    shareText: "Взгляните на эту замечательную фотографию ✨",
    copyPrompt: "Скопируйте ссылку:",
    confirmReset: "Уверены? (Нажмите еще раз)",
    selected: "выбрано",
    cancel: "Отмена",
    orderPrints: "Заказать печать",
    createCollage: "L'Édition"
  }
} as const;

export default function SinglePhotoPage({ params }: { params: Promise<{ slug: string; filename: string }> }) {
  const resolvedParams = use(params);
  const { slug, filename: urlFilename } = resolvedParams;
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. ЛОГИКА ПОДБОРКИ (Если в URL передано несколько файлов ?p=...)
  const pParam = searchParams.get('p');
  const sharedFiles = pParam ? pParam.split(',') : [urlFilename];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // 2. СОСТОЯНИЯ ВЫБОРА И КОРЗИНЫ (Синхронизация с Gallery.tsx)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showCollageCreator, setShowCollageCreator] = useState(false);
  const [generatedCollageUrl, setGeneratedCollageUrl] = useState<string | null>(null);
  
  const { language, setLanguage, refreshSessions, clearCart, isMounted, addToCart, getCartForSlug } = useAppContext();
  const cart = getCartForSlug(slug);
  const t = translations[language];

  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  };

  const togglePhotoSelection = (filename: string) => {
    triggerVibration(10);
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(filename)) newSelection.delete(filename);
    else newSelection.add(filename);
    setSelectedPhotos(newSelection);
    if (newSelection.size === 0) setIsSelectionMode(false);
  };

  const handleLongPress = () => {
    if (isSelectionMode) return;
    triggerVibration([15, 30]);
    setIsSelectionMode(true);
    togglePhotoSelection(sharedFiles[currentIndex]);
  };

  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    triggerVibration(50);
    const currentFile = sharedFiles[currentIndex];
    const photoUrl = `https://cdn.kurginian.pro/${slug}/web/${currentFile}`;
    try {
      const response = await fetch(`${photoUrl}?download=${Date.now()}`, { mode: 'cors', cache: 'no-cache' });
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = currentFile;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) { console.error(err); }
    finally { setIsDownloading(false); }
  };

  const handleShare = async () => {
    triggerVibration(50);
    const currentFile = sharedFiles[currentIndex];
    const shareLink = `${window.location.origin}/weddings/${slug}/photo/${currentFile}?mode=share`;
    if (navigator.share) {
      try { await navigator.share({ title: 'KURGINIAN Premium', text: t.shareText, url: shareLink }); return; }
      catch (err) { if ((err as Error).name !== 'AbortError') console.error(err); return; }
    }
    try { await navigator.clipboard.writeText(shareLink); setShowToast(true); setTimeout(() => setShowToast(false), 2800); }
    catch { prompt(t.copyPrompt, shareLink); }
  };

  if (!isMounted) return <main className="min-h-[100dvh] bg-lux-bg" />;

  return (
    <main className="min-h-[100dvh] bg-lux-bg text-lux-text font-montserrat p-6 flex flex-col items-center relative pb-32 overflow-x-hidden">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="fixed top-6 left-6 right-6 z-50 flex justify-between items-start pointer-events-none">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto">
          <button
            onClick={() => router.push(`/weddings/${slug}`)}
            className="flex items-center gap-2 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl px-5 py-2.5 text-sm font-medium shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all text-gray-300 group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden md:inline uppercase tracking-widest">{t.backToGallery}</span>
          </button>
        </motion.div>

        <div className="pointer-events-auto relative">
          <button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-1.5 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 hover:border-lux-gold/50 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg hover:bg-lux-gold hover:text-black transition-all text-gray-400">
            <span className="uppercase tracking-widest">{language}</span>
            <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </button>
          <AnimatePresence>
            {showLangMenu && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-9 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl flex flex-col min-w-[70px] z-[60]">
                {(['fr', 'en', 'ru'] as const).map((lang) => (
                  <button key={lang} onClick={() => { setLanguage(lang); setShowLangMenu(false); }} className={`px-3 py-2 text-center text-[10px] tracking-widest uppercase rounded-xl transition-all ${language === lang ? 'bg-lux-gold text-black font-bold' : 'text-gray-400 hover:bg-white/10'}`}>
                    {lang}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full max-w-4xl pt-24 md:pt-20">
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-cinzel text-lg md:text-2xl text-lux-gold mb-6 text-center tracking-widest uppercase">
          {t.title} {sharedFiles.length > 1 && `• ${currentIndex + 1} / ${sharedFiles.length}`}
        </motion.h2>

        {/* АДАПТИВНАЯ РАМКА (Adaptive Canvas) */}
        <div className="relative w-full flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={() => { pressTimer.current = setTimeout(handleLongPress, 400); }}
            onTouchEnd={() => { if (pressTimer.current) clearTimeout(pressTimer.current); }}
            onMouseDown={() => { pressTimer.current = setTimeout(handleLongPress, 400); }}
            onMouseUp={() => { if (pressTimer.current) clearTimeout(pressTimer.current); }}
            className={`border border-lux-gold/30 rounded-sm overflow-hidden shadow-2xl relative max-w-full bg-[#070707] transition-all duration-500 ease-in-out ${
              isSelectionMode && selectedPhotos.has(sharedFiles[currentIndex]) ? 'ring-4 ring-lux-gold scale-[0.98]' : ''
            }`}
            style={{ height: 'auto', maxHeight: '70dvh', aspectRatio: 'auto' }}
          >
            <Image
              src={`https://cdn.kurginian.pro/${slug}/web/${sharedFiles[currentIndex]}`}
              alt="Shared Memory"
              width={1200}
              height={1600}
              className={`w-auto h-auto max-w-full max-h-[70dvh] object-contain transition-opacity duration-1000 select-none pointer-events-none ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setIsImageLoaded(true)}
              priority
              unoptimized
            />
            
            {/* ГАЛОЧКА ВЫБОРА */}
            <AnimatePresence>
              {isSelectionMode && selectedPhotos.has(sharedFiles[currentIndex]) && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-4 right-4 bg-lux-gold rounded-full p-1 shadow-lg">
                   <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                   </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ОСНОВНОЙ ACTION BAR (Если не в режиме выбора) */}
        {!isSelectionMode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full mt-6 flex gap-3">
            <button onClick={handleDownload} disabled={isDownloading} className="flex-[3] flex items-center justify-center gap-3 bg-lux-gold text-black px-6 py-4 rounded-sm font-bold shadow-gold-glow active:scale-[0.98] transition-all">
              {isDownloading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              <span className="uppercase tracking-widest text-xs">{isDownloading ? '...' : t.download}</span>
            </button>
            <button onClick={handleShare} className="flex-[2] flex items-center justify-center gap-3 bg-[#111] border border-lux-gold/30 text-lux-gold px-4 py-4 rounded-sm active:scale-[0.98] transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="font-bold uppercase tracking-widest text-xs">{t.share}</span>
            </button>
          </motion.div>
        )}

        {/* КНОПКА МОСТ: НАЙТИ ВСЕ СВОИ ФОТО (Золотая конверсия) */}
        {!isSelectionMode && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            onClick={() => router.push(`/weddings/${slug}?autoScan=true`)}
            className="w-full mt-4 py-4 bg-lux-gold/10 border border-lux-gold/30 text-lux-gold rounded-sm uppercase tracking-[0.2em] text-[10px] font-bold flex items-center justify-center gap-3 hover:bg-lux-gold hover:text-black transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            {t.findAllMyPhotos}
          </motion.button>
        )}

        {/* ФУТЕР */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-12 text-center space-y-6">
          <div className="flex justify-center gap-6">
             <button onClick={() => window.open("https://instagram.com/hdart26", "_blank")} className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-lux-gold transition-colors">{t.instagram}</button>
             <button onClick={() => window.open("https://kurginian.pro", "_blank")} className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-lux-gold transition-colors">{t.discover}</button>
          </div>
          <p className="text-[9px] text-gray-700 uppercase tracking-widest">{t.thanks}</p>
        </motion.div>
      </div>

      {/* ПЛАВАЮЩАЯ ПАНЕЛЬ МУЛЬТИВЫБОРА (iOS Style) */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-[600px] z-[110] bg-[#111]/95 backdrop-blur-xl border border-lux-gold/30 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">{selectedPhotos.size} {t.selected}</span>
              <button onClick={() => { setIsSelectionMode(false); setSelectedPhotos(new Set()); }} className="text-lux-gold text-[10px] uppercase tracking-widest text-left">{t.cancel}</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { 
                const items = Array.from(selectedPhotos).map(f => ({ id: `${f}_10x15`, filename: f, thumb_url: `https://cdn.kurginian.pro/${slug}/thumb/${f}`, size: '10x15' as PrintSize, quantity: 1, price: PRINT_PRICES['10x15'] }));
                addToCart(slug, items);
                router.push(`/weddings/${slug}?openCart=true`);
              }} className="bg-lux-gold text-black py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-gold-glow flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                {t.orderPrints}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МАГИЧЕСКАЯ ПАЛОЧКА (L'Édition) - Появляется ТОЛЬКО при выборе 2+ фото */}
      <AnimatePresence>
        {isSelectionMode && selectedPhotos.size >= 2 && selectedPhotos.size <= 4 && (
          <motion.button
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
            onClick={() => { triggerVibration(10); setShowCollageCreator(true); }}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[115] bg-[#0a0a0a]/90 backdrop-blur-xl border border-lux-gold/40 border-r-0 rounded-l-2xl p-3 flex flex-col items-center gap-3 shadow-2xl"
          >
            <svg className="w-6 h-6 text-lux-gold animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-[10px] text-lux-gold uppercase tracking-widest font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{t.createCollage}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* КОМПОНЕНТ ГЕНЕРАЦИИ КОЛЛАЖЕЙ */}
      <AnimatePresence>
        {showCollageCreator && (
          <CollageCreator 
            slug={slug} 
            selectedPhotos={Array.from(selectedPhotos)} 
            onClose={() => setShowCollageCreator(false)} 
            onSuccess={(url) => { setShowCollageCreator(false); setGeneratedCollageUrl(url); setIsSelectionMode(false); setSelectedPhotos(new Set()); }} 
          />
        )}
      </AnimatePresence>

      {/* ПРЕВЬЮ КОЛЛАЖА */}
      <AnimatePresence>
        {generatedCollageUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
             <button onClick={() => setGeneratedCollageUrl(null)} className="absolute top-6 right-6 text-white/50 hover:text-lux-gold"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
             <img src={generatedCollageUrl} className="max-w-full max-h-[70dvh] rounded-xl shadow-2xl mb-8 border border-lux-gold/20" alt="Result" />
             <button onClick={() => { const link = document.createElement('a'); link.href = generatedCollageUrl; link.download = `Edition_${Date.now()}.jpg`; link.click(); }} className="w-full max-w-[360px] py-4 bg-lux-gold text-black font-bold rounded-xl uppercase tracking-widest shadow-gold-glow">{t.download}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-lux-gold text-black px-6 py-3 rounded-sm font-bold shadow-gold-glow flex items-center gap-2 z-[200] text-xs uppercase tracking-wider">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            {t.toast}
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}