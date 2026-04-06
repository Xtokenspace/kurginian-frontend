'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const translations = {
  fr: {
    title: "KURGINIAN",
    subtitle: "Votre galerie de mariage avec reconnaissance faciale",
    whatsapp: "Contacter le photographe",
    findWedding: "Trouver un mariage",
    bookShoot: "Réserver une séance photo",
    myGalleries: "Mes galeries privées",
    noGalleriesYet: "Vous n'avez encore ouvert aucune galerie",
    whatsappMessage: "Bonjour, je souhaite accéder à la galerie de ma/sa mariage. Pouvez-vous m'envoyer le lien ?",
    photosFound: "photos trouvées",
    actionNeeded: "Recherche requise",
    openGallery: "Ouvrir"
  },
  en: {
    title: "KURGINIAN",
    subtitle: "Your wedding gallery with facial recognition",
    whatsapp: "Contact the photographer",
    findWedding: "Find a wedding",
    bookShoot: "Book a photoshoot",
    myGalleries: "My private galleries",
    noGalleriesYet: "You haven't opened any gallery yet",
    whatsappMessage: "Hello, I would like access to the wedding gallery. Can you send me the link please?",
    photosFound: "photos found",
    actionNeeded: "Action needed",
    openGallery: "Open"
  },
  ru: {
    title: "KURGINIAN",
    subtitle: "Ваша свадебная галерея с распознаванием лиц",
    whatsapp: "Связаться с фотографом",
    findWedding: "Найти свадьбу",
    bookShoot: "Заказать фотосъёмку",
    myGalleries: "Мои приватные галереи",
    noGalleriesYet: "Вы ещё не открывали ни одной галереи",
    whatsappMessage: "Здравствуйте, я хочу получить доступ к галерее свадьбы. Можете прислать ссылку?",
    photosFound: "фото найдено",
    actionNeeded: "Требуется поиск",
    openGallery: "Открыть"
  }
} as const;

// НОВАЯ СТРУКТУРА: Отдельная карточка для каждого типа доступа
interface GallerySession {
  id: string; // Уникальный ID для React
  slug: string;
  title: string;
  type: 'vip' | 'guest'; // Тип карточки
  count?: number;
  rawKey: string; // Ключ в localStorage (для удаления)
}

export default function PWAHome() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<GallerySession[]>([]);
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // === НОВЫЕ СТЕЙТЫ (Оффлайн и Гармошка) ===
  const [isOffline, setIsOffline] = useState(false);
  const [isGalleriesOpen, setIsGalleriesOpen] = useState(false); 
  
  const t = translations[language];

  // === HAPTIC FEEDBACK ===
  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  // === ДЕТЕКТОР ИНТЕРНЕТА ===
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => {
        setIsOffline(true);
        triggerVibration([50, 100, 50]); // Предупреждающая вибрация при потере сети
      };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Умный сканер сессий
  useEffect(() => {
    const globalLang = localStorage.getItem('kurginian_global_lang') as 'fr' | 'en' | 'ru';
    if (globalLang) setLanguage(globalLang);

    const scanGalleries = () => {
      const sessions: GallerySession[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Ищем VIP-сессии
        if (key.startsWith('vip_code_')) {
          const slug = key.replace('vip_code_', '');
          sessions.push({
            id: `vip_${slug}`,
            slug,
            title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: 'vip',
            rawKey: key
          });
        } 
        // Ищем Гостевые сессии (Селфи)
        else if (key.startsWith('photos_')) {
          const slug = key.replace('photos_', '');
          try {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (data.length > 0) {
              sessions.push({
                id: `guest_${slug}`,
                slug,
                title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: 'guest',
                count: data.length,
                rawKey: key
              });
            }
          } catch (e) {}
        }
      }
      setGalleries(sessions);
      setIsLoaded(true);
    };

    scanGalleries();
    window.addEventListener('storage', scanGalleries);
    return () => window.removeEventListener('storage', scanGalleries);
  }, []);

  // ФУНКЦИЯ УДАЛЕНИЯ КАРТОЧКИ
  const handleDeleteSession = (e: React.MouseEvent, rawKey: string) => {
    e.stopPropagation();
    triggerVibration(10);
    const confirmMsg = language === 'ru' ? 'Удалить этот доступ?' : language === 'en' ? 'Delete this access?' : 'Supprimer cet accès ?';
    
    if (window.confirm(confirmMsg)) {
      triggerVibration([50, 50, 50]); // Вибрация удаления
      localStorage.removeItem(rawKey);
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleLangChange = (lang: 'fr' | 'en' | 'ru') => {
    triggerVibration(10);
    setLanguage(lang);
    localStorage.setItem('kurginian_global_lang', lang);
    setShowLangMenu(false);
  };

  const openWhatsApp = () => {
    triggerVibration(10);
    const message = encodeURIComponent(t.whatsappMessage);
    window.open(`https://wa.me/33743300000?text=${message}`, '_blank');
  };

  const openLinkModal = () => {
    triggerVibration(10);
    const slug = prompt(
      language === 'ru' ? 'Введите название или код свадьбы (Например: noah-maria-11-11-2011)' :
      language === 'en' ? 'Enter wedding name or code (Example: noah-maria-11-11-2011)' :
      'Veuillez entrer le nom ou code du mariage (Exemple: noah-maria-11-11-2011)'
    );
    if (slug && slug.trim()) {
      router.push(`/weddings/${slug.trim()}`);
    }
  };

  // Не показываем ничего, пока не отсканировали память (чтобы не было мерцаний)
  if (!isLoaded) return <div className="min-h-screen bg-lux-bg" />;

  return (
    <main className="min-h-screen bg-lux-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
      {/* === ОФФЛАЙН БЕЙДЖ === */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-lux-gold text-black px-4 py-2 rounded-3xl font-bold text-xs uppercase tracking-widest shadow-gold-glow flex items-center gap-2"
          >
            <span>⚠️</span> 
            {language === 'ru' ? 'Режим оффлайн' : language === 'en' ? 'Offline Mode' : 'Mode hors ligne'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКОВ */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={() => setShowLangMenu(!showLangMenu)}
          className="px-5 py-2.5 bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 rounded-3xl text-sm font-medium shadow-gold-glow flex items-center gap-2 hover:bg-lux-card transition-all"
        >
          <span className="text-base">{language.toUpperCase()}</span>
          <span className="text-xl">🌐</span>
        </button>

        <AnimatePresence>
          {showLangMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-12 right-0 bg-lux-card border border-lux-gold/30 rounded-3xl p-1 shadow-2xl flex flex-col w-28"
            >
              {(['fr', 'en', 'ru'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLangChange(lang)}
                  className={`px-6 py-3 text-left rounded-3xl transition-all ${
                    language === lang ? 'bg-lux-gold text-black' : 'hover:bg-white/10'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="max-w-md w-full pt-10 pb-20"
      >
        <h1 className="font-cinzel text-5xl md:text-6xl text-lux-gold mb-4 tracking-widest">KURGINIAN</h1>
        <p className="font-cormorant text-xl md:text-2xl text-lux-text/90 mb-12 italic leading-tight">
          {t.subtitle}
        </p>

        {/* ГАРМОШКА: СПИСОК ГАЛЕРЕЙ */}
        {galleries.length > 0 && (
          <div className="mb-10 text-left">
            <button
              onClick={() => { 
                triggerVibration(10); 
                setIsGalleriesOpen(!isGalleriesOpen); 
              }}
              className="w-full flex items-center justify-between bg-lux-card border border-lux-gold/30 p-5 rounded-sm hover:border-lux-gold transition-colors shadow-lg active:scale-[0.98]"
            >
              <span className="font-cinzel text-lux-gold tracking-widest uppercase text-sm md:text-base">
                {t.myGalleries} ({galleries.length})
              </span>
              <motion.span
                animate={{ rotate: isGalleriesOpen ? 180 : 0 }}
                className="text-lux-gold text-xl"
              >
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {isGalleriesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3">
                    {galleries.map((session) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onClick={() => router.push(session.type === 'vip' ? `/weddings/${session.slug}/admin` : `/weddings/${session.slug}`)}
                        className="group flex items-center justify-between p-4 bg-[#111111] hover:bg-[#1a1a1a] rounded-sm border border-white/5 cursor-pointer transition-all hover:border-lux-gold/30 shadow-sm"
                      >
                        {/* Текстовая часть */}
                        <div className="flex flex-col gap-1 pr-4 overflow-hidden">
                          <h3 className="font-cinzel font-bold text-white uppercase tracking-wider text-sm md:text-base truncate">
                            {session.title}
                          </h3>
                          <span className={`text-xs font-medium ${session.type === 'vip' ? 'text-lux-gold' : 'text-green-400'}`}>
                            {session.type === 'vip' 
                              ? (language === 'ru' ? '★ Полный VIP доступ' : language === 'en' ? '★ Full VIP access' : '★ Accès VIP complet')
                              : `✓ ${session.count} ${t.photosFound}`}
                          </span>
                        </div>
                        
                        {/* Блок с действиями (Стрелка + Крестик) */}
                        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
                          {/* СТРЕЛКА (слегка сдвигается при наведении) */}
                          <span className="text-xl text-gray-600 group-hover:text-lux-gold transition-all transform group-hover:-translate-x-1">
                            →
                          </span>
                          
                          {/* КНОПКА УДАЛЕНИЯ (Без absolute!) */}
                          <button
                            onClick={(e) => handleDeleteSession(e, session.rawKey)}
                            // На телефоне видна всегда (opacity-100), на ПК появляется при наведении (md:opacity-0 group-hover:opacity-100)
                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                            title={language === 'ru' ? 'Удалить' : 'Delete'}
                          >
                            ✕
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ОБНОВЛЕННЫЕ КНОПКИ ДЕЙСТВИЙ */}
        <div className="space-y-4 max-w-sm mx-auto">
          <button
            onClick={openLinkModal}
            className={`w-full px-6 py-4 border border-lux-gold/80 text-lux-gold font-medium text-sm md:text-base tracking-widest uppercase rounded-sm hover:bg-lux-gold hover:text-black transition-all ${galleries.length === 0 ? 'bg-lux-gold/5' : ''}`}
          >
            + {t.findWedding}
          </button>

          <button
            onClick={openWhatsApp}
            className="w-full px-6 py-4 bg-[#111111] border border-white/5 text-gray-300 font-medium text-sm md:text-base rounded-sm hover:bg-[#1a1a1a] hover:text-white transition-all flex items-center justify-center gap-3 shadow-inner"
          >
            💬 {t.whatsapp}
          </button>
        </div>

        {/* МИНИМАЛИСТИЧНАЯ ССЫЛКА ВНИЗУ */}
        <div className="mt-12 text-center">
          <button
            onClick={() => window.open("https://kurginian.pro", "_blank")}
            className="text-xs text-gray-500 hover:text-lux-gold transition-colors uppercase tracking-[0.2em] underline underline-offset-4 decoration-white/10 hover:decoration-lux-gold/50"
          >
            {t.bookShoot}
          </button>
          
          {galleries.length === 0 && (
            <p className="text-[10px] text-gray-600 mt-6 uppercase tracking-widest">{t.noGalleriesYet}</p>
          )}
        </div>
      </motion.div>
    </main>
  );
}