'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Gallery({ photos, slug }: { photos: any[]; slug: string }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const currentPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  // Клавиатура
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowRight') setSelectedIndex((prev) => (prev! + 1) % photos.length);
      if (e.key === 'ArrowLeft') setSelectedIndex((prev) => (prev! - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedIndex, photos.length]);

  const handleDownload = async (url: string, filename: string) => {
    try {
      const fetchUrl = `${url}?download=${Date.now()}`;
      const res = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' });
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert("Erreur lors du téléchargement.");
    }
  };

  const handleShare = async () => {
    if (!currentPhoto) return;
    const shareLink = `${window.location.origin}/weddings/${slug}/photo/${currentPhoto.filename}?mode=share`;

    try {
      await navigator.clipboard.writeText(shareLink);
      alert('✅ Lien copié dans le presse-papiers !');
    } catch {
      prompt('Copiez ce lien :', shareLink);
    }
  };

  const goToPrev = () => setSelectedIndex((prev) => (prev! - 1 + photos.length) % photos.length);
  const goToNext = () => setSelectedIndex((prev) => (prev! + 1) % photos.length);

  return (
    <>
      {/* Masonry Grid — премиум вид */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.filename}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="break-inside-avoid cursor-pointer overflow-hidden rounded-sm border border-transparent hover:border-lux-gold hover:shadow-gold-glow transition-all duration-500 active:scale-[0.98]"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={photo.urls.thumb}
              alt=""
              className="w-full object-cover"
              loading="lazy"
            />
          </motion.div>
        ))}
      </div>

      {/* PREMIUM LIGHTBOX */}
      <AnimatePresence>
        {currentPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={(e) => e.target === e.currentTarget && setSelectedIndex(null)}
          >
            <motion.img
              key={currentPhoto.filename}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.x < -80) goToNext();
                if (info.offset.x > 80) goToPrev();
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={currentPhoto.urls.web}
              alt="Full size"
              className="max-h-screen max-w-screen object-contain select-none"
            />

            {/* Верхняя панель */}
            <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 text-white z-10 bg-gradient-to-b from-black/70 to-transparent">
              <button
                onClick={() => setSelectedIndex(null)}
                className="text-4xl font-light leading-none hover:text-lux-gold transition-colors"
              >
                &times;
              </button>
              <div className="font-montserrat text-sm tracking-widest">
                {selectedIndex! + 1} / {photos.length}
              </div>
            </div>

            {/* Нижняя панель */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-3xl rounded-3xl px-3 py-2 flex items-center shadow-2xl z-10 border border-white/10">
              <button
                onClick={() => handleDownload(currentPhoto.urls.web, currentPhoto.filename)}
                className="flex items-center gap-3 px-8 py-4 text-white hover:text-lux-gold hover:bg-white/10 transition-all rounded-3xl text-base font-medium"
              >
                <span className="text-2xl">⬇️</span>
                <span>Télécharger</span>
              </button>

              <div className="w-px h-8 bg-white/20 mx-2"></div>

              <button
                onClick={handleShare}
                className="flex items-center gap-3 px-8 py-4 text-white hover:text-lux-gold hover:bg-white/10 transition-all rounded-3xl text-base font-medium"
              >
                <span className="text-2xl">↗️</span>
                <span>Partager</span>
              </button>
            </div>

            {/* Стрелки для десктопа */}
            <button
              onClick={goToPrev}
              className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 text-6xl text-white/70 hover:text-white transition-colors"
            >
              ‹
            </button>
            <button
              onClick={goToNext}
              className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 text-6xl text-white/70 hover:text-white transition-colors"
            >
              ›
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}