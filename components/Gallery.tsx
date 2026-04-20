'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAppContext, PrintSize, PRINT_PRICES } from '@/context/AppContext';
import { Blurhash } from 'react-blurhash';
import CollageCreator from './CollageCreator'; // <-- ИМПОРТ НОВОГО КОМПОНЕНТА

// --- НОВЫЕ ИНТЕРФЕЙСЫ ДЛЯ ИИ ---
export interface GuestCluster {
  avatar_filename: string;
  bbox: number[];
  photo_count: number;
}

// --- ИНТЕРФЕЙСЫ ---
export interface MatchedPhoto {
  filename: string;
  width: number;
  height: number;
  blurhash?: string;
  cluster_ids?: string[];
  urls: {
    web: string;
    thumb: string;
  };
}

interface GalleryProps {
  photos: MatchedPhoto[];
  slug: string;
  expiresAt?: string | null;
  isVip?: boolean;
  currentLanguage?: 'fr' | 'en' | 'ru';
  guestClusters?: Record<string, GuestCluster>;

  // === УМНОЕ УПРАВЛЕНИЕ LIGHTBOX И ФИЛЬТРОМ ИЗ АДМИНКИ ===
  isLightboxOpen?: boolean;
  setIsLightboxOpen?: (open: boolean) => void;
  selectedGuestId?: string | null;
  setSelectedGuestId?: (id: string | null) => void;
}

// --- ПЕРЕВОДЫ ДЛЯ LIGHTBOX И SMART SEARCH ---
const translations = {
  fr: { 
    download: "Télécharger", share: "Partager", saveAll: "Enregistrer mes photos", copied: "Lien copié !", shareText: "Regardez cette magnifique photo sur KURGINIAN Premium Gallery ✨",
    expiresText: "Votre abonnement premium est actif jusqu'au",
    feedbackTitle: "Merci !", feedbackText: "Vos émotions sont précieuses. Partagez votre avis sur Instagram.", instagramBtn: "Écrire sur Instagram",
    noPhotos: "Aucune photo trouvée.",
    copyPrompt: "Copiez ce lien :",
    shareTitle: "Mes photos KURGINIAN",
    saveToGallery: "Enregistrer dans la pellicule",
    guests: "Invités",
    foundForGuest: "photos trouvées",
    resetFilter: "✕ Réinitialiser",
    downloadGuest: "Télécharger la sélection",
    whoIsHere: "Qui est sur la photo ?",
    closeScanner: "✕ Fermer",
    shareGuest: "Partager la sélection",
    shareGuestText: "Regardez ma sélection de photos personnelle de l'événement ! ✨",
    // --- НОВЫЕ ТЕКСТЫ ДЛЯ МУЛЬТИВЫБОРА ---
    select: "Sélectionner",
    selected: "sélectionné(s)",
    cancel: "Annuler",
    actions: "Actions avec l'image",
    createCollage: "Créer L'Édition",
    // --- ТЕКСТЫ ДЛЯ КОРЗИНЫ И ПЕЧАТИ ---
    orderPrints: "Commander tirages",
    cartTitle: "Votre Commande",
    freeShipping: "Livraison gratuite",
    addMoreForFree: "Ajoutez {amount}€ pour la livraison gratuite en France 🇫🇷",
    checkout: "Passer à la caisse",
    emptyCart: "Votre panier est vide",
    total: "Total :",
    size: "Format"
  },
  en: {
    download: "Download", share: "Share", saveAll: "Save my photos", copied: "Link copied!", shareText: "Look at this beautiful photo on KURGINIAN Premium Gallery ✨",
    expiresText: "Your premium subscription is active until",
    feedbackTitle: "Thank you!", feedbackText: "Your emotions are precious. Share your review on Instagram.", instagramBtn: "Write on Instagram",
    noPhotos: "No photos found.",
    copyPrompt: "Copy this link:",
    shareTitle: "My KURGINIAN photos",
    saveToGallery: "Save to Camera Roll",
    guests: "Guests",
    foundForGuest: "photos found",
    resetFilter: "✕ Reset Filter",
    downloadGuest: "Download selection",
    whoIsHere: "Who is here?",
    closeScanner: "✕ Close",
    shareGuest: "Share collection",
    shareGuestText: "Check out my personal photo collection from the event! ✨",
    // --- НОВЫЕ ТЕКСТЫ ДЛЯ МУЛЬТИВЫБОРА ---
    select: "Select",
    selected: "selected",
    cancel: "Cancel",
    actions: "Image Actions",
    createCollage: "Create L'Édition",
    // --- ТЕКСТЫ ДЛЯ КОРЗИНЫ И ПЕЧАТИ ---
    orderPrints: "Order prints",
    cartTitle: "Your Order",
    freeShipping: "Free shipping",
    addMoreForFree: "Add {amount}€ for free shipping in France 🇫🇷",
    checkout: "Checkout securely",
    emptyCart: "Your cart is empty",
    total: "Total:",
    size: "Size"
  },
  ru: {
    download: "Скачать", share: "Поделиться", saveAll: "Сохранить мои фото", copied: "Ссылка скопирована!", shareText: "Посмотрите на это великолепное фото в KURGINIAN Premium Gallery ✨",
    expiresText: "Ваша премиум-подписка активна до",
    feedbackTitle: "Спасибо!", feedbackText: "Ваши эмоции бесценны. Поделитесь отзывом в Instagram.", instagramBtn: "Написать в Instagram",
    noPhotos: "Фотографии не найдены.",
    copyPrompt: "Скопируйте ссылку:",
    shareTitle: "Мои фото KURGINIAN",
    saveToGallery: "Сохранить в фотопленку",
    guests: "Гости",
    foundForGuest: "фото найдено",
    resetFilter: "✕ Сбросить фильтр",
    downloadGuest: "Скачать архив гостя",
    whoIsHere: "Кто на фото?",
    closeScanner: "✕ Скрыть",
    shareGuest: "Поделиться подборкой",
    shareGuestText: "Посмотрите мою персональную подборку фотографий с мероприятия! ✨",
    // --- НОВЫЕ ТЕКСТЫ ДЛЯ МУЛЬТИВЫБОРА ---
    select: "Выбрать",
    selected: "выбрано",
    cancel: "Отмена",
    actions: "Действия с фото",
    createCollage: "Создать L'Édition",
    // --- ТЕКСТЫ ДЛЯ КОРЗИНЫ И ПЕЧАТИ ---
    orderPrints: "Заказать печать",
    cartTitle: "Ваш заказ",
    freeShipping: "Бесплатная доставка",
    addMoreForFree: "Добавьте на {amount}€ для бесплатной доставки по Франции 🇫🇷",
    checkout: "Оплатить заказ",
    emptyCart: "Ваша корзина пуста",
    total: "Итого:",
    size: "Формат"
  }
} as const;

// --- ВАРИАНТЫ АНИМАЦИИ ---
const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, 
    },
  },
};

const brickVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  },
};

// --- КОМПОНЕНТ АВАТАРА ГОСТЯ (CSS МАГИЯ КРОПА ЛИЦА) ---
function FaceBubble({ cluster, photos, isSelected, onClick }: { cluster: GuestCluster, photos: MatchedPhoto[], isSelected: boolean, onClick: () => void }) {
  const photo = photos.find(p => p.filename === cluster.avatar_filename);
  if (!photo) return null;

  const [x1, y1, x2, y2] = cluster.bbox;
  const faceWidth = x2 - x1;
  const faceHeight = y2 - y1;
  
  // 1. Смещаем центр лица чуть выше (0.4 вместо 0.5), чтобы глаза были по центру, а не нос
  const cx = x1 + faceWidth / 2;
  const cy = y1 + faceHeight * 0.4;
  
  // 2. Коэффициент запаса (1.8 = 180%). Добавляем «воздух», чтобы влезли волосы, подбородок и шея.
  const paddingFactor = 1.8;
  const targetSize = Math.max(faceWidth, faceHeight) * paddingFactor;

  // 3. Вычисляем, во сколько раз оригинальная картинка больше нашего целевого "квадрата лица"
  const widthPercent = (photo.width / targetSize) * 100;
  const heightPercent = (photo.height / targetSize) * 100;

  // 4. Вычисляем точные проценты для сдвига картинки
  const transX = (cx / photo.width) * 100;
  const transY = (cy / photo.height) * 100;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden cursor-pointer transition-all duration-300 
        ${isSelected ? 'ring-2 ring-lux-gold shadow-gold-glow scale-110' : 'ring-1 ring-white/20 opacity-70 hover:opacity-100'}`}
    >
      {/* Используем абсолютное позиционирование с отрицательным сдвигом для безупречного центрирования */}
      <img 
        src={photo.urls.thumb} 
        alt="Guest"
        className="absolute max-w-none pointer-events-none select-none"
        style={{
          width: `${widthPercent}%`,
          height: `${heightPercent}%`,
          left: '50%',
          top: '50%',
          transform: `translate(-${transX}%, -${transY}%)`
        }}
      />
    </motion.button>
  );
}

// --- КОМПОНЕНТ ОДНОГО ФОТО ---
function PhotoRowItem({ 
  photo, index, onOpen, isSelectionMode, isSelected, onToggleSelect, onLongPress 
}: { 
  photo: MatchedPhoto; index: number; onOpen: () => void; 
  isSelectionMode: boolean; isSelected: boolean; onToggleSelect: (filename: string) => void; onLongPress: (index: number) => void;
}) {
  const flexGrow = photo.width / photo.height;
  const [isLoaded, setIsLoaded] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  // Логика кастомного 3D-Touch
  const startPress = () => {
    if (isSelectionMode) return; // Если уже выбираем, долгий тап не нужен
    pressTimer.current = setTimeout(() => {
      onLongPress(index);
    }, 400); // 400мс удержания = 3D Touch
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <motion.div
      layout 
      id={`photo-card-${index}`}
      variants={brickVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.015, zIndex: 1 }}
      whileTap={{ scale: 0.985 }}
      // --- БЛОКИРУЕМ СИСТЕМНОЕ МЕНЮ И СЛУШАЕМ ПАЛЕЦ ---
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onClick={() => {
        // В обычном режиме клик в любое место открывает фото.
        // В режиме выбора родительский клик отключается (работают 50/50 зоны внутри).
        if (!isSelectionMode) onOpen();
      }}
      className={`relative overflow-hidden group transition-colors shadow-lg active:shadow-gold-glow cursor-pointer bg-lux-card ${
        isSelected ? 'border-2 border-lux-gold scale-95' : 'border border-lux-gold/10 hover:border-lux-gold/60'
      }`}
      style={{
        flexGrow: flexGrow,
        // 💎 ГЕНИАЛЬНЫЙ CSS HACK: Адаптивная высота (Mobile: ~120px, Tablet: 20vw, Desktop: 250px)
        flexBasis: `calc(clamp(120px, 20vw, 250px) * ${flexGrow})`,
        aspectRatio: `${photo.width} / ${photo.height}`,
      }}
    >
      {/* ПРЕМИАЛЬНЫЙ BLURHASH ИЛИ СКЕЛЕТОН (Плавный CSS-кроссфейд) */}
      <div 
        className={`absolute inset-0 z-10 overflow-hidden bg-[#0a0a0a] transition-opacity duration-700 ease-out ${
          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {photo.blurhash ? (
          <Blurhash hash={photo.blurhash} width="100%" height="100%" resolutionX={32} resolutionY={32} punch={1} />
        ) : (
          <motion.div 
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
          />
        )}
      </div>

      <Image
        src={photo.urls.thumb}
        alt={photo.filename}
        fill
        unoptimized
        priority={index < 6}
        sizes="(max-width: 768px) 100vw, 50vw"
        onLoad={() => setIsLoaded(true)}
        className={`object-cover transition-all duration-[800ms] ease-out pointer-events-none ${
          isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md scale-105'
        } ${isSelected ? 'opacity-80' : 'group-hover:scale-105'}`}
      />
      
      {/* === ИНТЕРФЕЙС МУЛЬТИВЫБОРА (Apple 50/50 Split Zones) === */}
      <AnimatePresence>
        {isSelectionMode && (
          <>
            {/* ВЕРХНЯЯ ПОЛОВИНА = ОТКРЫТЬ ФОТО */}
            <div 
              className="absolute top-0 left-0 right-0 h-1/2 z-30 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:text-lux-gold hover:border-lux-gold/50 transition-colors shadow-lg"
              >
                <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </motion.div>
            </div>

            {/* НИЖНЯЯ ПОЛОВИНА = ВЫБРАТЬ ФОТО */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1/2 z-30 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onToggleSelect(photo.filename); }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.2 }}
                className="absolute bottom-3 right-3 pointer-events-none"
              >
                <motion.div 
                  animate={{ 
                    backgroundColor: isSelected ? '#D4AF37' : 'rgba(0,0,0,0.3)',
                    borderColor: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                    scale: isSelected ? 1.1 : 1
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center backdrop-blur-sm shadow-lg"
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.svg 
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none" />
    </motion.div>
  );
}

// --- ОСНОВНАЯ ГАЛЕРЕЯ ---
export default function Gallery({ 
  photos, 
  slug, 
  expiresAt, 
  isVip = false, 
  currentLanguage, 
  guestClusters,
  // Новые пропсы из админки (контролируемые)
  isLightboxOpen = false,
  setIsLightboxOpen,
  selectedGuestId: externalSelectedGuestId,
  setSelectedGuestId: externalSetSelectedGuestId
}: GalleryProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [showLightboxGuests, setShowLightboxGuests] = useState(false);
  const lastTapRef = useRef<number>(0);
  const [panBounds, setPanBounds] = useState({ x: 1000, y: 1000 });

  // --- СТЕЙТЫ SMART SEARCH (ИИ ГОСТЕЙ) ---
  const [showGuests, setShowGuests] = useState(false);
  
  // Контролируемый selectedGuestId из админки
  const [internalSelectedGuestId, setInternalSelectedGuestId] = useState<string | null>(null);

  // Синхронизируем пропс из админки с внутренним состоянием
  useEffect(() => {
    setInternalSelectedGuestId(externalSelectedGuestId ?? null);
  }, [externalSelectedGuestId]);

  const selectedGuestId = internalSelectedGuestId;
  const setSelectedGuestId = (id: string | null) => {
    // Если включаем фильтр впервые — пушим состояние в историю, чтобы кнопка "Назад" не выкидывала из проекта
    if (id !== null && internalSelectedGuestId === null) {
      const params = new URLSearchParams(window.location.search);
      // Не пушим, если зашли по прямой магической ссылке (чтобы не сломать стартовую историю)
      if (!params.get('guest')) {
        window.history.pushState({ guestFilter: true }, "");
      }
    }
    setInternalSelectedGuestId(id);
    if (externalSetSelectedGuestId) externalSetSelectedGuestId(id);
  };

  // --- СТЕЙТЫ МУЛЬТИВЫБОРА И 3D TOUCH ---
  const [longPressedIndex, setLongPressedIndex] = useState<number | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionIntent, setSelectionIntent] = useState<'general' | 'print'>('general');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCollageCreator, setShowCollageCreator] = useState(false); // <-- СТЕЙТ КОЛЛАЖА
  const [generatedCollageUrl, setGeneratedCollageUrl] = useState<string | null>(null); // <-- СТЕЙТ ПРЕВЬЮ КОЛЛАЖА

  const handleLongPress = (index: number) => {
    triggerVibration([15, 30]); // Мягкий "тук-тук" при срабатывании 3D Touch
    setLongPressedIndex(index);
  };

  const togglePhotoSelection = (filename: string) => {
    triggerVibration(10);
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(filename)) newSelection.delete(filename);
    else newSelection.add(filename);
    setSelectedPhotos(newSelection);
  };

  const closeSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedPhotos(new Set());
  };

  // --- ФИЛЬТРАЦИЯ ФОТОГРАФИЙ ПО ВЫБРАННОМУ ГОСТЮ ---
  const filteredPhotos = selectedGuestId 
    ? photos.filter(p => p.cluster_ids?.includes(selectedGuestId))
    : photos;

  // ФУНКЦИЯ ШАРИНГА ПОДБОРКИ
  const handleShareGuest = async () => {
    triggerVibration(50);
    trackAction('share'); 
    // Генерируем магическую ссылку, которая сразу откроет этого гостя
    const shareLink = `${window.location.origin}/weddings/${slug}?guest=${selectedGuestId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KURGINIAN Premium',
          text: t.shareGuestText, 
          url: shareLink,
        });
        return; 
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
        return; 
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      prompt(t.copyPrompt, shareLink);
    }
  };

  useEffect(() => {
    // Вычисляем 80% экрана для комфортного панорамирования без улетания в бесконечность
    setPanBounds({ x: window.innerWidth * 0.8, y: window.innerHeight * 0.8 });
    
    // Перехват команд из глобального меню с умной историей
    const handleOpenCart = () => {
      if (!isCartOpen) {
        window.history.pushState({ cart: true }, "");
        setIsCartOpen(true);
      }
    };
    
    const handleStartSelection = () => {
      if (!isSelectionMode) {
        window.history.pushState({ selection: true }, "");
        setIsSelectionMode(true);
        setSelectionIntent('print'); // Гость пришел из меню печати
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Поднимаем гостя наверх к фото
      }
    };
    
    window.addEventListener('open-print-cart', handleOpenCart);
    window.addEventListener('start-print-selection', handleStartSelection);
    
    return () => {
      window.removeEventListener('open-print-cart', handleOpenCart);
      window.removeEventListener('start-print-selection', handleStartSelection);
    };
  }, [isCartOpen, isSelectionMode]);

// УМНОЕ СКРЫТИЕ ИНТЕРФЕЙСА (Передаем стейт в ClientPage)
  useEffect(() => {
    if (setIsLightboxOpen) {
      setIsLightboxOpen(selectedIndex !== null || isSelectionMode || isCartOpen || showCollageCreator || generatedCollageUrl !== null);
    }
  }, [selectedIndex, isSelectionMode, isCartOpen, showCollageCreator, generatedCollageUrl, setIsLightboxOpen]);

  // Безопасное закрытие с откатом истории
  const closeSelectionSafe = () => {
    if (window.history.state?.selection) window.history.back();
    else {
      setIsSelectionMode(false);
      setSelectedPhotos(new Set());
    }
  };

  const closeCartSafe = () => {
    if (window.history.state?.cart) window.history.back();
    else setIsCartOpen(false);
  };

  // БЛОКИРОВКА СКРОЛЛА (Ghost Scrolling Fix)
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedIndex]);
  
  // === РЕФЫ ДЛЯ МУЛЬТИТАЧА (PINCH-TO-ZOOM) ===
  const initialTouchDistance = useRef<number | null>(null);
  const currentScale = useRef<number>(1);
  
// Стейты уведомлений
  const [showToast, setShowToast] = useState(false);
  const [showCartToast, setShowCartToast] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Стейты умной печати (Smart Print UX)
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [preferredSize, setPreferredSize] = useState<PrintSize | null>(null);
  const [customCartMsg, setCustomCartMsg] = useState<string | null>(null);
  const [showPrintSuccess, setShowPrintSuccess] = useState<string | null>(null); // <-- ПРЕМИУМ УВЕДОМЛЕНИЕ О ПЕЧАТИ

  useEffect(() => {
    // При загрузке галереи проверяем, выбирал ли гость размер ранее
    const savedSize = localStorage.getItem('kurginian_pref_size') as PrintSize;
    if (savedSize) setPreferredSize(savedSize);
  }, []);

  // Получаем язык и корзину из глобального контекста
  const { language: contextLanguage, getCartForSlug, addToCart, updateCartItem, removeFromCart, clearCart } = useAppContext();
  const cart = getCartForSlug(slug);
  const FREE_SHIPPING_THRESHOLD = 80;

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const progressPercent = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Если язык пришел сверху (prop), используем его, иначе — глобальный
  const language = currentLanguage || contextLanguage;
  const t = translations[language];

  // МАГИЧЕСКАЯ ССЫЛКА И ПРОВЕРКА ОПЛАТЫ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      // 1. Умный поиск гостей
      const guestParam = params.get('guest');
      if (guestParam && guestClusters && guestClusters[guestParam]) {
        setSelectedGuestId(guestParam);
      }

      // 2. Успешная оплата заказа печати
      const printSuccess = params.get('print_success');
      if (printSuccess) {
        if (clearCart) clearCart(slug); // Безопасная очистка корзины
        triggerVibration([50, 100, 50]); // Радостная вибрация
        
        // Вызываем премиальное модальное окно вместо системного alert
        setTimeout(() => setShowPrintSuccess(printSuccess), 500);
        
        // Очищаем URL, чтобы окно не вылезало повторно при обновлении страницы
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [guestClusters, clearCart, language, slug]);

  // === HAPTIC FEEDBACK (Тактильность) ===
  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  // === ТИХАЯ АНАЛИТИКА (B2B Dashboard) ===
  const trackAction = (action: 'download' | 'share' | 'save_all', filename?: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      fetch(`${apiUrl}/api/weddings/${slug}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, filename }),
        keepalive: true, 
      }).catch(() => {}); 
    } catch (e) {}
  };

  // Функция скачивания
  const handleDownload = async (filename: string, url: string) => {
    triggerVibration(50);
    trackAction('download', filename); 
    try {
      const fetchUrl = `${url}?download=${Date.now()}`;
      const response = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' });
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      // --- УМНЫЙ ПОКАЗ ОКНА ОТЗЫВОВ (1 раз в сутки) ---
      setTimeout(() => {
        const lastShown = localStorage.getItem('kurginian_feedback_shown');
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; 

        if (!lastShown || now - parseInt(lastShown) > oneDay) {
          setShowFeedbackModal(true);
          localStorage.setItem('kurginian_feedback_shown', now.toString());
        }
      }, 1500); 

    } catch (err) {
      console.error(err);
    }
  };

  // Функция "Поделиться" (Native Web Share + Fallback)
  const handleShare = async (filename: string) => {
    triggerVibration(50);
    trackAction('share', filename); 
    const shareLink = `${window.location.origin}/weddings/${slug}/photo/${filename}?mode=share`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KURGINIAN Premium',
          text: t.shareText, 
          url: shareLink,
        });
        return; 
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
        return; 
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      prompt(t.copyPrompt, shareLink);
    }
  };

  // === УЛУЧШЕННАЯ ФУНКЦИЯ СОХРАНЕНИЯ С PROGRESS BAR ===
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const wakeLockRef = useRef<any>(null); // Хранилище блокировки экрана

  // ИСПРАВЛЕНО: Защита WakeLock от сворачивания браузера (iOS/Android сбрасывают его).
  // Если юзер ответил в WhatsApp и вернулся, мы заново запрещаем экрану гаснуть.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isSaving && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn("Wake Lock re-acquire failed:", err);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSaving]);

  // === SMART SCROLL-TO-TOP PILL ===
  const [showScrollTop, setShowScrollTop] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Показываем кнопку, если мы ушли вниз больше чем на 1.5 экрана И скроллим вверх
      if (currentScrollY > window.innerHeight * 1.5 && currentScrollY < lastScrollY.current) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    triggerVibration(10);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowScrollTop(false);
  };

  // ПРИНИМАЕТ targetPhotos, чтобы можно было скачать либо всё, либо только фото гостя
  const handleSaveAll = async (targetPhotos: MatchedPhoto[]) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveProgress(0);
    triggerVibration([50, 30, 50]);
    trackAction('save_all');

    // --- WAKE LOCK API (Запрет на выключение экрана) ---
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.warn("Wake Lock failed:", err);
    }

    // 🔥 ИМИТАЦИЯ ПРОГРЕССА (Smart UX)
    const progressInterval = setInterval(() => {
      setSaveProgress((prev) => {
        const step = Math.floor(Math.random() * 10) + 5; 
        const next = prev + step;
        return next > 90 ? 90 : next; 
      });
    }, 300);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/generate-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: targetPhotos.map(p => p.filename) })
      });

      if (!response.ok) throw new Error("ZIP generation failed");
      const data = await response.json();
      if (!data.url) throw new Error("No URL in response");

      clearInterval(progressInterval);
      setSaveProgress(100); // 100% успех

      setTimeout(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = data.url;
        } else {
          const link = document.createElement('a');
          link.href = data.url;
          link.download = `KURGINIAN_${slug.toUpperCase()}_PHOTOS.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setIsSaving(false);
        setSaveProgress(0);
        if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
      clearInterval(progressInterval);
      console.error("Save all failed:", err);
      const msg = language === 'ru' 
        ? 'Ошибка скачивания архива. Попробуйте позже или скачайте фото по одному.' 
        : language === 'en' 
        ? 'Archive download error. Please try again or download photos individually.' 
        : 'Erreur de téléchargement. Veuillez réessayer ou télécharger les photos une par une.';
      alert(msg);
      setIsSaving(false);
      setSaveProgress(0);
    }
  };

  // === HISTORY API: Умный перехват кнопки Назад ===
  const openLightbox = (index: number) => {
    triggerVibration(10); 
    setZoomScale(1);
    setShowLightboxGuests(false);
    
    window.history.pushState({ lightbox: true }, "");
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    
    // SMART SCROLL: Возвращаем фокус на фото в сетке
    if (selectedIndex !== null) {
      const currentIdx = selectedIndex;
      setTimeout(() => {
        const element = document.getElementById(`photo-card-${currentIdx}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }

    setSelectedIndex(null);
    setZoomScale(1);
    
    if (window.history.state && window.history.state.lightbox) {
      window.history.back();
    }
  };

  // Умный перехват кнопки "Назад" браузера (Lightbox + Смарт-фильтр гостей + Cart + Selection)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // 1. Проверяем Lightbox
      if (selectedIndex !== null && !(e.state && e.state.lightbox)) {
        setSelectedIndex(null);
        setZoomScale(1);
      }

      // 2. Проверяем Корзину
      if (isCartOpen && !(e.state && e.state.cart)) {
        setIsCartOpen(false);
      }

      // 3. Проверяем Режим выбора
      if (isSelectionMode && !(e.state && e.state.selection)) {
        setIsSelectionMode(false);
        setSelectedPhotos(new Set());
      }
      
      // 3.5 Проверяем Коллаж
      if (showCollageCreator && !(e.state && e.state.collage)) {
        setShowCollageCreator(false);
      }

      // 3.6 Проверяем Превью Готового Коллажа
      if (generatedCollageUrl && !(e.state && e.state.collagePreview)) {
        setGeneratedCollageUrl(null);
      }

      // 4. Проверяем фильтр гостя
      if (internalSelectedGuestId !== null && !(e.state && (e.state.guestFilter || e.state.lightbox || e.state.cart || e.state.selection))) {
        setInternalSelectedGuestId(null);
        if (externalSetSelectedGuestId) externalSetSelectedGuestId(null);
        if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedIndex, internalSelectedGuestId, isCartOpen, isSelectionMode, externalSetSelectedGuestId, showCollageCreator, generatedCollageUrl]);

  // Обработка клавиатуры и свайпов
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredPhotos.length, zoomScale]);

  const goToNext = () => {
    if (zoomScale > 1) setZoomScale(1); // Сброс зума при перелистывании
    setShowLightboxGuests(false); // Скрываем сканер при перелистывании
    triggerVibration(10); 
    setSelectedIndex((prev) => (prev! + 1) % filteredPhotos.length);
  };
  
  const goToPrev = () => {
    if (zoomScale > 1) setZoomScale(1);
    setShowLightboxGuests(false); // Скрываем сканер при перелистывании
    triggerVibration(10); 
    setSelectedIndex((prev) => (prev! - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  // Функция переключения зума (Double Tap)
  const toggleZoom = () => {
    triggerVibration(15);
    setZoomScale(prev => (prev > 1 ? 1 : 2.5));
  };

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-20 bg-lux-card border border-lux-gold/20 rounded-sm">
        <p className="font-cinzel text-lux-gold/60 uppercase tracking-widest">
          {t.noPhotos}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* СЕТКА ФОТОГРАФИЙ */}
      <Suspense fallback={<div className="min-h-screen bg-lux-bg" />}>
        
        {/* === ПРЕМИУМ ACTION HUB (Ultra-Wide Console) === */}
        <div className="flex flex-col items-center mb-12 px-4">
          {!selectedGuestId && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl flex flex-col gap-4"
            >
              {/* Ряд 1: Главный Hero-Action (Широкая кнопка скачивания) */}
              <button
                onClick={() => handleSaveAll(photos)}
                disabled={isSaving}
                className={`w-full py-5 md:py-6 font-black uppercase tracking-[0.25em] text-[10px] md:text-xs rounded-[1.5rem] flex items-center justify-center transition-all duration-700 relative overflow-hidden group ${
                  isSaving 
                    ? 'bg-[#0a0a0a] text-lux-gold border border-lux-gold/20' 
                    : 'bg-lux-gold text-black shadow-[0_20px_60px_rgba(212,175,55,0.15)] hover:shadow-[0_25px_80px_rgba(212,175,55,0.35)] hover:scale-[1.01] active:scale-[0.98]'
                }`}
              >
                {isSaving && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${saveProgress}%` }}
                    className="absolute left-0 top-0 bottom-0 bg-white/30 z-0"
                  />
                )}
                <div className="relative z-10 flex items-center gap-4">
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <svg className="w-6 h-6 group-hover:translate-y-1 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                  <span className="md:text-sm">
                    {isSaving 
                      ? `${language === 'ru' ? 'СОЗДАНИЕ АРХИВА' : language === 'fr' ? 'CRÉATION ZIP' : 'PREPARING ZIP'} ${saveProgress}%` 
                      : t.saveAll}
                  </span>
                </div>
              </button>

              {/* Ряд 2: Вспомогательные интеллектуальные сервисы */}
              <div className="flex gap-4 w-full">
                {/* Кнопка AI FACE SCAN (Интеллектуальные гости) */}
                {isVip && guestClusters && Object.keys(guestClusters).length > 0 && (
                  <button
                    onClick={() => { triggerVibration(15); setShowGuests(!showGuests); }}
                    className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.25rem] font-bold uppercase tracking-widest text-[9px] md:text-[11px] transition-all duration-500 border backdrop-blur-xl group ${
                      showGuests 
                        ? 'bg-lux-gold text-black border-transparent shadow-gold-glow' 
                        : 'bg-white/5 text-lux-gold border-lux-gold/20 hover:bg-lux-gold hover:text-black hover:border-transparent'
                    }`}
                  >
                    <div className="relative">
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                      </svg>
                    </div>
                    {t.guests}
                  </button>
                )}

                {/* Кнопка ПРЯМАЯ ПЕЧАТЬ (Apple Commerce) */}
                <button
                  onClick={() => {
                    triggerVibration(10);
                    if (cart.length > 0) setIsCartOpen(true);
                    else {
                      window.history.pushState({ selection: true }, "");
                      setIsSelectionMode(true);
                      setSelectionIntent('print');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-3 py-5 bg-white/5 backdrop-blur-xl border border-lux-gold/20 text-lux-gold rounded-[1.25rem] font-bold uppercase tracking-widest text-[9px] md:text-[11px] hover:bg-lux-gold hover:text-black transition-all duration-500 active:scale-95 relative group"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  {t.orderPrints}
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-lux-gold text-black text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.6)] animate-pulse">
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* === КАРУСЕЛЬ ГОСТЕЙ (Выезжает по клику) === */}
          <AnimatePresence>
            {showGuests && !selectedGuestId && guestClusters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full max-w-2xl overflow-hidden relative group"
              >
                {/* Левая стрелка (Появляется при наведении на ПК) */}
                <button 
                  onClick={() => document.getElementById('main-guest-carousel')?.scrollBy({ left: -300, behavior: 'smooth' })}
                  className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white hover:text-lux-gold hover:border-lux-gold/50 transition-all opacity-0 group-hover:opacity-100 shadow-lg ml-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                <div 
                  id="main-guest-carousel"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const el = e.currentTarget;
                    el.dataset.isDragging = 'true';
                    el.dataset.dragged = 'false';
                    el.dataset.startX = e.pageX.toString();
                    el.dataset.scrollLeft = el.scrollLeft.toString();
                  }}
                  onPointerMove={(e) => {
                    const el = e.currentTarget;
                    if (el.dataset.isDragging !== 'true') return;
                    e.preventDefault();
                    const startX = parseFloat(el.dataset.startX || '0');
                    const scrollLeft = parseFloat(el.dataset.scrollLeft || '0');
                    const walk = (e.pageX - startX) * 1.5; // Ускоритель тяги мышью
                    el.scrollLeft = scrollLeft - walk;
                    if (Math.abs(walk) > 10) el.dataset.dragged = 'true'; // Защита от ложного клика
                  }}
                  onPointerUp={(e) => { e.currentTarget.dataset.isDragging = 'false'; }}
                  onPointerLeave={(e) => { e.currentTarget.dataset.isDragging = 'false'; }}
                  onClickCapture={(e) => {
                    // Перехватываем клик, если пользователь просто тащил ленту мышкой
                    if (e.currentTarget.dataset.dragged === 'true') {
                      e.stopPropagation();
                      e.preventDefault();
                      e.currentTarget.dataset.dragged = 'false';
                    }
                  }}
                  onWheel={(e) => {
                    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
                    if (e.deltaY !== 0) e.currentTarget.scrollBy({ left: e.deltaY > 0 ? 250 : -250, behavior: 'smooth' });
                  }}
                  style={{ WebkitOverflowScrolling: 'touch' }}
                  className="flex gap-4 overflow-x-auto py-4 px-2 items-center justify-start touch-pan-x overscroll-contain will-change-scroll cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative px-10 md:px-4"
                >
                  {Object.entries(guestClusters).map(([id, cluster]) => (
                    <div key={id} className="shrink-0 pointer-events-auto">
                      <FaceBubble 
                        cluster={cluster} 
                        photos={photos} 
                        isSelected={selectedGuestId === id} 
                        onClick={() => { triggerVibration(30); setSelectedGuestId(id); setShowGuests(false); }} 
                      />
                    </div>
                  ))}
                </div>

                {/* Правая стрелка (Появляется при наведении на ПК) */}
                <button 
                  onClick={() => document.getElementById('main-guest-carousel')?.scrollBy({ left: 300, behavior: 'smooth' })}
                  className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white hover:text-lux-gold hover:border-lux-gold/50 transition-all opacity-0 group-hover:opacity-100 shadow-lg mr-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* === ПАНЕЛЬ АКТИВНОГО ФИЛЬТРА (Показывается когда выбран гость) === */}
          <AnimatePresence>
            {selectedGuestId && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                // --- flick-to-reset physics ---
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.6, bottom: 0.05 }}
                onDragEnd={(e, info) => {
                  if (info.offset.y < -60) { // Свайп вверх — сброс фильтра
                    triggerVibration(10);
                    if (window.history.state && window.history.state.guestFilter) {
                      window.history.back();
                    } else {
                      setSelectedGuestId(null);
                    }
                  }
                }}
                className="w-full max-w-sm bg-[#111] border border-lux-gold/30 rounded-xl p-5 flex flex-col items-center gap-5 shadow-lg relative overflow-hidden touch-none"
              >
                {/* Подсказка свайпа вверх */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/5 rounded-full" />
                {/* Шапка с аватаркой и счетчиком */}
                <div className="flex items-center gap-5 w-full">
                  <FaceBubble cluster={guestClusters![selectedGuestId]} photos={photos} isSelected={true} onClick={() => {}} />
                  <div className="flex flex-col">
                    <span className="text-lux-gold font-cinzel text-2xl font-bold leading-none">{filteredPhotos.length}</span>
                    <span className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest mt-1">{t.foundForGuest}</span>
                  </div>
                </div>

                {/* === БЛОК КНОПОК (ПРЕМИАЛЬНАЯ КОМПОНОВКА) === */}
                <div className="flex flex-col w-full gap-2">
                  
                  {/* Главная кнопка: Скачать архив */}
                  <button
                    onClick={() => handleSaveAll(filteredPhotos)}
                    disabled={isSaving}
                    className={`w-full py-3.5 font-bold uppercase tracking-widest text-[10px] md:text-xs rounded-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all relative overflow-hidden ${
                      isSaving ? 'bg-[#0a0a0a] text-lux-gold border border-lux-gold/30' : 'bg-lux-gold text-black shadow-gold-glow'
                    }`}
                  >
                    {/* Ползунок прогресса для архивации */}
                    {isSaving && (
                      <div className="absolute left-0 top-0 bottom-0 bg-lux-gold/20 transition-all duration-300 ease-out" style={{ width: `${saveProgress}%` }} />
                    )}

                    <div className="relative z-10 flex items-center gap-2">
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      )}
                      <span>
                        {isSaving 
                          ? `${language === 'ru' ? 'АРХИВАЦИЯ' : language === 'fr' ? 'ARCHIVAGE' : 'ARCHIVING'} ${saveProgress}%` 
                          : t.downloadGuest}
                      </span>
                    </div>
                  </button>

                  {/* Вторичные действия: Поделиться подборкой + Сбросить фильтр */}
                  <div className="flex w-full gap-2">
                    <button
                      onClick={handleShareGuest}
                      className="flex-[2] py-3 bg-[#1a1a1a] hover:bg-[#222] border border-lux-gold/30 text-lux-gold uppercase text-[9px] md:text-[10px] font-bold tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      {t.shareGuest}
                    </button>
                    
                    <button
                      onClick={() => {
                        triggerVibration(10);
                        // Сбрасываем URL параметр при закрытии (чтобы ссылка снова стала чистой)
                        if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname);
                        
                        // Умный откат: если есть история фильтра, жмем назад (popstate сам обнулит стейт)
                        if (window.history.state && window.history.state.guestFilter) {
                          window.history.back();
                        } else {
                          setSelectedGuestId(null);
                        }
                      }}
                      className="flex-[1] py-3 text-white/50 hover:text-white uppercase text-[9px] md:text-[10px] font-bold tracking-widest border border-white/10 rounded-sm hover:bg-white/5 transition-all active:scale-[0.98]"
                    >
                      {t.resetFilter}
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div 
          layout // <-- Добавлено для плавной анимации фильтрации сетки
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-wrap justify-center gap-2 md:gap-4 pt-4 pb-20 after:content-[''] after:flex-grow-[999]"
        >
          {/* Оборачиваем элементы сетки в AnimatePresence для плавного исчезновения */}
          <AnimatePresence>
            {filteredPhotos.map((photo, index) => (
              <PhotoRowItem 
                key={photo.filename} 
                photo={photo} 
                index={index} 
                onOpen={() => openLightbox(index)} 
                isSelectionMode={isSelectionMode}
                isSelected={selectedPhotos.has(photo.filename)}
                onToggleSelect={togglePhotoSelection}
                onLongPress={handleLongPress}
              />
            ))}
          </AnimatePresence>
          {/* === ПЛАВАЮЩАЯ ПАНЕЛЬ МУЛЬТИВЫБОРА (iOS Style) === */}
        <AnimatePresence>
          {/* Панель прячется, если открыт Lightbox, Студия Коллажей или Превью */}
          {isSelectionMode && selectedIndex === null && !showCollageCreator && !generatedCollageUrl && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              // --- APPLE GENIUS PHYSICS ---
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.6 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 60) {
                  triggerVibration(10);
                  closeSelectionSafe();
                }
              }}
              // ОПТИМИЗАЦИЯ: flex-col для Phone (друг под другом), flex-row для PC. Расширен max-w для дыхания.
              className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-[600px] w-full z-[110] bg-[#111]/95 backdrop-blur-xl border border-lux-gold/30 rounded-2xl p-4 md:px-6 pt-6 md:pt-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 touch-none"
            >
              {/* Элегантная ручка для свайпа (Drag Pill) - только на мобильных */}
              <div className="md:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/10 rounded-full" />

              {/* ОПТИМИЗАЦИЯ: На мобилках текст и кнопка на одной линии, на ПК — друг под другом */}
              <div className="flex justify-between items-center w-full md:w-auto md:flex-col md:items-start md:gap-1">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-sm md:text-base whitespace-nowrap">{selectedPhotos.size} {t.selected}</span>
                  {/* Крестик отмены для быстрого тапа (Geniux Apple UX) - только на мобильных */}
                  <button 
                    onClick={closeSelectionSafe}
                    className="md:hidden p-1 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button onClick={closeSelectionSafe} className="hidden md:block text-lux-gold text-[10px] uppercase tracking-widest hover:text-white transition-colors">
                  {t.cancel}
                </button>
              </div>
              
              {/* ОПТИМИЗАЦИЯ: Блок кнопок растягивается на 100% на мобилках, на ПК поджимается */}
              <div className="flex gap-2 w-full md:w-auto justify-end">
                
                {/* Кнопки Скачать и Поделиться видны ТОЛЬКО если гость зашел НЕ через меню печати */}
                {selectionIntent === 'general' && (
                  <>
                    <button 
                      onClick={() => {
                        const targets = photos.filter(p => selectedPhotos.has(p.filename));
                        handleSaveAll(targets);
                      }}
                      disabled={selectedPhotos.size === 0 || isSaving}
                      className="flex-1 md:flex-none bg-[#1a1a1a] border border-white/10 text-white px-5 py-3 md:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center hover:bg-white/10"
                    >
                      {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      )}
                    </button>

                    <button 
                      disabled={selectedPhotos.size === 0}
                      onClick={async () => {
                        triggerVibration(50);
                        const fileNames = Array.from(selectedPhotos).join(',');
                        const shareLink = `${window.location.origin}/weddings/${slug}?p=${fileNames}`;
                        if (navigator.share) {
                          try { await navigator.share({ title: 'KURGINIAN Premium', url: shareLink }); } catch (err) {}
                        } else {
                          navigator.clipboard.writeText(shareLink);
                          setShowToast(true); setTimeout(() => setShowToast(false), 2000);
                        }
                      }}
                      className="flex-1 md:flex-none bg-[#1a1a1a] border border-white/10 text-white px-5 py-3 md:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center hover:bg-white/10"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Кнопка "Заказать Печать" (В режиме 'print' она растягивается на 100%) */}
                <button 
                  disabled={selectedPhotos.size === 0}
                  onClick={() => {
                    triggerVibration([20, 40]);
                    
                    let targetSize = preferredSize;
                    if (!targetSize) {
                      targetSize = '10x15';
                      setPreferredSize('10x15');
                      localStorage.setItem('kurginian_pref_size', '10x15');
                    }

                    const itemsToAdd = Array.from(selectedPhotos).map(filename => {
                      const photo = photos.find(p => p.filename === filename);
                      return { id: `${filename}_${targetSize}`, filename, thumb_url: photo?.urls.thumb || '', size: targetSize as PrintSize, quantity: 1, price: PRINT_PRICES[targetSize as PrintSize] };
                    });
                    addToCart(slug, itemsToAdd);
                    
                    // Бесшовный переход в истории: заменяем state мультивыбора на state корзины
                    window.history.replaceState({ cart: true }, "");
                    setIsSelectionMode(false);
                    setSelectedPhotos(new Set());
                    setIsCartOpen(true);
                  }}
                  className={`${selectionIntent === 'print' ? 'flex-1 md:w-auto md:px-8' : 'flex-[2] md:flex-none md:w-[160px]'} bg-lux-gold text-black py-3 md:py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50 active:scale-[0.98] transition-all shadow-gold-glow flex items-center justify-center gap-2`}
                >
                  <svg className="w-4 h-4 text-black shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span className="truncate">{t.orderPrints}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === ШТОРКА ДЕЙСТВИЙ ИЗ 3D-TOUCH (Long Press) === */}
        <AnimatePresence>
          {longPressedIndex !== null && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setLongPressedIndex(null)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[140] touch-none"
              />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 500 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  if (info.offset.y > 50) {
                    setLongPressedIndex(null);
                  }
                }}
                className="fixed bottom-0 left-0 right-0 z-[150] flex flex-col items-center touch-none will-change-transform"
              >
                <div className="w-full max-w-md bg-[#0a0a0a] border-t border-white/10 rounded-t-3xl p-6 pb-10 shadow-2xl relative">
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                  
                  <h3 className="text-center font-cinzel text-lux-gold mb-6 uppercase tracking-widest text-sm">{t.actions}</h3>
                  
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        handleDownload(filteredPhotos[longPressedIndex].filename, filteredPhotos[longPressedIndex].urls.web);
                        setLongPressedIndex(null);
                      }}
                      className="w-full bg-[#111] border border-white/5 py-4 rounded-xl text-white text-xs uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {t.download}
                    </button>
                    <button 
                      onClick={() => {
                        handleShare(filteredPhotos[longPressedIndex].filename);
                        setLongPressedIndex(null);
                      }}
                      className="w-full bg-[#111] border border-white/5 py-4 rounded-xl text-white text-xs uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      {t.share}
                    </button>
                    <button 
                      onClick={() => {
                        triggerVibration(20);
                        window.history.pushState({ selection: true }, "");
                        setSelectionIntent('general'); // Гость зашел через долгое нажатие
                        setIsSelectionMode(true);
                        togglePhotoSelection(filteredPhotos[longPressedIndex].filename);
                        setLongPressedIndex(null);
                      }}
                      className="w-full bg-lux-gold/10 border border-lux-gold/30 py-4 rounded-xl text-lux-gold font-bold text-xs uppercase tracking-widest mt-2 hover:bg-lux-gold hover:text-black transition-colors flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t.select}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        </motion.div>

        {/* === ШТОРКА КОРЗИНЫ ЗАКАЗА ПЕЧАТИ (Premium Bottom Sheet) === */}
        <AnimatePresence>
          {isCartOpen && (
            <>
            {/* Фон больше не блокирует внутренние touch-события */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeCartSafe}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[160]"
            />
            
            {/* Добавлена физика свайпа вниз (drag) */}
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 800 }}
              dragElastic={0.1}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) {
                  triggerVibration(10);
                  closeCartSafe();
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-[170] flex flex-col items-center h-[85vh] md:h-[80vh]"
            >
              {/* Строгий h-full для контейнера, чтобы Footer всегда был видим */}
              <div className="w-full max-w-2xl bg-[#0a0a0a] border-t border-lux-gold/30 rounded-t-[2rem] p-6 pb-6 shadow-[0_-10px_50px_rgba(212,175,55,0.15)] flex flex-col h-full overflow-hidden">
                
                {/* Элегантный индикатор свайпа (Drag Pill) */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 shrink-0" />

                <div className="flex justify-between items-center mb-6 shrink-0">
                  <h3 className="font-cinzel text-xl text-lux-gold tracking-widest uppercase">{t.cartTitle}</h3>
                  <button onClick={closeCartSafe} className="text-gray-500 hover:text-white transition-colors p-1">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Прогресс-бар бесплатной доставки */}
                <div className="mb-6 bg-[#111] border border-white/5 p-4 rounded-2xl relative overflow-hidden shrink-0">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold mb-3 relative z-10">
                    <span className="text-gray-400">{amountToFreeShipping > 0 ? t.addMoreForFree.replace('{amount}', amountToFreeShipping.toFixed(2)) : '✨ ' + t.freeShipping}</span>
                    <span className="text-lux-gold">{cartTotal.toFixed(2)}€ / 80€</span>
                  </div>
                  <div className="w-full h-1.5 bg-black rounded-full overflow-hidden relative z-10">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full ${progressPercent >= 100 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-lux-gold'}`}
                    />
                  </div>
                </div>

                {/* Список товаров: Добавлен min-h-0 для фиксации Flexbox и onPointerDownCapture для скролла */}
                <div 
                  onPointerDownCapture={(e) => e.stopPropagation()} 
                  className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-4 mb-6 min-h-0 overscroll-contain touch-pan-y"
                >
                  {cart.length === 0 ? (
                    <p className="text-center text-gray-500 uppercase tracking-widest text-xs mt-10">{t.emptyCart}</p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center bg-[#111] p-3 rounded-2xl border border-white/5">
                        <img 
                          src={item.thumb_url} 
                          alt="print" 
                          draggable={false}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          className="w-16 h-20 object-cover rounded-lg pointer-events-none select-none" 
                        />
                        <div className="flex-1 flex flex-col gap-2">
                          
                          <div className="flex justify-between items-center mb-1">
                            {/* PREMIUM SEGMENTED PICKER */}
                            <div className="flex bg-black p-0.5 rounded-lg border border-white/10">
                              {(['10x15', '15x20', 'A4', 'A3'] as PrintSize[]).map((sizeOption) => (
                                <button
                                  key={sizeOption}
                                  onClick={() => {
                                    if (item.size !== sizeOption) {
                                      triggerVibration(10);
                                      updateCartItem(slug, item.id, item.quantity, sizeOption);
                                    }
                                  }}
                                  className={`px-2.5 py-1 text-[10px] rounded-md font-bold transition-all ${
                                    item.size === sizeOption 
                                      ? 'bg-[#222] text-lux-gold shadow-sm' 
                                      : 'text-gray-500 hover:text-white'
                                  }`}
                                >
                                  {sizeOption}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => removeFromCart(slug, item.id)} className="text-gray-600 hover:text-red-500 text-xs uppercase p-1">✕</button>
                          </div>

                          <div className="flex justify-between items-center mt-1">
                            {/* Счетчик количества (Apple-style pill) */}
                            <div className="flex items-center bg-black rounded-full border border-white/10 px-1">
                              <button onClick={() => updateCartItem(slug, item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">-</button>
                              <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                              <button onClick={() => updateCartItem(slug, item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">+</button>
                            </div>
                            <span className="text-lux-gold font-mono font-bold">{(item.price * item.quantity).toFixed(2)}€</span>
                          </div>

                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer с оплатой */}
                <div className="border-t border-white/10 pt-6">
                  <div className="flex justify-between items-end mb-4 px-2">
                    <span className="text-gray-400 text-xs uppercase tracking-widest">{t.total}</span>
                    <span className="text-2xl font-cinzel text-white">{cartTotal.toFixed(2)} €</span>
                  </div>
                  <button 
                    disabled={cart.length === 0 || isSaving}
                    onClick={async () => {
                      triggerVibration([50, 50]);
                      setIsSaving(true); // Используем стейт isSaving для спиннера на кнопке
                      
                      try {
                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                        const response = await fetch(`${apiUrl}/api/weddings/${slug}/create-print-session`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            items: cart,
                            language: language
                          })
                        });

                        if (!response.ok) throw new Error("Payment session failed");
                        const data = await response.json();
                        
                        if (data.url) {
                          // Бесшовный редирект на нативную форму Apple Pay / Stripe
                          window.location.href = data.url; 
                        }
                      } catch (err) {
                        console.error(err);
                        alert(language === 'ru' ? 'Ошибка соединения с сервером оплаты' : 'Payment gateway connection error');
                        setIsSaving(false);
                      }
                    }}
                    className="w-full py-4 bg-lux-gold text-black font-bold uppercase tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-95 shadow-gold-glow flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    )}
                    {isSaving ? (language === 'ru' ? 'ПОДГОТОВКА...' : 'PROCESSING...') : t.checkout}
                  </button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* === ПРЕМИАЛЬНОЕ НАДПИСЬ ОБ ОКОНЧАНИИ ДОСТУПА (Только для гостей) === */}
        {!isVip && expiresAt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center pb-12 px-4"
          >
            <p className="font-cinzel text-xs md:text-sm text-lux-gold/60 uppercase tracking-[0.2em]">
              {t.expiresText} <span className="text-lux-gold font-bold">{new Date(expiresAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'fr' ? 'fr-FR' : 'en-US')}</span>
            </p>
            <div className="w-12 h-[1px] bg-lux-gold/30 mx-auto mt-4" />
          </motion.div>
        )}
      </Suspense>

      {/* ПРЕМИАЛЬНЫЙ LIGHTBOX (Всплывающее окно) */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center select-none touch-none overflow-hidden"
          >
            {/* Кнопка закрытия (Справа) */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-[120] flex flex-col items-center gap-2">
              <button 
                onClick={closeLightbox}
                className="p-4 flex items-center justify-center text-white/70 hover:text-lux-gold transition-colors"
              >
                <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* МИНИ-КОРЗИНА ПОД КРЕСТИКОМ (Только в лайтбоксе) */}
              <AnimatePresence>
                {cart.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setIsCartOpen(true)}
                    className="flex flex-col items-center gap-1.5 bg-[#111]/60 backdrop-blur-md border border-lux-gold/30 p-3 rounded-2xl shadow-lg active:scale-95 transition-all text-lux-gold hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span className="font-bold text-[10px] leading-none">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* === ПРЕМИУМ-БРЕНДИНГ (Слева сверху) === */}
            <motion.a
              href="https://kurginian.pro"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerVibration(10)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
              className="absolute top-8 left-6 md:top-10 md:left-10 z-[105] font-cinzel text-lux-gold/40 hover:text-lux-gold tracking-[0.4em] text-[10px] md:text-xs uppercase transition-all duration-500 drop-shadow-lg whitespace-nowrap"
            >
              Kurginian Premium
            </motion.a>

            {/* Основное фото с поддержкой СВАЙПА И ЗУМА (Multitouch Pinch-to-Zoom Edition) */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none">
              <motion.div
                key={selectedIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  scale: zoomScale,
                  x: zoomScale === 1 ? 0 : undefined, // Умный возврат в центр
                  y: zoomScale === 1 ? 0 : undefined  // Умный возврат в центр
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                drag={true}
                dragDirectionLock={zoomScale === 1} 
                // Твоя математика (80% экрана), чтобы object-contain фото не блокировалось, но и не улетало насовсем
                dragConstraints={zoomScale > 1 ? { left: -panBounds.x, right: panBounds.x, top: -panBounds.y, bottom: panBounds.y } : { left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={zoomScale > 1 ? 0.15 : 0.6}
                dragMomentum={true}
                // --- ЛОГИКА PINCH-TO-ZOOM (Два пальца) ---
                onTouchStart={(e) => {
                  if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    initialTouchDistance.current = Math.hypot(dx, dy);
                    currentScale.current = zoomScale;
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2 && initialTouchDistance.current !== null) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const distance = Math.hypot(dx, dy);
                    const scaleFactor = distance / initialTouchDistance.current;
                    // Ограничиваем зум от 1 до 4
                    const newScale = Math.min(Math.max(1, currentScale.current * scaleFactor), 4);
                    setZoomScale(newScale);
                  }
                }}
                onTouchEnd={(e) => {
                  if (e.touches.length < 2) {
                    initialTouchDistance.current = null;
                    // Автоматический сброс в центр, если масштаб после щипка близок к 1
                    if (zoomScale < 1.1) {
                      setZoomScale(1);
                    }
                  }
                }}
                // --- ЛОГИКА ДВОЙНОГО ТАПА ---
                onTap={() => {
                  const now = Date.now();
                  if (now - lastTapRef.current < 300) {
                    toggleZoom();
                  }
                  lastTapRef.current = now;
                }}
                // --- УМНАЯ ЛОГИКА СВАЙПОВ И ЗАКРЫТИЯ (Intent Detection) ---
                onDragEnd={(_, info) => {
                  if (zoomScale === 1) {
                    // Вычисляем доминирующую ось (намерение пользователя)
                    const isHorizontal = Math.abs(info.offset.x) > Math.abs(info.offset.y);

                    if (isHorizontal) {
                      // Строго горизонтальный свайп: игнорируем Y-инерцию
                      if (info.offset.x > 80 || info.velocity.x > 500) {
                        goToPrev();
                      } else if (info.offset.x < -80 || info.velocity.x < -500) {
                        goToNext();
                      }
                    } else {
                      // Строго вертикальный свайп: логика закрытия
                      if (Math.abs(info.offset.y) > 120 || Math.abs(info.velocity.y) > 500) {
                        closeLightbox();
                      }
                    }
                  }
                }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="relative w-full h-full flex items-center justify-center z-[102]"
                style={{ cursor: zoomScale > 1 ? 'move' : 'grab', WebkitTouchCallout: 'none' }}
              >
                {/* Мгновенная подложка, пока Next.js думает над HD-картинкой */}
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                  <img 
                    src={filteredPhotos[selectedIndex].urls.thumb} 
                    className="w-full h-full object-contain blur-xl opacity-40 scale-105 pointer-events-none" 
                    alt="blur"
                  />
                </div>

                <Image
                  src={filteredPhotos[selectedIndex].urls.web}
                  alt="Full view"
                  fill
                  unoptimized
                  className="object-contain pointer-events-none select-none"
                  priority
                  draggable={false}
                  placeholder="blur" 
                  blurDataURL={filteredPhotos[selectedIndex].urls.thumb} 
                />
              </motion.div>

              {/* 🔥 ТИХАЯ ПРЕДЗАГРУЗКА СОСЕДНИХ ФОТО 🔥 */}
              <div className="hidden">
                <Image 
                  src={filteredPhotos[(selectedIndex + 1) % filteredPhotos.length].urls.web} 
                  alt="preload next" 
                  width={1} height={1} priority 
                />
                <Image 
                  src={filteredPhotos[(selectedIndex - 1 + filteredPhotos.length) % filteredPhotos.length].urls.web} 
                  alt="preload prev" 
                  width={1} height={1} priority 
                />
              </div>

              {/* Стрелки по бокам (Только для ПК) */}
              <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="hidden md:block absolute left-8 p-4 text-white/30 hover:text-lux-gold transition-all select-none z-[105]">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="hidden md:block absolute right-8 p-4 text-white/30 hover:text-lux-gold transition-all select-none z-[105]">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 px-6 z-[110]">
              
              {/* === ЛОКАТОР ГОСТЕЙ В ФОТОГРАФИИ (Smart In-Photo Search) === */}
              {isVip && guestClusters && filteredPhotos[selectedIndex].cluster_ids && filteredPhotos[selectedIndex].cluster_ids.length > 0 && (
                <div className="flex flex-col items-center mb-2 w-full z-[115]">
                  <AnimatePresence>
                    {showLightboxGuests && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="relative w-full max-w-2xl group mb-4"
                      >
                        {/* Левая стрелка */}
                        <button 
                          onClick={() => document.getElementById('lightbox-guest-carousel')?.scrollBy({ left: -300, behavior: 'smooth' })}
                          className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 items-center justify-center bg-black/80 backdrop-blur-md border border-white/20 rounded-full text-white hover:text-lux-gold hover:border-lux-gold/50 transition-all opacity-0 group-hover:opacity-100 shadow-lg pointer-events-auto"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                          </svg>
                        </button>

                        <div
                          id="lightbox-guest-carousel"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const el = e.currentTarget;
                            el.dataset.isDragging = 'true';
                            el.dataset.dragged = 'false';
                            el.dataset.startX = e.pageX.toString();
                            el.dataset.scrollLeft = el.scrollLeft.toString();
                          }}
                          onPointerMove={(e) => {
                            const el = e.currentTarget;
                            if (el.dataset.isDragging !== 'true') return;
                            e.preventDefault();
                            const startX = parseFloat(el.dataset.startX || '0');
                            const scrollLeft = parseFloat(el.dataset.scrollLeft || '0');
                            const walk = (e.pageX - startX) * 1.5; 
                            el.scrollLeft = scrollLeft - walk;
                            if (Math.abs(walk) > 10) el.dataset.dragged = 'true';
                          }}
                          onPointerUp={(e) => { e.currentTarget.dataset.isDragging = 'false'; }}
                          onPointerLeave={(e) => { e.currentTarget.dataset.isDragging = 'false'; }}
                          onClickCapture={(e) => {
                            if (e.currentTarget.dataset.dragged === 'true') {
                              e.stopPropagation(); e.preventDefault();
                              e.currentTarget.dataset.dragged = 'false';
                            }
                          }}
                          onWheel={(e) => {
                            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
                            if (e.deltaY !== 0) e.currentTarget.scrollBy({ left: e.deltaY > 0 ? 250 : -250, behavior: 'smooth' });
                          }}
                          style={{ WebkitOverflowScrolling: 'touch' }}
                          className="flex gap-3 overflow-x-auto max-w-full p-3 bg-[#050505]/80 backdrop-blur-xl border border-lux-gold/30 rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.15)] pointer-events-auto touch-pan-x overscroll-contain will-change-scroll cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        >
                          {filteredPhotos[selectedIndex].cluster_ids.map(id => {
                            const cluster = guestClusters[id];
                            if (!cluster) return null;
                            return (
                              <div key={id} className="shrink-0 pointer-events-auto">
                                <FaceBubble
                                  cluster={cluster}
                                  photos={photos} 
                                  isSelected={false}
                                  onClick={() => {
                                    triggerVibration([30, 50]);
                                    setShowLightboxGuests(false);
                                    closeLightbox();
                                    setTimeout(() => setSelectedGuestId(id), 300);
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Правая стрелка */}
                        <button 
                          onClick={() => document.getElementById('lightbox-guest-carousel')?.scrollBy({ left: 300, behavior: 'smooth' })}
                          className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 items-center justify-center bg-black/80 backdrop-blur-md border border-white/20 rounded-full text-white hover:text-lux-gold hover:border-lux-gold/50 transition-all opacity-0 group-hover:opacity-100 shadow-lg pointer-events-auto"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => {
                      triggerVibration(10);
                      setShowLightboxGuests(!showLightboxGuests);
                    }}
                    className={`px-5 py-2.5 rounded-full font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 border pointer-events-auto ${
                      showLightboxGuests 
                        ? 'bg-lux-gold text-black border-transparent shadow-gold-glow' 
                        : 'bg-[#111]/80 backdrop-blur-md text-lux-gold border-lux-gold/40 hover:bg-white/10'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    {showLightboxGuests ? t.closeScanner : t.whoIsHere}
                  </button>
                </div>
              )}
              {/* === КОНЕЦ ЛОКАТОРА === */}

              {/* Toast Уведомления */}
              <AnimatePresence>
                {(showToast || showCartToast) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-lux-gold text-black px-4 py-2.5 rounded-xl font-bold shadow-gold-glow text-[10px] md:text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-center max-w-[95%] shadow-lg"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>
                      {showCartToast 
                        ? (customCartMsg || (language === 'ru' ? 'ДОБАВЛЕНО В КОРЗИНУ' : language === 'fr' ? 'AJOUTÉ AU PANIER' : 'ADDED TO CART')) 
                        : t.copied}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Bar (Скачать / Поделиться / Печать) */}
              <div className="w-full max-w-md flex gap-2 relative">
                <button
                  onClick={() => handleDownload(filteredPhotos[selectedIndex].filename, filteredPhotos[selectedIndex].urls.web)}
                  className="flex-1 flex items-center justify-center bg-[#111] hover:bg-[#1a1a1a] border border-white/10 text-white px-2 py-3.5 rounded-lg transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleShare(filteredPhotos[selectedIndex].filename)}
                  className="flex-1 flex items-center justify-center bg-[#111] hover:bg-[#1a1a1a] border border-white/10 text-white px-2 py-3.5 rounded-lg transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </button>

                {/* === УМНАЯ КНОПКА ПЕЧАТИ (Логика "+" и смены размера) === */}
                <div className="flex-[3] flex gap-1 relative">
                  <AnimatePresence>
                    {showSizeMenu && (
                      <>
                        {/* Невидимый фон для закрытия меню по клику мимо */}
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          onClick={() => setShowSizeMenu(false)}
                          className="fixed inset-0 z-[115]"
                        />
                        {/* Стеклянное выпадающее меню */}
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-[110%] right-0 w-[220px] bg-[#111]/95 backdrop-blur-2xl border border-lux-gold/30 rounded-2xl p-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[120] flex flex-col gap-1 overflow-hidden"
                        >
                          <div className="text-center pb-2 pt-1 border-b border-white/5 mb-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                              {language === 'ru' ? 'Выберите формат' : language === 'fr' ? 'Choisissez le format' : 'Select Format'}
                            </span>
                          </div>
                          {(Object.keys(PRINT_PRICES) as PrintSize[]).map((size) => (
                            <button
                              key={size}
                              onClick={() => {
                                triggerVibration([20, 40]);
                                setPreferredSize(size);
                                localStorage.setItem('kurginian_pref_size', size);
                                setShowSizeMenu(false);
                                
                                const photo = filteredPhotos[selectedIndex];
                                addToCart(slug, [{ id: `${photo.filename}_${size}`, filename: photo.filename, thumb_url: photo.urls.thumb, size: size, quantity: 1, price: PRINT_PRICES[size] }]);
                                
                                const msg = language === 'ru' 
                                  ? `Размер ${size} выбран. Можно изменить в корзине.` 
                                  : language === 'fr' 
                                  ? `Format ${size} défini. Modifiable dans le panier.` 
                                  : `Size ${size} set. Changeable in cart.`;
                                setCustomCartMsg(msg);
                                setShowCartToast(true);
                                setTimeout(() => { setShowCartToast(false); setCustomCartMsg(null); }, 4000);
                              }}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors group ${preferredSize === size ? 'bg-lux-gold/20 text-lux-gold' : 'hover:bg-white/5 text-gray-300'}`}
                            >
                              <span className="font-bold text-sm">{size}</span>
                              <span className="font-mono text-xs opacity-70 group-hover:opacity-100">{PRINT_PRICES[size].toFixed(2)}€</span>
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  {/* УМНАЯ ЛОГИКА ПЕЧАТИ: ДОБАВИТЬ / STEPPER */}
                  {(() => {
                    const currentPhoto = filteredPhotos[selectedIndex];
                    
                    // SENIOR LOGIC: Ищем в корзине конкретно тот формат, который сейчас выбран в селекторе
                    const activeItem = currentPhoto 
                      ? cart.find(item => item.filename === currentPhoto.filename && item.size === preferredSize) 
                      : undefined;
                    
                    // Проверяем наличие других форматов этого же фото для умной индикации
                    const hasOtherFormats = currentPhoto 
                      ? cart.some(item => item.filename === currentPhoto.filename && item.size !== preferredSize) 
                      : false;

                    // СЦЕНАРИЙ 1: ВЫБРАННЫЙ ФОРМАТ УЖЕ В КОРЗИНЕ -> ПОКАЗЫВАЕМ STEPPER
                    if (activeItem) {
                      return (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex-1 h-full flex items-center justify-between bg-lux-gold text-black rounded-lg px-1 transition-all shadow-gold-glow border border-lux-gold relative overflow-hidden"
                        >
                          <button 
                            onClick={() => { triggerVibration(10); updateCartItem(slug, activeItem!.id, activeItem!.quantity - 1); }} 
                            className="w-12 h-full flex items-center justify-center active:scale-75 transition-transform"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                            </svg>
                          </button>
                          
                          <div className="flex flex-col items-center justify-center pointer-events-none select-none">
                            <AnimatePresence mode="wait">
                              <motion.span 
                                key={activeItem.quantity}
                                initial={{ y: 5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -5, opacity: 0 }}
                                className="text-[10px] md:text-xs font-bold uppercase tracking-widest leading-tight"
                              >
                                {activeItem.quantity} {language === 'ru' ? 'В корзине' : language === 'fr' ? 'Ajouté' : 'In cart'}
                              </motion.span>
                            </AnimatePresence>
                            <span className="text-[8px] font-mono opacity-80 uppercase">{activeItem.size}</span>
                          </div>

                          <button 
                            onClick={() => { triggerVibration(10); updateCartItem(slug, activeItem!.id, activeItem!.quantity + 1); }} 
                            className="w-12 h-full flex items-center justify-center active:scale-75 transition-transform"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                          </button>

                          {/* APPLE HINT: Точка-индикатор, если заказаны и другие форматы этого фото */}
                          {hasOtherFormats && (
                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-black/40 rounded-full" />
                          )}
                        </motion.div>
                      );
                    }

                    // СЦЕНАРИЙ 2: ЭТОГО ФОРМАТА НЕТ В КОРЗИНЕ -> ПОКАЗЫВАЕМ КНОПКУ ДОБАВИТЬ
                    return (
                      <motion.button
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => {
                          if (preferredSize) {
                            triggerVibration([20, 40]);
                            addToCart(slug, [{ 
                              id: `${currentPhoto!.filename}_${preferredSize}`, 
                              filename: currentPhoto!.filename, 
                              thumb_url: currentPhoto!.urls.thumb, 
                              size: preferredSize, 
                              quantity: 1, 
                              price: PRINT_PRICES[preferredSize] 
                            }]);
                            setCustomCartMsg(null);
                            setShowCartToast(true);
                            setTimeout(() => setShowCartToast(false), 2000);
                          } else {
                            triggerVibration(10);
                            setShowSizeMenu(true);
                          }
                        }}
                        className={`flex-1 h-full flex items-center justify-center gap-2.5 rounded-lg transition-all active:scale-[0.98] font-bold relative ${
                          cart.length > 0 
                            ? 'bg-[#111] text-lux-gold border border-lux-gold/40 hover:bg-lux-gold hover:text-black' 
                            : 'bg-lux-gold text-black shadow-gold-glow hover:bg-white'
                        }`}
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        
                        <span className="uppercase tracking-[0.2em] text-[10px] md:text-xs truncate">
                          {hasOtherFormats 
                            ? (language === 'ru' ? 'ДОБАВИТЬ ЕЩЕ' : language === 'fr' ? 'AJOUTER PLUS' : 'ADD MORE') 
                            : (preferredSize ? (language === 'ru' ? 'ПЕЧАТЬ' : language === 'fr' ? 'IMPRIMER' : 'PRINT') : t.orderPrints)}
                        </span>
                      </motion.button>
                    );
                  })()}

                  {/* Умная кнопка смены размера (Premium Dropdown) */}
                  {preferredSize && (
                    <button
                      onClick={() => setShowSizeMenu(true)}
                      className="px-3 flex flex-col items-center justify-center bg-[#111] border border-white/10 text-lux-gold rounded-lg hover:bg-white/5 transition-colors group relative overflow-hidden"
                    >
                      <span className="text-[7px] text-gray-500 uppercase tracking-widest leading-none mb-0.5 group-hover:text-gray-300 transition-colors">
                        {t.size}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold leading-none">{preferredSize}</span>
                        <svg className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Счетчик */}
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-sm text-white/60 text-xs font-mono">
                {selectedIndex + 1} / {filteredPhotos.length}
              </div>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* === ПРЕМИАЛЬНОЕ ОКНО ОТЗЫВА (Pop-up после скачивания) === */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 touch-none"
            onClick={() => setShowFeedbackModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()} 
              className="w-full max-w-sm bg-[#0a0a0a] border border-lux-gold/30 rounded-xl p-8 text-center shadow-gold-glow relative"
            >
              {/* Кнопка закрытия крестиком */}
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>

              {/* Декоративный элемент (Имитация логотипа/иконки) */}
              <div className="w-12 h-12 rounded-full bg-lux-gold/10 border border-lux-gold/40 flex items-center justify-center mx-auto mb-5">
                <svg className="w-5 h-5 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>

              <h3 className="font-cinzel text-lux-gold text-lg mb-2 uppercase tracking-widest">
                {t.feedbackTitle}
              </h3>
              <p className="text-white/80 font-cormorant text-[1.1rem] italic mb-8 leading-relaxed">
                {t.feedbackText}
              </p>

              <a
                href="https://instagram.com/hdart26"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  triggerVibration(10);
                  setShowFeedbackModal(false);
                }}
                className="block w-full py-3.5 bg-lux-gold text-black text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors rounded-sm shadow-lg active:scale-95"
              >
                {t.instagramBtn}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === FLOATING CART BADGE (Плавающая корзина справа над меню) === */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && selectedIndex === null && !isSelectionMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            onClick={() => {
              triggerVibration(10);
              setIsCartOpen(true);
            }}
            className="fixed bottom-24 right-6 z-[105] bg-lux-card/90 backdrop-blur-md border border-lux-gold/30 h-14 px-5 rounded-full flex items-center justify-center gap-3 shadow-gold-glow hover:bg-lux-gold hover:text-black transition-all group text-lux-gold"
          >
            <svg className="w-5 h-5 transition-colors group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="font-bold text-xs text-white group-hover:text-black transition-colors">{cartTotal.toFixed(2)}€</span>
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-[#0a0a0a]">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* === МАГИЧЕСКАЯ ПАЛОЧКА (Floating Magic Wand Edge Tab) === */}
      <AnimatePresence>
        {isSelectionMode && selectedPhotos.size >= 2 && selectedPhotos.size <= 4 && !showCollageCreator && !generatedCollageUrl && (
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            onClick={() => {
              triggerVibration(10);
              window.history.pushState({ collage: true }, "");
              setShowCollageCreator(true);
            }}
            className="fixed right-0 top-1/3 md:top-1/2 -translate-y-1/2 z-[115] bg-[#0a0a0a]/90 backdrop-blur-xl border border-lux-gold/40 border-r-0 rounded-l-2xl p-3 md:p-4 shadow-[-10px_0_30px_rgba(212,175,55,0.15)] flex flex-col items-center gap-3 group hover:bg-[#111] transition-all"
          >
            <div className="relative">
              <svg className="w-6 h-6 text-lux-gold group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              {/* Легкое мерцание сзади иконки */}
              <div className="absolute inset-0 bg-lux-gold rounded-full blur-md opacity-40 animate-pulse pointer-events-none" />
            </div>
            {/* Текст развернут вертикально для элегантности */}
            <span className="text-[10px] text-lux-gold uppercase tracking-widest font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>L'Édition</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* === КОМПОНЕНТ ГЕНЕРАЦИИ КОЛЛАЖЕЙ === */}
      <AnimatePresence>
        {showCollageCreator && (
          <CollageCreator 
            slug={slug}
            selectedPhotos={Array.from(selectedPhotos)}
            onClose={() => {
              // Гарантированное мгновенное закрытие UI
              setShowCollageCreator(false);
              // Очистка истории браузера на фоне
              if (window.history.state?.collage) window.history.back();
            }}
            onSuccess={(url) => {
              // Мгновенное закрытие конструктора
              setShowCollageCreator(false);
              if (window.history.state?.collage) window.history.back();
              
              closeSelectionSafe();
              
              // Открываем модалку превью с задержкой для плавности анимаций
              setTimeout(() => {
                window.history.pushState({ collagePreview: true }, "");
                setGeneratedCollageUrl(url);
              }, 100);
            }}
          />
        )}
      </AnimatePresence>

      {/* === ПРЕВЬЮ СГЕНЕРИРОВАННОГО КОЛЛАЖА === */}
      <AnimatePresence>
        {generatedCollageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 touch-none"
          >
            {/* Кнопка закрытия */}
            <button 
              onClick={() => {
                triggerVibration(10);
                setGeneratedCollageUrl(null); // Мгновенная реакция UI
                if (window.history.state?.collagePreview) window.history.back();
              }}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-white/50 hover:text-lux-gold transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Картинка (Строгая пропорция 4:5 + Apple Swipe Physics) */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 300 }}
              dragElastic={0.4}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
              style={{ WebkitTouchCallout: 'none' }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) {
                  triggerVibration(10);
                  setGeneratedCollageUrl(null); // Мгновенная реакция UI
                  if (window.history.state?.collagePreview) window.history.back();
                }
              }}
              className="relative w-full max-w-[360px] min-h-[450px] shrink-0 aspect-[4/5] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.15)] border border-lux-gold/20 mb-8 cursor-grab active:cursor-grabbing touch-none"
            >
              <Image 
                src={generatedCollageUrl} 
                alt="L'Édition Preview" 
                fill 
                unoptimized 
                draggable={false}
                className="object-cover pointer-events-none select-none"
              />
            </motion.div>

            {/* Панель действий под фото */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex w-full max-w-[360px] gap-3"
            >
              <button 
                onClick={() => {
                  triggerVibration(20);
                  handleDownload(`Edition_${slug}_${Date.now()}.jpg`, generatedCollageUrl);
                }}
                className="flex-[2] py-4 bg-lux-gold text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-white transition-all shadow-gold-glow flex items-center justify-center gap-2 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {t.download}
              </button>
              
              <button 
                onClick={async () => {
                  triggerVibration(20);
                  if (navigator.share) {
                    try { await navigator.share({ title: "L'Édition", url: generatedCollageUrl }); } catch (e) {}
                  } else {
                    navigator.clipboard.writeText(generatedCollageUrl);
                    setShowToast(true); setTimeout(() => setShowToast(false), 2000);
                  }
                }}
                className="flex-[1] py-4 bg-[#111] border border-lux-gold/30 text-lux-gold font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === ЭЛЕГАНТНЫЙ ЛИФТ (Smart Scroll-to-Top Pill) === */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-[#0a0a0a]/80 backdrop-blur-md border border-lux-gold/30 text-lux-gold px-4 py-2 rounded-full flex items-center justify-center gap-2 shadow-[0_5px_20px_rgba(212,175,55,0.15)] hover:bg-lux-gold hover:text-black transition-all group"
          >
            <svg className="w-4 h-4 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">{language === 'ru' ? 'Наверх' : language === 'fr' ? 'Haut' : 'Top'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* === ПРЕМИУМ-УВЕДОМЛЕНИЕ ОБ УСПЕШНОЙ ОПЛАТЕ ПЕЧАТИ === */}
      <AnimatePresence>
        {showPrintSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 touch-none"
            onClick={() => setShowPrintSuccess(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-sm w-full bg-[#0a0a0a] border border-lux-gold/50 p-8 rounded-2xl shadow-gold-glow text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-full bg-lux-gold/10 border border-lux-gold/30 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              
              <h3 className="font-cinzel text-xl md:text-2xl text-lux-gold uppercase tracking-widest mb-3">
                {language === 'ru' ? 'Оплата Успешна' : language === 'fr' ? 'Paiement Réussi' : 'Payment Successful'}
              </h3>
              
              <p className="text-gray-400 text-sm font-montserrat leading-relaxed mb-8">
                {language === 'ru' ? `Заказ ${showPrintSuccess} оплачен. Мы скоро начнем сборку.` 
                  : language === 'fr' ? `Commande ${showPrintSuccess} payée. Nous commençons la préparation.` 
                  : `Order ${showPrintSuccess} paid. We will start processing soon.`}
              </p>
              
              <button
                onClick={() => setShowPrintSuccess(null)}
                className="w-full py-4 bg-lux-gold text-black uppercase tracking-[0.2em] font-bold text-xs rounded-sm hover:bg-white transition-colors shadow-lg active:scale-95"
              >
                ОК
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === ГЛОБАЛЬНЫЕ TOAST УВЕДОМЛЕНИЯ (Для действий вне Lightbox) === */}
      <AnimatePresence>
        {(showToast || showCartToast) && selectedIndex === null && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-28 md:bottom-12 left-1/2 -translate-x-1/2 z-[115] bg-lux-gold text-black px-5 py-3.5 rounded-xl font-bold shadow-[0_10px_40px_rgba(212,175,55,0.3)] text-[10px] md:text-xs uppercase tracking-wider flex items-center gap-2 text-center max-w-[90%] md:max-w-md pointer-events-none"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>
              {showCartToast 
                ? (customCartMsg || (language === 'ru' ? 'ДОБАВЛЕНО В КОРЗИНУ' : language === 'fr' ? 'AJOUTÉ AU PANIER' : 'ADDED TO CART')) 
                : t.copied}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}