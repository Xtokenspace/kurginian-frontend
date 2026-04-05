'use client';

import { use, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function SinglePhotoPage({ params }: { params: Promise<{ slug: string; filename: string }> }) {
  const resolvedParams = use(params);
  const { slug, filename } = resolvedParams;

  const router = useRouter();
  const searchParams = useSearchParams();
  const isShareMode = searchParams.get('mode') === 'share';

  const photoUrl = `https://cdn.kurginian.pro/${slug}/web/${filename}`;
  const thumbUrl = `https://cdn.kurginian.pro/${slug}/thumb/${filename}`;

  const [showMenu, setShowMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleDownload = async () => {
    try {
      const fetchUrl = `${photoUrl}?download=${Date.now()}`;
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

  const handleShare = async () => {
    const shareLink = `${window.location.origin}/weddings/${slug}/photo/${filename}?mode=share`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2800);
    } catch {
      prompt('Copiez ce lien :', shareLink);
    }
  };

  return (
    <main className="min-h-screen bg-lux-bg text-lux-text font-montserrat p-6 flex flex-col items-center relative">
      
      {/* Заголовок */}
      <div className="w-full max-w-7xl pt-10">
        <h2 className="font-cinzel text-3xl text-lux-gold mb-8">
          Vos souvenirs • 1 photo
        </h2>

        {/* Большое фото */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-lux-gold/30 rounded-sm overflow-hidden shadow-gold-glow"
          >
            <Image
              src={photoUrl}
              alt={filename}
              width={2500}
              height={2500}
              className="w-full h-auto object-contain bg-black"
              quality={95}
              priority
              sizes="(max-width: 1024px) 100vw, 1200px"
            />
          </motion.div>
        </div>

        {/* Конверсионный блок */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 border-t border-lux-gold/20 pt-12 text-center"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <button
              onClick={() => window.open("https://www.instagram.com/hdart26/", "_blank")}
              className="flex-1 px-8 py-5 border border-lux-gold text-lux-gold hover:bg-lux-gold hover:text-black transition-all flex items-center justify-center gap-3 rounded-sm text-base"
            >
              📸 Suivre sur Instagram
            </button>
            <button
              onClick={() => window.open("https://kurginian.pro", "_blank")}
              className="flex-1 px-8 py-5 bg-lux-gold text-black hover:bg-white transition-all flex items-center justify-center gap-3 rounded-sm font-medium text-base"
            >
              🌐 Découvrir mon univers
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-12">
            Merci d'avoir utilisé KURGINIAN Premium Gallery
          </p>
        </motion.div>
      </div>

      {/* Плавающая кнопка меню */}
      <button
        onClick={() => setShowMenu(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-lux-gold text-black rounded-full flex items-center justify-center shadow-gold-glow-hover hover:scale-110 transition-all duration-300 z-[90] text-3xl"
      >
        ⋮
      </button>

      {/* МОДАЛЬНОЕ МЕНЮ — ОБНОВЛЁННОЕ */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center p-4"
            onClick={() => setShowMenu(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-lux-card border border-lux-gold/30 rounded-3xl w-full max-w-md p-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* НОВАЯ КНОПКА — Trouver encore des photos */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  localStorage.removeItem(`photos_${slug}`);
                  router.push(`/weddings/${slug}`);
                }}
                className="w-full text-left px-6 py-5 hover:bg-white/10 rounded-2xl flex items-center gap-4 text-lg"
              >
                🔎 Trouver encore des photos
              </button>

              {/* НОВАЯ ПАНЕЛЬ В СТИЛЕ GOOGLE IMAGES (ГДЕ РАНЬШЕ БЫЛИ ДВЕ КНОПКИ) */}
              <div className="flex gap-3 p-4 justify-center">
                <button
                  onClick={() => { setShowMenu(false); handleDownload(); }}
                  className="flex-1 flex items-center justify-center gap-3 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white px-6 py-3.5 rounded-3xl transition-all active:scale-95 shadow-xl border border-white/5"
                >
                  <span className="text-2xl leading-none">↓</span>
                  <span className="font-medium">Télécharger</span>
                </button>
                <button
                  onClick={() => { setShowMenu(false); handleShare(); }}
                  className="flex-1 flex items-center justify-center gap-3 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white px-6 py-3.5 rounded-3xl transition-all active:scale-95 shadow-xl border border-white/5"
                >
                  <span className="text-2xl leading-none">↗</span>
                  <span className="font-medium">Partager</span>
                </button>
              </div>

              <div className="h-px bg-lux-gold/20 my-2 mx-4"></div>

              {/* Нижние кнопки */}
              <button
                onClick={() => { setShowMenu(false); window.open("https://www.instagram.com/hdart26/", "_blank"); }}
                className="w-full text-left px-6 py-5 hover:bg-white/10 rounded-2xl flex items-center gap-4 text-lg"
              >
                📸 Suivre sur Instagram
              </button>

              <button
                onClick={() => { setShowMenu(false); window.open("https://kurginian.pro", "_blank"); }}
                className="w-full text-left px-6 py-5 hover:bg-white/10 rounded-2xl flex items-center gap-4 text-lg"
              >
                🌐 Découvrir mon univers
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-lux-gold text-black px-6 py-3 rounded-3xl font-medium shadow-gold-glow flex items-center gap-2 z-[200]"
          >
            ✅ Lien copié dans le presse-papiers
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}