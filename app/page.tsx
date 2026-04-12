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
        {/* ПРЕМИАЛЬНАЯ АНИМАЦИЯ БРЕНДА: "Легкое золотое свечение" */}
        <motion.h1 
          animate={{ 
            textShadow: [
              "0px 0px 4px rgba(212,175,55,0.05)", 
              "0px 0px 24px rgba(212,175,55,0.5)", 
              "0px 0px 4px rgba(212,175,55,0.05)"
            ]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="font-cinzel text-4xl md:text-[2.75rem] text-lux-gold mb-6 max-w-sm mx-auto w-full flex justify-between uppercase will-change-[filter]"
        >
          {t.title.split('').map((letter, index) => (
            <span key={index}>{letter === ' ' ? '\u00A0' : letter}</span>
          ))}
        </motion.h1>
        
        {/* Обновленный строгий подзаголовок */}
        <p className="font-cormorant text-xl md:text-2xl text-gray-400 mb-14 font-light leading-relaxed px-4">
          {t.subtitle}
        </p>

        {/* ПРЕМИАЛЬНЫЕ КАРТЫ ДОСТУПА (Видимы сразу) */}
        {galleries.length > 0 && (
          <div className="mb-14 text-left w-full">
            <h2 className="font-cinzel text-[10px] text-lux-gold/50 tracking-[0.3em] uppercase mb-6 pl-1">
              {t.myGalleries}
            </h2>
            
            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {galleries.map((session, idx) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => router.push(session.type === 'vip' ? `/weddings/${session.slug}/admin` : `/weddings/${session.slug}`)}
                    className="relative h-28 w-full rounded-xl overflow-hidden border border-white/5 bg-[#0a0a0a] cursor-pointer shadow-xl active:scale-[0.98] transition-all group flex items-center justify-between px-5 md:px-6"
                  >
                    {/* Фотография строго между текстом и кнопками */}
                    {session.cover && (
                      <div className="absolute top-[-7.5%] bottom-[-7.5%] left-[40%] right-[15%] md:left-[35%] md:right-[12%] z-0 overflow-hidden pointer-events-none">
                        <img 
                          src={session.cover} 
                          className="w-full h-full object-cover object-center opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700" 
                          alt="" 
                        />
                        {/* Плавное растворение краев фотографии в фон карточки */}
                        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
                        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#0a0a0a] to-transparent" />
                        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-[#0a0a0a] to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                      </div>
                    )}
                    
                    {/* Левый блок (Текст) */}
                    <div className="relative z-10 flex flex-col gap-1 max-w-[55%]">
                      <h3 className="font-cinzel font-bold text-white uppercase tracking-wider text-sm md:text-base truncate drop-shadow-md">
                        {session.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                          session.type === 'vip' ? 'bg-lux-gold text-black' : 'bg-white/10 text-lux-gold'
                        }`}>
                          {session.type === 'vip' ? 'VIP ACCESS' : 'GUEST'}
                        </span>
                        {session.type !== 'vip' && session.count && (
                          <span className="text-[10px] text-gray-400 font-mono tracking-tighter">
                            {session.count} pics
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Правый блок (Кнопки действий) */}
                    <div className="relative z-10 flex items-center gap-1 md:gap-2 flex-shrink-0">
                      
                      {/* Кнопка удаления (Крестик) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(e, session.rawKey, session.slug);
                        }}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500/80 transition-all active:scale-90 group/btn"
                        title={t.deleteLabel}
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover/btn:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Деликатный разделитель */}
                      <div className="w-[1px] h-6 bg-white/10 mx-1" />

                      {/* Стрелка перехода */}
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-lux-gold/70 group-hover:text-lux-gold transition-colors">
                        <svg className="w-5 h-5 md:w-6 md:h-6 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                      
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
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