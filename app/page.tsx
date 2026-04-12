// === ФАЙЛ: app/page.tsx (ГЛАВНАЯ СТРАНИЦА) ===
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext'; // Подключаем наш контекст

const translations = {
  fr: {
    title: "KURGINIAN",
    subtitle: "Vos souvenirs les plus précieux, accessibles en un clic.",
    whatsapp: "Contacter le photographe",
    findWedding: "Trouver un événement",
    bookShoot: "Réserver une séance photo",
    myGalleries: "Mes galeries privées",
    noGalleriesYet: "Vous n'avez encore ouvert aucune galerie",
    whatsappMessage: "Bonjour, je souhaite accéder à la galerie de mon événement. Pouvez-vous m'envoyer le lien ?",
    photosFound: "photos trouvées",
    actionNeeded: "Recherche requise",
    openGallery: "Ouvrir",
    enterCodeTitle: "Accès à la galerie",
    codePlaceholder: "Code (ex: david-maria-2026)",
    requestCode: "Demander le code au photographe",
    cancel: "Annuler",
    deleteConfirm: "Supprimer cet accès ?",
    vipAccess: "★ Accès VIP complet",
    deleteLabel: "Supprimer"
  },
  en: {
    title: "KURGINIAN",
    subtitle: "Your most precious memories, accessible in one click.",
    whatsapp: "Contact the photographer",
    findWedding: "Find an event",
    bookShoot: "Book a photoshoot",
    myGalleries: "My private galleries",
    noGalleriesYet: "You haven't opened any gallery yet",
    whatsappMessage: "Hello, I would like to access my event gallery. Could you send me the link please?",
    photosFound: "photos found",
    actionNeeded: "Action needed",
    openGallery: "Open",
    enterCodeTitle: "Gallery Access",
    codePlaceholder: "Code (ex: david-maria-2026)",
    requestCode: "Request code from photographer",
    cancel: "Cancel",
    deleteConfirm: "Delete this access?",
    vipAccess: "★ Full VIP access",
    deleteLabel: "Delete"
  },
  ru: {
    title: "KURGINIAN",
    subtitle: "Ваши самые ценные воспоминания, доступные в один клик.",
    whatsapp: "Связаться с фотографом",
    findWedding: "Найти мероприятие",
    bookShoot: "Забронировать съемку",
    myGalleries: "Мои приватные галереи",
    noGalleriesYet: "Вы еще не открывали ни одной галереи",
    whatsappMessage: "Здравствуйте, я хочу получить доступ к галерее мероприятия. Можете прислать ссылку?",
    photosFound: "фото найдено",
    actionNeeded: "Требуется поиск",
    openGallery: "Открыть",
    enterCodeTitle: "Доступ к галерее",
    codePlaceholder: "Код (например: david-maria-2026)",
    requestCode: "Запросить код у фотографа",
    cancel: "Отмена",
    deleteConfirm: "Удалить этот доступ?",
    vipAccess: "★ Полный VIP доступ",
    deleteLabel: "Удалить"
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
  const { language, setLanguage, sessions: galleries, refreshSessions } = useAppContext();
  const [showLangMenu, setShowLangMenu] = useState(false);
  // galleries теперь приходят из контекста автоматически
  
  // === НОВЫЕ СТЕЙТЫ (Оффлайн и Гармошка) ===
  const [isGalleriesOpen, setIsGalleriesOpen] = useState(false); 
  
  // === НОВЫЕ СТЕЙТЫ ДЛЯ ПРЕМИУМ МОДАЛКИ ===
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  
  // Искусственный стейт загрузки для предотвращения мерцания (Hydration Fix)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const t = translations[language];

  // === HAPTIC FEEDBACK ===
  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };


  // ФУНКЦИЯ УДАЛЕНИЯ КАРТОЧКИ
  const handleDeleteSession = (e: React.MouseEvent, rawKey: string, slug: string) => {
    e.stopPropagation();
    triggerVibration(10);
    
    if (window.confirm(t.deleteConfirm)) {
      triggerVibration([50, 50, 50]); 
      localStorage.removeItem(rawKey);
      localStorage.removeItem(`title_${slug}`); // Удаляем красивое имя
      localStorage.removeItem(`expires_${slug}`); // Удаляем дату сгорания
      refreshSessions(); // Вызываем обновление в контексте
    }
  };

  const handleLangChange = (lang: 'fr' | 'en' | 'ru') => {
    triggerVibration(10);
    setLanguage(lang); // Контекст сам обновит localStorage
    setShowLangMenu(false);
  };

  const openWhatsApp = () => {
    triggerVibration(10);
    const message = encodeURIComponent(t.whatsappMessage);
    window.open(`https://wa.me/33743300000?text=${message}`, '_blank');
  };

  const openLinkModal = () => {
    triggerVibration(10);
    setShowCodeModal(true);
  };

  const handleCodeSubmit = () => {
    if (codeInput && codeInput.trim()) {
      triggerVibration(50);
      let cleanSlug = codeInput.trim();
      // Защита: если юзер вставил ссылку целиком
      if (cleanSlug.includes('/')) {
        cleanSlug = cleanSlug.split('/').filter(Boolean).pop() || cleanSlug;
      }
      router.push(`/weddings/${cleanSlug.toLowerCase()}`);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-lux-gold/10 via-lux-bg to-lux-bg" />;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-lux-gold/10 via-lux-bg to-lux-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
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
        className="max-w-md w-full pt-10 pb-20 relative z-10"
      >
        {/* ПРЕМИАЛЬНАЯ АНИМАЦИЯ БРЕНДА (Идеальное выравнивание по ширине кнопок) */}
        <h1 className="font-cinzel text-4xl md:text-[2.75rem] text-lux-gold mb-6 max-w-sm mx-auto w-full flex justify-between uppercase">
          {t.title.split('').map((letter, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.8,
                delay: 0.1 * index,
                ease: [0.2, 0.9, 0.3, 1]
              }}
              className="inline-block will-change-[transform,opacity,filter]"
            >
              {letter === ' ' ? '\u00A0' : letter}
            </motion.span>
          ))}
        </h1>
        
        {/* Обновленный строгий подзаголовок */}
        <p className="font-cormorant text-xl md:text-2xl text-gray-400 mb-14 font-light leading-relaxed px-4">
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
                              ? t.vipAccess
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
                            onClick={(e) => handleDeleteSession(e, session.rawKey, session.slug)}
                            // На телефоне видна всегда (opacity-100), на ПК появляется при наведении (md:opacity-0 group-hover:opacity-100)
                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                            title={t.deleteLabel}
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

      {/* МОДАЛЬНОЕ ОКНО РУЧНОГО ВВОДА КОДА (PREMIUM BOTTOM SHEET) */}
        <AnimatePresence>
          {showCodeModal && (
            <>
              {/* Затемняющий фон */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] will-change-[opacity]"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  setShowCodeModal(false);
                }}
              />

              {/* Выезжающая шторка */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.25, ease: [0.2, 0.9, 0.3, 1] }}
                className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col items-center will-change-transform"
              >
                <div className="w-full max-w-md bg-[#0F0F0F] border-t border-white/10 rounded-t-3xl p-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Индикатор свайпа (Pill) */}
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8" />

                  <h3 className="font-cinzel text-xl text-lux-gold mb-6 text-center tracking-widest uppercase">
                    {t.enterCodeTitle}
                  </h3>
                  
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder={t.codePlaceholder}
                    className="w-full bg-[#111] border border-lux-gold/30 text-white px-4 py-4 rounded-sm text-center text-sm md:text-base focus:outline-none focus:border-lux-gold transition-colors mb-6 shadow-inner"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                  />

                  {/* Кнопка WhatsApp (замена эмодзи на строгий векторный SVG) */}
                  <button
                    onClick={() => {
                       if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                       openWhatsApp();
                    }}
                    className="w-full mb-8 text-xs text-gray-400 hover:text-lux-gold transition-colors flex items-center justify-center gap-2 group"
                  >
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-lux-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                    <span className="underline underline-offset-4 decoration-white/10 group-hover:decoration-lux-gold/50 transition-colors uppercase tracking-widest">{t.requestCode}</span>
                  </button>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                        setShowCodeModal(false);
                      }}
                      className="flex-1 px-4 py-4 text-gray-400 hover:text-white transition-colors uppercase text-xs md:text-sm tracking-wider border border-white/5 rounded-sm hover:bg-white/5"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                        handleCodeSubmit();
                      }}
                      disabled={!codeInput.trim()}
                      className="flex-1 px-4 py-4 bg-lux-gold text-black font-bold hover:bg-white transition-colors rounded-sm uppercase text-xs md:text-sm tracking-wider disabled:opacity-50 shadow-gold-glow flex items-center justify-center gap-2"
                    >
                      {t.openGallery}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
    </main>
  );
}