'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

const translations = {
  fr: {
    title: "RÉSERVATION DE DATE",
    subtitle: "Sécurisez votre journée spéciale",
    cityLabel: "Lieu de l'événement",
    dateLabel: "Date réservée",
    forfaitLabel: "Choisissez votre forfait",
    decideLater: "Nous choisirons plus tard",
    payButton: "Sécuriser la date pour",
    processing: "Traitement...",
    successTitle: "RÉSERVATION CONFIRMÉE",
    successText: "Votre date est officiellement sécurisée. Merci de votre confiance.",
    whatsappBtn: "Confirmer sur WhatsApp",
    waMsgBase: "Bonjour David ! Nous venons de régler l'acompte pour réserver notre date le",
    waMsgAt: "à",
    waMsgForfait: "Nous avons choisi le Forfait",
    waMsgLater: "Nous réfléchissons encore au forfait et vous tiendrons au courant."
  },
  en: {
    title: "DATE RESERVATION",
    subtitle: "Secure your special day",
    cityLabel: "Event Location",
    dateLabel: "Reserved Date",
    forfaitLabel: "Select your package",
    decideLater: "We will decide later",
    payButton: "Secure date for",
    processing: "Processing...",
    successTitle: "RESERVATION CONFIRMED",
    successText: "Your date is officially secured. Thank you for your trust.",
    whatsappBtn: "Confirm via WhatsApp",
    waMsgBase: "Hello David! We have just paid the deposit to secure our date on",
    waMsgAt: "in",
    waMsgForfait: "We have chosen Forfait",
    waMsgLater: "We will decide on the package later and let you know."
  },
  ru: {
    title: "БРОНИРОВАНИЕ ДАТЫ",
    subtitle: "Зафиксируйте ваш особенный день",
    cityLabel: "Место проведения",
    dateLabel: "Дата события",
    forfaitLabel: "Выберите тариф (Forfait)",
    decideLater: "Выберем и сообщим позже",
    payButton: "Забронировать за",
    processing: "Обработка...",
    successTitle: "БРОНЬ ПОДТВЕРЖДЕНА",
    successText: "Ваша дата официально зафиксирована за вами. Спасибо за доверие.",
    whatsappBtn: "Написать в WhatsApp",
    waMsgBase: "Здравствуйте, Давид! Мы только что оплатили бронь на",
    waMsgAt: "в",
    waMsgForfait: "Мы выбрали Forfait",
    waMsgLater: "Тариф выберем и сообщим вам немного позже."
  }
} as const;

const forfaits = ['1', '2', '3', '4', '5', '6'];

function BookingContent() {
  const searchParams = useSearchParams();
  const { language } = useAppContext();
  const t = translations[language];

  const dateEvent = searchParams.get('date') || 'Non défini';
  const city = searchParams.get('city') || 'Non défini';
  const amount = searchParams.get('amount') || '100';
  const isSuccess = searchParams.get('success') === 'true';
  const savedForfait = searchParams.get('forfait');

  const [selectedForfait, setSelectedForfait] = useState<string>('decide_later');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Для CSS-анимаций

  // === HAPTIC FEEDBACK ===
  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  useEffect(() => {
    // Запускаем CSS анимацию появления сразу после монтирования компонента
    const timer = setTimeout(() => setIsMounted(true), 100);
    if (isSuccess) {
      triggerVibration([100, 50, 100, 50, 200]);
    }
    return () => clearTimeout(timer);
  }, [isSuccess]);

  const handleCheckout = async () => {
    triggerVibration(50);
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/booking/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_event: dateEvent,
          city: city,
          amount: parseInt(amount),
          forfait: selectedForfait,
          language: language
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setIsLoading(false);
        alert("Erreur de connexion / Connection error");
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const openWhatsApp = () => {
    triggerVibration(10);
    const finalForfait = savedForfait || selectedForfait;
    const msgForfait = finalForfait === 'decide_later' ? t.waMsgLater : `${t.waMsgForfait} ${finalForfait}.`;
    const message = `${t.waMsgBase} ${dateEvent} ${t.waMsgAt} ${city}. ${msgForfait}`;
    window.open(`https://wa.me/33743300000?text=${encodeURIComponent(message)}`, '_blank');
  };

  // ЭКРАН УСПЕХА
  if (isSuccess) {
    return (
      <div 
        className={`flex flex-col items-center justify-center text-center p-6 min-h-[60vh] transition-all duration-1000 transform ${
          isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="w-20 h-20 bg-lux-gold/10 rounded-full flex items-center justify-center mb-8 shadow-gold-glow">
          <svg className="w-10 h-10 text-lux-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="font-cinzel text-2xl text-lux-gold mb-4 tracking-[0.2em]">{t.successTitle}</h1>
        <p className="font-cormorant text-xl text-gray-300 mb-12 max-w-md">{t.successText}</p>
        <button
          onClick={openWhatsApp}
          className="w-full max-w-xs px-6 py-4 bg-lux-gold text-black font-bold uppercase tracking-widest text-sm rounded-sm hover:bg-white transition-all shadow-gold-glow flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          {t.whatsappBtn}
        </button>
      </div>
    );
  }

  // ОСНОВНАЯ ФОРМА БРОНИРОВАНИЯ
  return (
    <div 
      className={`w-full max-w-md mx-auto px-6 py-12 transition-all duration-1000 transform ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* ЛОГОТИП (Анимация переведена на чистый CSS Tailwind) */}
      <div className="flex justify-center mb-10 mt-6">
        <img
          src="/logo.png"
          alt="Kurginian Logo"
          className="w-32 h-auto drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] animate-[pulse_4s_ease-in-out_infinite]"
          onError={(e) => {
             e.currentTarget.style.display = 'none';
             document.getElementById('fallback-logo')!.style.display = 'block';
          }}
        />
        <div id="fallback-logo" className="hidden font-cinzel text-3xl text-lux-gold tracking-[0.3em]">KURGINIAN</div>
      </div>

      <div className="text-center mb-10">
        <h1 className="font-cinzel text-xl text-white tracking-[0.2em] mb-2">{t.title}</h1>
        <p className="font-cormorant text-gray-400 italic text-lg">{t.subtitle}</p>
      </div>

      {/* КАРТОЧКА ДАННЫХ (READ-ONLY) */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lux-gold/50 to-transparent opacity-50" />
        
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          <span className="text-xs text-gray-500 uppercase tracking-widest">{t.dateLabel}</span>
          <span className="font-cinzel text-lux-gold text-lg tracking-wider">{dateEvent}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 uppercase tracking-widest">{t.cityLabel}</span>
          <span className="font-montserrat font-light text-white text-base tracking-wide">{city}</span>
        </div>
      </div>

      {/* ВЫБОР ТАРИФА */}
      <div className="mb-10">
        <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] text-center mb-4">{t.forfaitLabel}</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {forfaits.map((f) => (
            <button
              key={f}
              onClick={() => { triggerVibration(10); setSelectedForfait(f); }}
              className={`py-3 rounded-md border text-sm font-cinzel transition-all ${
                selectedForfait === f 
                  ? 'bg-lux-gold/10 border-lux-gold text-lux-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                  : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              F {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => { triggerVibration(10); setSelectedForfait('decide_later'); }}
          className={`w-full py-4 rounded-md border text-xs tracking-widest uppercase transition-all ${
            selectedForfait === 'decide_later'
              ? 'bg-white/10 border-white text-white'
              : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'
          }`}
        >
          {t.decideLater}
        </button>
      </div>

      {/* КНОПКА ОПЛАТЫ */}
      <button
        onClick={handleCheckout}
        disabled={isLoading}
        className="w-full px-6 py-5 bg-lux-gold text-black font-bold uppercase tracking-widest text-sm rounded-sm hover:bg-white transition-all shadow-gold-glow disabled:opacity-50 flex justify-center items-center gap-2"
      >
        {isLoading ? (
          <span className="animate-pulse">{t.processing}</span>
        ) : (
          <>
            {t.payButton} {amount} €
          </>
        )}
      </button>
      
      {/* SECURITY BADGE */}
      <div className="mt-6 flex items-center justify-center gap-2 text-gray-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <span className="text-[10px] uppercase tracking-widest">Secured by Stripe</span>
      </div>
    </div>
  );
}

// === КОРНЕВОЙ КОМПОНЕНТ СТРАНИЦЫ ===
export default function BookingClient() {
  const { language, setLanguage } = useAppContext();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  };

  return (
    <main className="min-h-screen relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-lux-gold/5 via-lux-bg to-lux-bg flex flex-col items-center justify-center py-10">
      
      {/* ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКОВ */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={() => { triggerVibration(10); setShowLangMenu(!showLangMenu); }}
          className="flex items-center gap-1.5 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 hover:border-lux-gold/50 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg hover:bg-lux-gold hover:text-black transition-all text-gray-400 group"
        >
          <span className="uppercase tracking-widest">{language}</span>
          <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </button>

        {showLangMenu && (
          <div className="absolute top-9 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl flex flex-col min-w-[70px] overflow-hidden animate-fade-in">
            {(['fr', 'en', 'ru'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  triggerVibration(10);
                  setLanguage(lang);
                  setShowLangMenu(false);
                }}
                className={`px-3 py-2 text-center text-[10px] tracking-widest uppercase rounded-xl transition-all ${
                  language === lang ? 'bg-lux-gold text-black font-bold' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <Suspense fallback={<div className="w-8 h-8 border-2 border-lux-gold border-t-transparent rounded-full animate-spin" />}>
          <BookingContent />
        </Suspense>
      </div>

      {/* ПРЕМИАЛЬНЫЙ ФУТЕР (РЕКВИЗИТЫ) */}
      <div className="w-full max-w-md mx-auto pt-8 pb-4 border-t border-white/5 text-center flex flex-col items-center gap-3">
        <div className="font-cinzel text-lux-gold tracking-[0.2em] uppercase text-sm">
          Zokhrab Kurginian
        </div>
        <div className="font-montserrat font-light text-gray-500 text-[10px] tracking-[0.15em] leading-loose uppercase">
          28 Rue Nobel, 30000 Nîmes<br />
          SIRET : 999 405 988 00018
        </div>
        
        <div className="flex gap-4 mt-2">
          <a href="tel:+33743300000" className="text-gray-400 hover:text-white text-[10px] tracking-widest transition-colors font-mono">07 43 30 00 00</a>
          <span className="text-white/10">|</span>
          <a href="mailto:zknimes@gmail.com" className="text-gray-400 hover:text-white text-[10px] tracking-widest transition-colors font-mono">zknimes@gmail.com</a>
        </div>
        
        <div className="flex gap-4 mt-1">
          <a href="https://kurginian.pro" target="_blank" rel="noopener noreferrer" className="text-lux-gold/60 hover:text-lux-gold text-[10px] tracking-[0.2em] transition-colors uppercase">kurginian.pro</a>
          <span className="text-white/10">|</span>
          <a href="https://instagram.com/hdart26" target="_blank" rel="noopener noreferrer" className="text-lux-gold/60 hover:text-lux-gold text-[10px] tracking-[0.2em] transition-colors uppercase">@hdart26</a>
        </div>
      </div>

    </main>
  );
}