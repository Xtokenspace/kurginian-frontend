'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const translations = {
  fr: {
    title: "KURGINIAN",
    subtitle: "Votre galerie de mariage avec reconnaissance faciale",
    whatsapp: "Contacter le photographe",
    haveLink: "J'ai un code d'accès",
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
    haveLink: "I have an access code",
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
    haveLink: "У меня есть код доступа",
    bookShoot: "Заказать фотосъёмку",
    myGalleries: "Мои приватные галереи",
    noGalleriesYet: "Вы ещё не открывали ни одной галереи",
    whatsappMessage: "Здравствуйте, я хочу получить доступ к галерее свадьбы. Можете прислать ссылку?",
    photosFound: "фото найдено",
    actionNeeded: "Требуется поиск",
    openGallery: "Открыть"
  }
} as const;

// Интерфейс для нашей локальной базы свадеб
interface SavedGallery {
  slug: string;
  hasPhotos: boolean;
  count: number;
  isVip: boolean; // ← Новое поле
}

export default function PWAHome() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<SavedGallery[]>([]);
  const [language, setLanguage] = useState<'fr' | 'en' | 'ru'>('fr');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // НОВЫЙ СТЕЙТ ДЛЯ ГАРМОШКИ
  const [isGalleriesOpen, setIsGalleriesOpen] = useState(false); 
  
  const t = translations[language];

  // УМНЫЙ СКАНЕР LOCALSTORAGE (Теперь видит и фото, и VIP)
  useEffect(() => {
    const savedGlobalLang = localStorage.getItem('kurginian_global_lang') as 'fr' | 'en' | 'ru';
    if (savedGlobalLang) setLanguage(savedGlobalLang);

    const foundGalleries = new Map<string, SavedGallery>();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 1. ИЩЕМ СЕЛФИ-ФОТО
      if (key.startsWith('photos_')) {
        const slug = key.replace('photos_', '');
        try {
          const photos = JSON.parse(localStorage.getItem(key) || '[]');
          if (photos.length > 0) {
            // Сохраняем или обновляем запись
            const existing = foundGalleries.get(slug) || { slug, hasPhotos: false, count: 0, isVip: false };
            foundGalleries.set(slug, { ...existing, hasPhotos: true, count: photos.length });
          }
        } catch (e) {
          console.error("Ошибка парсинга фото для", slug);
        }
      }
      // 2. ИЩЕМ VIP ДОСТУП
      else if (key.startsWith('vip_code_')) {
        const slug = key.replace('vip_code_', '');
        // Если свадьба уже есть (нашли фото), просто ставим флажок isVip
        const existing = foundGalleries.get(slug) || { slug, hasPhotos: false, count: 0, isVip: false };
        foundGalleries.set(slug, { ...existing, isVip: true });
      }
    }

    setGalleries(Array.from(foundGalleries.values()));
    setIsLoaded(true);
  }, []);

  // Красивое форматирование slug: "yester-david-28-03-2026" -> "YESTER & DAVID • 28.03.2026"
  const formatSlug = (slug: string) => {
    const match = slug.match(/^([a-zA-Z-]+)-(\d{2}-\d{2}-\d{4})$/);
    if (match) {
      const names = match[1].replace(/-/g, ' & ').toUpperCase();
      const date = match[2].replace(/-/g, '.');
      return `${names} • ${date}`;
    }
    return slug.replace(/-/g, ' ').toUpperCase();
  };

  const handleLangChange = (lang: 'fr' | 'en' | 'ru') => {
    setLanguage(lang);
    localStorage.setItem('kurginian_global_lang', lang);
    setShowLangMenu(false);
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(t.whatsappMessage);
    window.open(`https://wa.me/33743300000?text=${message}`, '_blank');
  };

  const openLinkModal = () => {
    const slug = prompt(
      language === 'ru' ? 'Введите код свадьбы (Например: yester-david-28-03-2026)' :
      language === 'en' ? 'Enter wedding code (Example: yester-david-28-03-2026)' :
      'Veuillez entrer le code de la noce (Exemple: yester-david-28-03-2026)'
    );
    if (slug && slug.trim()) {
      router.push(`/weddings/${slug.trim()}`);
    }
  };

  // Не показываем ничего, пока не отсканировали память (чтобы не было мерцаний)
  if (!isLoaded) return <div className="min-h-screen bg-lux-bg" />;

  return (
    <main className="min-h-screen bg-lux-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
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
              onClick={() => setIsGalleriesOpen(!isGalleriesOpen)}
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
                    {galleries.map((gallery) => (
                      <motion.div
                        key={gallery.slug}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        // Умный роутинг: если есть VIP, кидаем в админку, если нет — в гостевую
                        onClick={() => router.push(gallery.isVip ? `/weddings/${gallery.slug}/admin` : `/weddings/${gallery.slug}`)}
                        className="bg-[#0a0a0a] border border-white/5 rounded-sm p-4 cursor-pointer hover:border-lux-gold/50 transition-all flex justify-between items-center group relative overflow-hidden"
                      >
                        {/* Золотая полоска слева для VIP */}
                        {gallery.isVip && <div className="absolute left-0 top-0 bottom-0 w-1 bg-lux-gold shadow-gold-glow" />}
                        
                        <div className={gallery.isVip ? "pl-2" : ""}>
                          <h3 className="font-cinzel text-white tracking-wider text-sm md:text-base mb-1 flex items-center gap-2">
                            {formatSlug(gallery.slug)}
                            {gallery.isVip && (
                              <span className="bg-lux-gold text-black text-[9px] px-1.5 py-0.5 rounded-sm font-bold tracking-widest">VIP</span>
                            )}
                          </h3>
                          <span className={`text-xs font-medium ${gallery.hasPhotos ? 'text-green-400' : 'text-gray-500'}`}>
                            {gallery.hasPhotos 
                              ? `✓ ${gallery.count} ${t.photosFound}` 
                              : (language === 'ru' ? 'Полный доступ' : language === 'en' ? 'Full access' : 'Accès complet')}
                          </span>
                        </div>
                        <span className="text-xl text-gray-600 group-hover:text-lux-gold transition-colors">
                          →
                        </span>
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
            + {t.haveLink}
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