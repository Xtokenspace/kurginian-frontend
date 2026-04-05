'use client';

import { useState, useRef, use, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Gallery from '@/components/Gallery';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { useRouter } from 'next/navigation';

// === ТИПИЗАЦИЯ API ===
export interface MatchedPhoto {
  filename: string;
  width: number;
  height: number;
  urls: { web: string; thumb: string; };
}

export interface AuthResponse {
  status: string;
  message: string;
  matches_count: number;
  data: MatchedPhoto[];
}

// === ПЕРЕВОДЫ ===
const translations = {
  fr: {
    welcome: "Bienvenue",
    subtitle: "Bienvenue dans votre galerie. Je suis l'assistant numérique de ce mariage.",
    findPhotos: "Trouver mes photos",
    takePhoto: "Prendre une photo maintenant",
    chooseGallery: "Choisir une photo depuis la galerie",
    foundPhotos: "Vos souvenirs",
    downloadAll: "Télécharger toutes les photos",
    findMore: "Trouver encore des photos",
    contactPhotographer: "Suivre sur Instagram",
    discoverServices: "Découvrir mon univers",
    thanks: "Merci d'avoir utilisé KURGINIAN Premium Gallery",
    home: "Mes galeries",
    viewAll: "Toutes les photos",
    enterPassword: "Code d'accès VIP",
    submit: "Valider",
    cancel: "Annuler",
    wrongPassword: "Code incorrect"
  },
  en: {
    welcome: "Welcome",
    subtitle: "Welcome to your gallery. I am the digital assistant of this wedding.",
    findPhotos: "Find my photos",
    takePhoto: "Take a photo now",
    chooseGallery: "Choose from gallery",
    foundPhotos: "Your memories",
    downloadAll: "Download all photos",
    findMore: "Find more photos",
    contactPhotographer: "Follow on Instagram",
    discoverServices: "Discover my work",
    thanks: "Thank you for using KURGINIAN Premium Gallery",
    home: "My galleries",
    viewAll: "All photos",
    enterPassword: "VIP Access Code",
    submit: "Submit",
    cancel: "Cancel",
    wrongPassword: "Incorrect code"
  },
  ru: {
    welcome: "Добро пожаловать",
    subtitle: "Добро пожаловать в вашу галерею. Я цифровой помощник этой свадьбы.",
    findPhotos: "Найти мои фото",
    takePhoto: "Сделать фото сейчас",
    chooseGallery: "Выбрать из галереи",
    foundPhotos: "Ваши воспоминания",
    downloadAll: "Скачать все фото",
    findMore: "Найти ещё фото",
    contactPhotographer: "Подписаться в Instagram",
    discoverServices: "Узнать о моих услугах",
    thanks: "Спасибо, что воспользовались KURGINIAN Premium Gallery",
    home: "Мои галереи",
    viewAll: "Все фотографии",
    enterPassword: "VIP Код доступа",
    submit: "Войти",
    cancel: "Отмена",
    wrongPassword: "Неверный код"
  }
} as const;

export default function WeddingGuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'network_error'>('idle');
  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false); 
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Стейты для VIP-пароля
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // === ЯЗЫКОВОЕ СОСТОЯНИЕ ===
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');
  const t = translations[language];

  // Обработчик проверки пароля через API
  const handlePasswordSubmit = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/verify-vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      if (response.ok) {
        // СОХРАНЯЕМ ПАРОЛЬ КАК VIP-КЛЮЧ
        localStorage.setItem(`vip_code_${slug}`, passwordInput);
        setShowPasswordModal(false);
        router.push(`/weddings/${slug}/admin`);
      } else {
        setPasswordError(true);
        setTimeout(() => setPasswordError(false), 2000);
      }
    } catch (error) {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  // === УМНАЯ СИНХРОНИЗАЦИЯ (Язык + Память) ===
  useEffect(() => {
    // 1. Сначала проверяем глобальный язык с главной страницы
    const globalLang = localStorage.getItem('kurginian_global_lang') as 'fr' | 'en' | 'ru';
    // 2. Затем локальный язык этой конкретной свадьбы
    const savedSlugLang = localStorage.getItem(`lang_${slug}`) as 'fr' | 'en' | 'ru';
    
    if (globalLang) {
      setLanguage(globalLang);
    } else if (savedSlugLang) {
      setLanguage(savedSlugLang);
    }
  }, [slug]);

  // Сохраняем выбор языка локально при изменении
  useEffect(() => {
    localStorage.setItem(`lang_${slug}`, language);
  }, [language, slug]);

  // Загружаем фото из памяти только для этой свадьбы
  useEffect(() => {
    const saved = localStorage.getItem(`photos_${slug}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setPhotos(parsed);
          setStatus('success');
        }
      } catch (e) {
        localStorage.removeItem(`photos_${slug}`);
      }
    }
  }, [slug]);

  // === ИНТЕГРАЦИЯ API: Сжатие и отправка селфи ===
  const handleSelfieUpload = async (file: File) => {
    setStatus('loading');

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/jpeg'
      };

      const compressedFile = await imageCompression(file, options);
      
      const formData = new FormData();
      formData.append('selfie', compressedFile, compressedFile.name);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/auth`, {
        method: 'POST',
        body: formData,
      });

      // Обработка конкретной ошибки: Свадьба не найдена
      if (response.status === 404) {
        setStatus('error'); // Или можно добавить новый статус 'not_found'
        return;
      }

      if (!response.ok) throw new Error('HTTP error');

      const data: AuthResponse = await response.json();

      if (data.matches_count > 0) {
        setPhotos(data.data);
        setStatus('success');
        // Сохраняем ТОЛЬКО ключ для этой свадьбы. 
        // Главная страница сама найдет его своим сканером.
        localStorage.setItem(`photos_${slug}`, JSON.stringify(data.data));
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Ошибка при обращении к API или сжатии:', error);
      setStatus('network_error');
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelfieUpload(file);
    }
  };

  // === СКАЧИВАНИЕ ВСЕХ ФОТО (ZIP) ===
  const downloadAllPhotos = async () => {
    if (photos.length === 0) return;
      
    setIsDownloadingAll(true);
    setDownloadProgress(0);
  
    try {
      const zip = new JSZip();
          
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fetchUrl = `${photo.urls.web}?download=${Date.now()}`;
        
        // Показываем прогресс загрузки по сети
        setDownloadProgress(Math.round(((i) / photos.length) * 100));
              
        const response = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        zip.file(photo.filename, blob);
      }
      
      // Финальная стадия: упаковка (здесь обычно зависает UI, поэтому меняем текст)
      setDownloadProgress(100); 
      // Мы будем использовать этот флаг в UI, чтобы написать "Archivage..."
          
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

  return (
    <main className="min-h-screen bg-lux-bg text-lux-text font-montserrat p-6 flex flex-col items-center justify-center selection:bg-lux-gold selection:text-black relative">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ НАВИГАЦИИ (Домой + Языки) */}
      <AnimatePresence>
        {(status === 'idle' || status === 'success') && (
          <>
            {/* Кнопка НАЗАД */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-6 left-6 z-50"
            >
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl px-5 py-2.5 text-sm font-medium shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all text-gray-300 group"
              >
                <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
                <span className="hidden md:inline uppercase tracking-widest">{t.home}</span>
              </button>
            </motion.div>

            {/* ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКОВ (Оставляем справа) */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-6 right-6 z-50 flex gap-1 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl px-1 py-1 text-sm font-medium shadow-gold-glow"
            >
              {(['fr', 'en', 'ru'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-4 py-2 rounded-3xl transition-all duration-300 ${
                    language === lang
                      ? 'bg-lux-gold text-black shadow-inner'
                      : 'text-gray-400 hover:text-lux-gold hover:bg-white/10'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        
        {/* ЭКРАН ПРИВЕТСТВИЯ */}
        {status === 'idle' && photos.length === 0 && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: "blur(5px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center max-w-lg w-full"
          >
            <h1 className="font-cinzel text-3xl md:text-5xl text-lux-gold mb-6 uppercase tracking-widest">
              {t.welcome}
            </h1>
            <p className="font-cormorant text-xl md:text-2xl mb-12 italic text-gray-300">
              {t.subtitle}
            </p>
            <button 
              onClick={() => setShowChoiceModal(true)}
              className="px-10 py-5 bg-transparent border-2 border-lux-gold text-lux-gold font-montserrat uppercase tracking-[0.2em] rounded-sm hover:bg-lux-gold hover:text-black hover:shadow-gold-glow-hover transition-all duration-500 text-lg"
            >
              {t.findPhotos}
            </button>
          </motion.div>
        )}

        {/* ЭКРАН ЗАГРУЗКИ */}
        {status === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(5px)" }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 bg-lux-bg flex items-center justify-center z-50 p-6 text-center"
          >
            <motion.p 
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.98, 1, 0.98] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="font-cinzel text-xl text-lux-gold tracking-widest"
            >
              {language === 'ru' ? 'Ищем ваше лицо среди воспоминаний...' : 
               language === 'en' ? 'Searching for your face among memories...' : 
               'Recherche de votre visage parmi les souvenirs...'}
            </motion.p>
          </motion.div>
        )}

        {/* ЭКРАН ОШИБКИ */}
        {status === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center max-w-md"
          >
            <p className="font-cormorant text-2xl text-lux-text mb-8">
              {language === 'ru' ? 'Извините, мы не нашли ваше лицо. Попробуйте другое фото.' : 
               language === 'en' ? 'Sorry, we couldn\'t find your face. Try another photo.' : 
               'Désolé, nous n\'avons pas trouvé votre visage. Essayez avec une autre photo.'}
            </p>
            <button 
              onClick={() => setStatus('idle')}
              className="px-6 py-3 border border-lux-gold text-lux-gold uppercase tracking-wider rounded-sm hover:shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all duration-300"
            >
              {language === 'ru' ? 'Попробовать снова' : language === 'en' ? 'Try Again' : 'Réessayer'}
            </button>
          </motion.div>
        )}

        {/* ЭКРАН СЕТЕВОЙ ОШИБКИ */}
        {status === 'network_error' && (
          <motion.div 
            key="network_error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-md bg-red-900/20 border border-red-500/50 p-8 rounded-sm"
          >
            <p className="font-cormorant text-2xl text-red-400 mb-6">
              {language === 'ru' ? 'Ошибка соединения с сервером.' : 
               language === 'en' ? 'Connection error to the server.' : 
               'Erreur de connexion au serveur.'}
            </p>
            <button 
              onClick={() => setStatus('idle')}
              className="px-6 py-3 border border-lux-gold text-lux-gold uppercase tracking-wider rounded-sm hover:shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all duration-300"
            >
              {language === 'ru' ? 'Назад' : language === 'en' ? 'Back' : 'Retour'}
            </button>
          </motion.div>
        )}

        {/* ЭКРАН УСПЕХА */}
        {status === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-7xl pt-10 relative"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-cinzel text-3xl text-lux-gold">
                {t.foundPhotos} • {photos.length} photo{photos.length > 1 ? 's' : ''}
              </h2>
            </div>
            
            <Gallery photos={photos} slug={slug} />

            {/* ПРЕМИУМ БЛОК КОНВЕРСИИ */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-16 border-t border-lux-gold/20 pt-12 text-center"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <button
                  onClick={() => window.open("https://www.instagram.com/hdart26/", "_blank")}
                  className="flex-1 px-8 py-5 border border-lux-gold text-lux-gold hover:bg-lux-gold hover:text-black transition-all duration-300 flex items-center justify-center gap-3 rounded-sm text-base"
                >
                  📸 {t.contactPhotographer}
                </button>
                <button
                  onClick={() => window.open("https://kurginian.pro", "_blank")}
                  className="flex-1 px-8 py-5 bg-lux-gold text-black hover:bg-white transition-all duration-300 flex items-center justify-center gap-3 rounded-sm font-medium text-base"
                >
                  🌐 {t.discoverServices}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-12">
                {t.thanks}
              </p>
            </motion.div>
            
            {/* ПРЕМИУМ ПЛАВАЮЩАЯ КНОПКА */}
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
              onClick={() => setShowMenu(true)}
              className="fixed bottom-8 right-8 w-14 h-14 bg-lux-gold text-black rounded-full flex items-center justify-center shadow-gold-glow hover:shadow-gold-glow-hover hover:scale-110 transition-all duration-300 z-[90] text-3xl"
            >
              ⋮
            </motion.button>

            {/* МОДАЛЬНОЕ МЕНЮ (БЕЗ ЯЗЫКОВ) */}
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
                    className="bg-lux-card border border-lux-gold/30 rounded-3xl w-full max-w-md p-2 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => { setShowMenu(false); setShowChoiceModal(true); }}
                      className="w-full text-left px-6 py-5 hover:bg-white/10 transition-colors rounded-2xl flex items-center gap-4 text-lg"
                    >
                      🔎 {t.findMore}
                    </button>
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
                      onClick={() => { setShowMenu(false); setShowPasswordModal(true); }}
                      className="w-full text-left px-6 py-5 hover:bg-white/10 transition-colors rounded-2xl flex items-center gap-4 text-lg text-lux-gold"
                    >
                      🔓 {t.viewAll}
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
          </motion.div>
        )}

      </AnimatePresence>

      {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ФОТО */}
      <AnimatePresence>
        {showChoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={() => setShowChoiceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-lux-card border border-lux-gold/30 rounded-sm max-w-md w-full p-8 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setShowChoiceModal(false);
                    fileInputRef.current?.setAttribute('capture', 'user');
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-6 py-6 border border-lux-gold text-lux-gold hover:bg-lux-gold hover:text-black transition-all duration-300 flex items-center justify-center gap-4 text-lg font-medium rounded-sm group"
                >
                  <span className="group-hover:scale-110 transition-transform">📸</span> <span>{t.takePhoto}</span>
                </button>
                <button
                  onClick={() => {
                    setShowChoiceModal(false);
                    fileInputRef.current?.removeAttribute('capture');
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-6 py-6 border border-lux-gold text-lux-gold hover:bg-lux-gold hover:text-black transition-all duration-300 flex items-center justify-center gap-4 text-lg font-medium rounded-sm group"
                >
                  <span className="group-hover:scale-110 transition-transform">📁</span> <span>{t.chooseGallery}</span>
                </button>
              </div>

              <button
                onClick={() => setShowChoiceModal(false)}
                className="mt-8 text-gray-400 hover:text-lux-gold text-sm transition-colors uppercase tracking-wider"
              >
                {language === 'ru' ? 'Отмена' : language === 'en' ? 'Cancel' : 'Annuler'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛЬНОЕ ОКНО VIP ПАРОЛЯ */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-lux-card border border-lux-gold/50 rounded-sm max-w-sm w-full p-8 text-center shadow-gold-glow"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-cinzel text-xl text-lux-gold mb-6 tracking-widest uppercase">
                {t.enterPassword}
              </h3>
              
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••"
                className={`w-full bg-[#111] border ${passwordError ? 'border-red-500' : 'border-lux-gold/30'} text-white px-4 py-4 rounded-sm text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-lux-gold transition-colors mb-2`}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              
              {/* Сообщение об ошибке */}
              <div className="h-6">
                <AnimatePresence>
                  {passwordError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-400 text-sm">
                      {t.wrongPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-3 text-gray-400 hover:text-white transition-colors uppercase text-sm tracking-wider"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  className="flex-1 px-4 py-3 bg-lux-gold text-black font-medium hover:bg-white transition-colors rounded-sm uppercase text-sm tracking-wider"
                >
                  {t.submit}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}