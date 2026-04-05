'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Gallery from '@/components/Gallery';
import JSZip from 'jszip';

interface MatchedPhoto {
  filename: string;
  width: number;
  height: number;
  urls: { web: string; thumb: string; };
}

// Добавляем объект с переводами для меню
const translations = {
  fr: {
    downloadAll: "Télécharger toutes les photos",
    contactPhotographer: "Suivre sur Instagram",
    discoverServices: "Découvrir mon univers",
  },
  en: {
    downloadAll: "Download all photos",
    contactPhotographer: "Follow on Instagram",
    discoverServices: "Discover my work",
  },
  ru: {
    downloadAll: "Скачать все фото",
    contactPhotographer: "Подписаться в Instagram",
    discoverServices: "Узнать о моих услугах",
  }
} as const;

export default function AdminGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');
  
  // Новые стейты для меню и загрузки архива
  const [showMenu, setShowMenu] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const t = translations[language];

  useEffect(() => {
    // 1. Подхватываем язык
    const globalLang = localStorage.getItem('kurginian_global_lang') as 'fr' | 'en' | 'ru';
    const localLang = localStorage.getItem(`lang_${slug}`) as 'fr' | 'en' | 'ru';
    if (globalLang) setLanguage(globalLang);
    else if (localLang) setLanguage(localLang);

    // 2. Ищем VIP-пароль
    const vipCode = localStorage.getItem(`vip_code_${slug}`);
    if (!vipCode) {
      router.replace(`/weddings/${slug}`);
      return;
    }

    // 3. Запрашиваем ВСЕ фото
    const fetchAllPhotos = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${apiUrl}/api/weddings/${slug}/verify-vip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: vipCode }),
        });

        if (response.ok) {
          const data = await response.json();
          // Сортируем все фотографии по имени файла (хронологический порядок)
          const sortedPhotos = data.data.sort((a: MatchedPhoto, b: MatchedPhoto) => 
            a.filename.localeCompare(b.filename)
          );
          setPhotos(sortedPhotos);
        } else {
          // Если пароль сменили или он устарел - выкидываем обратно
          localStorage.removeItem(`vip_code_${slug}`);
          router.replace(`/weddings/${slug}`);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPhotos();
  }, [slug, router]);

  const handleLogout = () => {
    localStorage.removeItem(`vip_code_${slug}`);
    router.push(`/weddings/${slug}`);
  };

  // Функция скачивания архива для меню
  const downloadAllPhotos = async () => {
    if (photos.length === 0) return;
      
    setIsDownloadingAll(true);
    setDownloadProgress(0);
  
    try {
      const zip = new JSZip();
          
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fetchUrl = `${photo.urls.web}?download=${Date.now()}`;
        
        setDownloadProgress(Math.round(((i) / photos.length) * 100));
              
        const response = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        zip.file(photo.filename, blob);
      }
      
      setDownloadProgress(100); 
          
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `mes_photos_${slug}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert(language === 'ru' ? "Ошибка при создании архива" : "Erreur lors de la création de l'archive");
    } finally {
      setIsDownloadingAll(false);
      setDownloadProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lux-bg flex items-center justify-center">
        <motion.p 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="font-cinzel text-xl text-lux-gold tracking-widest uppercase"
        >
          {language === 'ru' ? 'Загрузка архива...' : language === 'en' ? 'Loading archive...' : 'Chargement de l\'archive...'}
        </motion.p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-lux-bg text-lux-text font-montserrat p-6 relative">
      
      {/* Верхняя панель */}
      <div className="fixed top-6 left-6 right-6 z-50 flex justify-between items-center pointer-events-none">
        {/* Кнопка выхода */}
        <button
          onClick={handleLogout}
          className="pointer-events-auto flex items-center gap-2 bg-lux-card/90 backdrop-blur-md border border-red-900/50 rounded-3xl px-5 py-2.5 text-sm font-medium hover:bg-red-900/20 text-gray-300 transition-all shadow-lg"
        >
          <span>✕</span>
          <span className="hidden md:inline uppercase tracking-widest">
            {language === 'ru' ? 'Закрыть VIP' : language === 'en' ? 'Close VIP' : 'Fermer VIP'}
          </span>
        </button>

        {/* Блок справа с индикатором и бургером */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Индикатор VIP */}
          <div className="bg-lux-gold text-black px-4 py-2 rounded-3xl font-cinzel font-bold text-xs tracking-[0.2em] shadow-gold-glow">
            VIP ACCESS
          </div>
          
          {/* КНОПКА БУРГЕРА */}
          <button 
            onClick={() => setShowMenu(true)}
            className="bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 w-11 h-11 rounded-full flex flex-col items-center justify-center gap-1 shadow-gold-glow hover:bg-lux-gold group transition-all"
          >
            <span className="w-5 h-0.5 bg-lux-gold group-hover:bg-black transition-colors"></span>
            <span className="w-5 h-0.5 bg-lux-gold group-hover:bg-black transition-colors"></span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto pt-24 pb-20">
        <div className="mb-12 text-center md:text-left">
          <h1 className="font-cinzel text-3xl md:text-5xl text-lux-gold mb-4 uppercase tracking-widest">
            {language === 'ru' ? 'Все фотографии' : language === 'en' ? 'All Photos' : 'Toutes les photos'}
          </h1>
          <p className="font-cormorant text-xl text-gray-400 italic">
            {photos.length} {language === 'ru' ? 'снимков' : 'photos'}
          </p>
        </div>

        {/* Галерея */}
        <Gallery photos={photos} slug={slug} />
      </div>

      {/* МОДАЛЬНОЕ МЕНЮ */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center p-4"
            onClick={() => setShowMenu(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-lux-card border border-lux-gold/30 rounded-3xl w-full max-w-md p-2 shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setShowMenu(false); downloadAllPhotos(); }}
                disabled={isDownloadingAll}
                className="w-full text-left px-6 py-5 hover:bg-white/10 transition-colors rounded-2xl flex items-center gap-4 text-lg disabled:opacity-70"
              >
                {isDownloadingAll ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>
                      {downloadProgress < 100 
                        ? `${language === 'ru' ? 'Загрузка' : 'Chargement'} ${downloadProgress}%` 
                        : (language === 'ru' ? 'Создание архива...' : 'Archivage...')}
                    </span>
                  </>
                ) : (
                  <><span>⬇️</span> <span>{t.downloadAll}</span></>
                )}
              </button>
              
              <div className="h-px bg-lux-gold/20 my-2 mx-4"></div>
              
              <button
                onClick={() => { setShowMenu(false); window.open("https://www.instagram.com/hdart26/", "_blank"); }}
                className="w-full text-left px-6 py-5 hover:bg-white/10 transition-colors rounded-2xl flex items-center gap-4 text-lg"
              >
                📸 {t.contactPhotographer}
              </button>
              
              <button
                onClick={() => { setShowMenu(false); window.open("https://kurginian.pro", "_blank"); }}
                className="w-full text-left px-6 py-5 hover:bg-white/10 transition-colors rounded-2xl flex items-center gap-4 text-lg"
              >
                🌐 {t.discoverServices}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}