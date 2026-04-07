'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const translations = {
  fr: {
    title: "Souvenir • 1 photo",
    download: "Télécharger",
    share: "Partager",
    backToGallery: "Retour à la galerie",
    searchAgain: "Nouvelle recherche",
    instagram: "Suivre sur Instagram",
    discover: "Découvrir mon univers",
    thanks: "Merci d'avoir utilisé KURGINIAN Premium Gallery",
    toast: "Lien copié dans le presse-papiers",
    shareText: "Regardez cette magnifique photo dans la KURGINIAN Premium Gallery ✨"
  },
  en: {
    title: "Memory • 1 photo",
    download: "Download",
    share: "Share",
    backToGallery: "Back to gallery",
    searchAgain: "New search",
    instagram: "Follow on Instagram",
    discover: "Discover my work",
    thanks: "Thank you for using KURGINIAN Premium Gallery",
    toast: "Link copied to clipboard",
    shareText: "Take a look at this wonderful photo in the KURGINIAN Premium Gallery ✨"
  },
  ru: {
    title: "Воспоминание • 1 photo",
    download: "Скачать",
    share: "Поделиться",
    backToGallery: "Назад в галерею",
    searchAgain: "Новый поиск",
    instagram: "Подписаться в Instagram",
    discover: "Узнать о моих услугах",
    thanks: "Спасибо, что воспользовались KURGINIAN Premium Gallery",
    toast: "Ссылка скопирована",
    shareText: "Взгляните на эту замечательную фотографию в KURGINIAN Premium Gallery ✨"
  }
} as const;

export default function SinglePhotoPage({ params }: { params: Promise<{ slug: string; filename: string }> }) {
  const resolvedParams = use(params);
  const { slug, filename } = resolvedParams;

  const router = useRouter();
  const photoUrl = `https://cdn.kurginian.pro/${slug}/web/${filename}`;
  
  const [showToast, setShowToast] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // === ЯЗЫК ===
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');
  const t = translations[language];

  // Умная синхронизация языка
  useEffect(() => {
    const globalLang = localStorage.getItem('kurginian_global_lang') as 'fr' | 'en' | 'ru';
    const localLang = localStorage.getItem(`lang_${slug}`) as 'fr' | 'en' | 'ru';
    if (globalLang) setLanguage(globalLang);
    else if (localLang) setLanguage(localLang);
  }, [slug]);

  const handleLanguageChange = (lang: 'fr' | 'en' | 'ru') => {
    setLanguage(lang);
    localStorage.setItem(`lang_${slug}`, lang);
    localStorage.setItem('kurginian_global_lang', lang);
    setShowLangMenu(false); // Закрываем глобус после выбора
  };

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
    <main className="min-h-screen bg-lux-bg text-lux-text font-montserrat p-6 flex flex-col items-center relative pb-20">

      {/* ВЕРХНЯЯ ПАНЕЛЬ НАВИГАЦИИ (Домой + Языки) */}
      <div className="fixed top-6 left-6 right-6 z-50 flex justify-between items-start pointer-events-none">
        {/* Кнопка НАЗАД (Самая интуитивная кнопка в мире) */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto">
          <button
            onClick={() => router.push(`/weddings/${slug}`)}
            className="flex items-center gap-2 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl px-5 py-2.5 text-sm font-medium shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all text-gray-300 group"
          >
            <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
            <span className="hidden md:inline uppercase tracking-widest">{t.backToGallery}</span>
          </button>
        </motion.div>

        {/* ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКОВ (Умный глобус) */}
        <div className="pointer-events-auto relative">
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
                className="absolute top-12 right-0 bg-lux-card border border-lux-gold/30 rounded-3xl p-1 shadow-2xl flex flex-col w-28 z-[60]"
              >
                {(['fr', 'en', 'ru'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
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
      </div>

      <div className="w-full max-w-4xl pt-24 md:pt-20">
        {/* Заголовок */}
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-cinzel text-lg md:text-2xl text-lux-gold mb-6 text-center tracking-widest uppercase"
        >
          {t.title}
        </motion.h2>

        {/* БОЛЬШОЕ ФОТО */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-lux-gold/30 rounded-sm overflow-hidden shadow-2xl relative min-h-[300px] md:min-h-[500px] bg-[#070707]"
          >
            {!isImageLoaded && (
               <div className="absolute inset-0 flex items-center justify-center">
                 <motion.div animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ repeat: Infinity, duration: 1.5 }} className="font-cinzel text-xs text-lux-gold/50 tracking-widest">
                   KURGINIAN
                 </motion.div>
               </div>
            )}
            
            <Image
              src={photoUrl}
              alt={filename}
              width={2500}
              height={2500}
              className={`w-full h-auto object-contain transition-opacity duration-1000 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
              quality={95}
              priority
              onLoad={() => setIsImageLoaded(true)}
              sizes="(max-width: 1024px) 100vw, 1200px"
            />
          </motion.div>
        </div>

        {/* 🔥 ГЛАВНАЯ ИННОВАЦИЯ: PREMIUM ACTION BAR ПОД ФОТО 🔥 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full mt-4 flex gap-3"
        >
          {/* Золотая кнопка скачивания (Главный акцент) */}
          <button
            onClick={handleDownload}
            className="flex-[3] flex items-center justify-center gap-3 bg-lux-gold text-black px-6 py-4 rounded-sm transition-all active:scale-[0.98] shadow-gold-glow hover:bg-white font-bold"
          >
            <span className="text-xl leading-none">↓</span>
            <span className="uppercase tracking-widest text-xs md:text-sm">{t.download}</span>
          </button>
          
          {/* Темная кнопка "Поделиться" */}
          <button
            onClick={handleShare}
            className="flex-[2] flex items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-lux-gold/30 text-lux-gold px-4 py-4 rounded-sm transition-all active:scale-[0.98] shadow-lg"
          >
            <span className="text-lg leading-none">↗</span>
            <span className="font-medium uppercase tracking-widest text-xs">{t.share}</span>
          </button>
        </motion.div>

        {/* БЛОК СВЯЗИ С ФОТОГРАФОМ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 border-t border-white/5 pt-12 text-center"
        >
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => window.open("https://www.instagram.com/hdart26/", "_blank")}
              className="flex-1 px-8 py-4 border border-white/10 text-gray-400 hover:border-lux-gold hover:text-lux-gold transition-all flex items-center justify-center gap-3 rounded-sm text-xs uppercase tracking-widest"
            >
              📸 {t.instagram}
            </button>
            <button
              onClick={() => window.open("https://kurginian.pro", "_blank")}
              className="flex-1 px-8 py-4 bg-[#0a0a0a] border border-white/10 text-white hover:border-lux-gold hover:bg-[#111] transition-all flex items-center justify-center gap-3 rounded-sm text-xs uppercase tracking-widest"
            >
              🌐 {t.discover}
            </button>
          </div>
        </motion.div>

        {/* НИЖНИЙ КОЛОНТИТУЛ (Безопасный "Новый поиск") */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center space-y-6"
        >
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            {t.thanks}
          </p>
          
          {/* Деструктивное действие убрано вниз и сделано ссылкой */}
          <button
            onClick={() => {
              localStorage.removeItem(`photos_${slug}`);
              router.push(`/weddings/${slug}`);
            }}
            className="text-[10px] text-gray-500 hover:text-red-400 transition-colors uppercase tracking-[0.2em] underline underline-offset-4 decoration-transparent hover:decoration-red-400/50"
          >
            {t.searchAgain}
          </button>
        </motion.div>

      </div>

      {/* Уведомление об успешном копировании ссылки */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-lux-gold text-black px-6 py-3 rounded-sm font-bold shadow-gold-glow flex items-center gap-2 z-[200] text-xs uppercase tracking-wider"
          >
            ✅ {t.toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}