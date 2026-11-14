// === ФАЙЛ: app/studio/page.tsx (СЕКРЕТНАЯ СТУДИЙНАЯ АДМИНКА) ===
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface StudioPhoto {
  filename: string;
  width: number;
  height: number;
  urls: { web: string; thumb: string; };
}

export default function StudioAdminPage() {
  const router = useRouter();
  
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [stats, setStats] = useState<any>(null);
  
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectPhotos, setProjectPhotos] = useState<StudioPhoto[]>([]);
  const [projectExpiry, setProjectExpiry] = useState<string | null>(null); 
  const [isDeleting, setIsDeleting] = useState<string | null>(null); 
  const [vipPassword, setVipPassword] = useState<string>('');

  // === СТЕЙТЫ ДЛЯ WELCOME-ЗОНЫ (РЕДАКТОР) ===
  const [eventTitle, setEventTitle] = useState('');
  const [eventSubtitle, setEventSubtitle] = useState('');
  const [selectedCovers, setSelectedCovers] = useState<string[]>([]);
  const [originalCovers, setOriginalCovers] = useState<string[]>([]); // <-- БАЗОВОЕ СОСТОЯНИЕ ОБЛОЖЕК
  const [isSelectingCovers, setIsSelectingCovers] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true); // <-- ЗАЩИТА ОТ МОРГАНИЯ

  // === СТЕЙТЫ PREMIUM CINEMA ===
  const [cinemaClipUrl, setCinemaClipUrl] = useState('');
  const [cinemaPosterUrl, setCinemaPosterUrl] = useState('');
  const [cinemaSecretWord, setCinemaSecretWord] = useState('');
  const [cinemaYandexUrl, setCinemaYandexUrl] = useState('');
  const [cinemaFiles, setCinemaFiles] = useState('');
  const [cinemaPremiereAt, setCinemaPremiereAt] = useState('');

  // === СТЕЙТЫ УПРАВЛЕНИЯ ЗАКАЗАМИ (PRINT, USB BOX & 3D) ===
  const [activeTab, setActiveTab] = useState<'projects' | 'orders' | 'catalog3d'>('projects');
  const [ordersData, setOrdersData] = useState<{ print_orders: any[]; usb_orders: any[]; sculpture_orders?: any[] }>({ print_orders: [], usb_orders: [], sculpture_orders: [] });
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [generatingZipId, setGeneratingZipId] = useState<string | null>(null);

  // === СТЕЙТЫ УПРАВЛЕНИЯ 3D-МАГАЗИНОМ (КАТЕГОРИИ, АКЦИИ, ТОВАРЫ) ===
  const [catalog3D, setCatalog3D] = useState<any>({
    promo: { enabled: false, badge: 'PROMO', text_fr: '', text_en: '', text_ru: '' },
    categories: [],
    products: []
  });
  const [isSavingCatalog3D, setIsSavingCatalog3D] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // === СТЕЙТЫ ГЕНЕРАТОРА QR-КАРТОЧЕК (DUAL VIP + GUEST MODAL) ===
  const [qrModalSlug, setQrModalSlug] = useState<string | null>(null);
  const [cardLang, setCardLang] = useState<'fr' | 'en' | 'ru'>('fr');
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<{ vip: string | null; guest: string | null }>({ vip: null, guest: null });

  // === УМНЫЙ ПЕРЕХВАТ СВАЙПА НАЗАД (HISTORY API ДЛЯ АДМИНКИ) ===
  useEffect(() => {
    const handlePopState = () => {
      if (selectedProject) {
        setSelectedProject(null);
        setIsSelectingCovers(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedProject]);

  const closeProjectViewSafe = () => {
    setSelectedProject(null);
    setIsSelectingCovers(false);
    if (window.history.state?.view === 'project') {
      window.history.back();
    }
  };

  useEffect(() => {
    const savedPassword = sessionStorage.getItem('super_admin_pwd');
    if (savedPassword) {
      fetchDashboardData(savedPassword);
    } else {
      setIsCheckingSession(false);
    }
  }, []);

  const fetchDashboardData = async (pwd: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/admin/dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
        setIsAuthenticated(true);
        sessionStorage.setItem('super_admin_pwd', pwd);
        fetchOrdersData(pwd);
        fetch3DCatalog();
      } else {
        setError('Неверный мастер-пароль');
        sessionStorage.removeItem('super_admin_pwd');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
      setIsCheckingSession(false); // Выключаем спиннер первоначальной загрузки
    }
  };

  const fetchOrdersData = async (pwd: string) => {
    setIsLoadingOrders(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          setOrdersData(json.data);
        }
      }
    } catch (e) {
      console.error("Ошибка загрузки заказов:", e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetch3DCatalog = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/3d/catalog`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setCatalog3D(json.data);
        }
      }
    } catch (e) {
      console.error("Ошибка загрузки 3D каталога:", e);
    }
  };

  const save3DCatalogToServer = async (updatedCatalog: any) => {
    const pwd = sessionStorage.getItem('super_admin_pwd');
    if (!pwd) return;
    setIsSavingCatalog3D(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/3d/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, catalog: updatedCatalog }),
      });
      if (res.ok) {
        setCatalog3D(updatedCatalog);
        setEditingProduct(null);
      } else {
        alert("Ошибка при сохранении 3D-каталога");
      }
    } catch (e) {
      alert("Ошибка сети при сохранении 3D-каталога");
    } finally {
      setIsSavingCatalog3D(false);
    }
  };

  const handleUpload3DAsset = async (file: File, field: 'glb_url' | 'poster_url') => {
    const pwd = sessionStorage.getItem('super_admin_pwd');
    if (!pwd || !editingProduct) return;
    setIsUploadingAsset(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const formData = new FormData();
      formData.append('password', pwd);
      formData.append('file', file);
      const res = await fetch(`${apiUrl}/api/admin/3d/upload-asset`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setEditingProduct((prev: any) => ({ ...prev, [field]: data.url }));
      } else {
        alert("Ошибка выгрузки файла в R2");
      }
    } catch (e) {
      alert("Ошибка сети при выгрузке файла");
    } finally {
      setIsUploadingAsset(false);
    }
  };

  const handleDownloadPrintZip = async (weddingSlug: string, orderId: string) => {
    const pwd = sessionStorage.getItem('super_admin_pwd');
    if (!pwd || generatingZipId) return;
    setGeneratingZipId(orderId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/orders/print-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, wedding_slug: weddingSlug, order_id: orderId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          const link = document.createElement('a');
          link.href = data.url;
          link.download = `PRINT_${orderId}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        alert("Ошибка при сборке архива для печати.");
      }
    } catch (e) {
      alert("Ошибка сети при сборке архива.");
    } finally {
      setGeneratingZipId(null);
    }
  };

  const handleToggleOrderStatus = async (orderType: 'print' | 'usb_box' | '3d_sculpture', orderId: string, weddingSlug: string = '') => {
    const pwd = sessionStorage.getItem('super_admin_pwd');
    if (!pwd) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/orders/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, order_type: orderType, order_id: orderId, wedding_slug: weddingSlug }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrdersData(prev => {
          if (orderType === 'print') {
            return {
              ...prev,
              print_orders: prev.print_orders.map(o => o.order_id === orderId ? { ...o, shipped: data.shipped } : o)
            };
          } else if (orderType === '3d_sculpture') {
            return {
              ...prev,
              sculpture_orders: (prev.sculpture_orders || []).map(o => o.order_id === orderId ? { ...o, shipped: data.shipped } : o)
            };
          } else {
            return {
              ...prev,
              usb_orders: prev.usb_orders.map(o => o.session_id === orderId ? { ...o, shipped: data.shipped } : o)
            };
          }
        });
      }
    } catch (e) {
      alert("Ошибка при обновлении статуса заказа.");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) fetchDashboardData(password.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('super_admin_pwd');
    setIsAuthenticated(false);
    setStats(null);
    setPassword('');
    setSelectedProject(null);
  };

  // === ОТКРЫТИЕ КОНКРЕТНОЙ СВАДЬБЫ ===
  const openProject = async (slug: string) => {
    window.history.pushState({ view: 'project' }, "");
    setSelectedProject(slug);
    setProjectPhotos([]);
    setProjectExpiry(null);
    const pwd = sessionStorage.getItem('super_admin_pwd');
    if (!pwd) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/weddings/${slug}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        const data = await res.json();
        const fetchedPhotos = data.data;
        setProjectPhotos(fetchedPhotos);
        
        // Форматируем дату
        if (data.expires_at) {
          const dateObj = new Date(data.expires_at);
          setProjectExpiry(dateObj.toLocaleDateString('ru-RU'));
        } else {
          setProjectExpiry("Не задано");
        }
        
        // Подхватываем пароль
        setVipPassword(data.vip_password || "Скрыт (Старый формат)");

        // ЗАГРУЖАЕМ ТЕКУЩИЕ ДАННЫЕ ВЕЕРА
        try {
          const metaRes = await fetch(`${apiUrl}/api/weddings/${slug}/meta`);
          if (metaRes.ok) {
            const metaJson = await metaRes.json();
            if (metaJson.status === 'success') {
              setEventTitle(metaJson.data.title || '');
              setEventSubtitle(metaJson.data.subtitle || '');
              
              setCinemaClipUrl(metaJson.data.cinema_clip_url || '');
              setCinemaPosterUrl(metaJson.data.cinema_poster_url || '');
              setCinemaSecretWord(metaJson.data.cinema_secret_word || '');
              setCinemaYandexUrl(metaJson.data.cinema_yandex_url || '');
              setCinemaFiles(metaJson.data.cinema_files || '');
              setCinemaPremiereAt(metaJson.data.cinema_premiere_at || '');
              
              // Находим оригинальные имена файлов для 3-х обложек (с декодированием URL)
              const cUrls = metaJson.data.covers || [];
              const exactFilenames = fetchedPhotos
                .filter((p: StudioPhoto) => cUrls.some((url: string) => decodeURIComponent(url).includes(p.filename.split('.')[0])))
                .map((p: StudioPhoto) => p.filename);
              setSelectedCovers(exactFilenames);
              setOriginalCovers(exactFilenames); // Сохраняем исходное состояние для кнопки "Отмена"
            }
          }
        } catch (e) {
          console.error("Ошибка загрузки Welcome-зоны", e);
        }
      }
    } catch (err) {
      console.error("Ошибка загрузки фото", err);
    }
  };

  // === УДАЛЕНИЕ ОДНОЙ ФОТОГРАФИИ ===
  const deletePhoto = async (filename: string) => {
    if (!confirm(`Удалить фото ${filename}? Оно будет стерто из облака навсегда.`)) return;
    
    const pwd = sessionStorage.getItem('super_admin_pwd');
    setIsDeleting(filename);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/weddings/${selectedProject}/delete-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, filename }),
      });
      if (res.ok) {
        setProjectPhotos((prev) => prev.filter((p) => p.filename !== filename));
      } else {
        alert("Ошибка при удалении.");
      }
    } catch (err) {
      alert("Ошибка сети.");
    } finally {
      setIsDeleting(null);
    }
  };

  // === СМЕНА VIP ПАРОЛЯ ===
  const changeVipPassword = async () => {
    const current = vipPassword !== "Скрыт (старый формат)" ? vipPassword : "";
    const newPwd = prompt("Введите новый VIP-пароль (только латинские буквы и цифры):", current);
    if (!newPwd || newPwd.trim() === "") return;
    
    const pwd = sessionStorage.getItem('super_admin_pwd');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/weddings/${selectedProject}/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, new_vip_password: newPwd }),
      });
      if (res.ok) {
        alert(`Пароль успешно изменен на: ${newPwd.toUpperCase()}`);
        setVipPassword(newPwd.toUpperCase());
      } else {
        alert("Ошибка при смене пароля. Проверьте логи.");
      }
    } catch (e) {
      alert("Ошибка сети при смене пароля");
    }
  };


  // === ПРОДЛЕНИЕ ПРОЕКТА ===
  const extendProject = async () => {
    const monthsStr = prompt("На сколько МЕСЯЦЕВ вы хотите продлить (или сократить, используя минус) срок хранения этого проекта?", "6");
    if (!monthsStr) return;
    
    const months = parseInt(monthsStr.trim());
    // Убрали проверку months <= 0, теперь можно вводить отрицательные значения!
    if (isNaN(months)) {
      alert("Пожалуйста, введите корректное число.");
      return;
    }

    const pwd = sessionStorage.getItem('super_admin_pwd');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/weddings/${selectedProject}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, months }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setProjectExpiry(data.new_date);
      }
    } catch (e) {
      alert("Ошибка при продлении проекта");
    }
  };

  // === ПОЛНОЕ УДАЛЕНИЕ ПРОЕКТА ===
  const deleteEntireProject = async () => {
    const confirm1 = confirm(`ВНИМАНИЕ! Вы собираетесь ПОЛНОСТЬЮ удалить проект ${selectedProject}. Это сотрет базу и ВСЕ фотографии из Cloudflare R2.\n\nПродолжить?`);
    if (!confirm1) return;
    
    const confirm2 = prompt(`Для подтверждения напишите слово DELETE заглавными буквами:`);
    if (confirm2 !== "DELETE") {
      alert("Удаление отменено.");
      return;
    }

    const pwd = sessionStorage.getItem('super_admin_pwd');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/weddings/${selectedProject}/delete-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        alert("Проект успешно удален.");
        closeProjectViewSafe();
        fetchDashboardData(pwd!);
      } else {
        alert("Ошибка при удалении проекта.");
      }
    } catch (e) {
      alert("Ошибка сети при удалении проекта.");
    }
  };

  // === СОХРАНЕНИЕ И ВЫБОР ОБЛОЖЕК (WELCOME ZONE) ===
  const saveMetaInfo = async () => {
    setIsSavingMeta(true);
    const pwd = sessionStorage.getItem('super_admin_pwd');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/weddings/${selectedProject}/update-meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: pwd,
          title: eventTitle,
          subtitle: eventSubtitle,
          covers: selectedCovers,
          cinema_clip_url: cinemaClipUrl,
          cinema_poster_url: cinemaPosterUrl,
          cinema_secret_word: cinemaSecretWord,
          cinema_yandex_url: cinemaYandexUrl,
          cinema_files: cinemaFiles,
          cinema_premiere_at: cinemaPremiereAt // Отправляем на бэкенд
        }),
      });
      if (res.ok) {
        alert("Welcome-зона успешно обновлена!");
        setOriginalCovers(selectedCovers); // Успешно сохранили -> обновляем базовое состояние
        setIsSelectingCovers(false);
      } else {
        alert("Ошибка при сохранении.");
      }
    } catch (e) {
      alert("Ошибка сети при сохранении.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const openDualQrModal = async (targetSlug: string, lang: 'fr' | 'en' | 'ru' = cardLang) => {
    const pwd = sessionStorage.getItem('super_admin_pwd');
    if (!pwd) return;
    setQrModalSlug(targetSlug);
    setCardLang(lang);
    setIsGeneratingCard(true);
    setGeneratedCards({ vip: null, guest: null });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const [vipRes, guestRes] = await Promise.all([
        fetch(`${apiUrl}/api/weddings/${targetSlug}/collages/invitation-card`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd, card_type: 'vip', language: lang }),
        }),
        fetch(`${apiUrl}/api/weddings/${targetSlug}/collages/invitation-card`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd, card_type: 'guest', language: lang }),
        }),
      ]);

      const vipJson = vipRes.ok ? await vipRes.json() : null;
      const guestJson = guestRes.ok ? await guestRes.json() : null;

      setGeneratedCards({
        vip: vipJson?.url ? `${vipJson.url}?t=${Date.now()}` : null,
        guest: guestJson?.url ? `${guestJson.url}?t=${Date.now()}` : null,
      });
    } catch (e) {
      alert("Ошибка сети при генерации QR-карточек.");
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const triggerCardDownload = (url: string | null, filename: string) => {
    if (!url) return;
    const cleanUrl = `${url.split('?')[0]}?download=true`;
    const link = document.createElement('a');
    link.href = cleanUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleCover = (filename: string) => {
    if (!isSelectingCovers) return;
    
    setSelectedCovers(prev => {
      if (prev.includes(filename)) return prev.filter(f => f !== filename);
      if (prev.length >= 3) {
        alert("Можно выбрать максимум 3 обложки!");
        return prev;
      }
      return [...prev, filename];
    });
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-lux-gold/20 border-t-lux-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-6 text-white font-montserrat select-none">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <h1 className="font-cinzel text-3xl text-lux-gold text-center mb-2 tracking-[0.3em] uppercase">Studio</h1>
          <p className="text-gray-500 text-center text-xs tracking-widest mb-10 uppercase">Secure Access</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Master Password" className="w-full bg-transparent border-b border-white/20 focus:border-lux-gold text-center text-xl p-3 outline-none transition-colors placeholder:text-gray-700 tracking-widest" autoFocus />
            </div>
            {error && <p className="text-red-500 text-center text-sm">{error}</p>}
            <button type="submit" disabled={isLoading || !password} className="w-full py-4 bg-white/5 hover:bg-lux-gold text-gray-300 hover:text-black transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50 border border-white/10 hover:border-lux-gold">
              {isLoading ? "Verifying..." : "Enter Workspace"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-montserrat pb-20">
      <header className="border-b border-white/10 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={closeProjectViewSafe}>
            <span className="font-cinzel text-xl text-lux-gold tracking-widest uppercase hover:text-white transition-colors">Kurginian Studio</span>
            <span className="hidden md:inline-block px-2 py-1 bg-white/10 rounded text-[10px] uppercase tracking-widest text-gray-400">Super Admin</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest">Logout</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        <AnimatePresence mode="wait">
          {!selectedProject ? (
            <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-cinzel text-2xl text-white mb-8 tracking-wider">Global Statistics</h2>
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
                  <div className="bg-[#0f0f0f] border border-white/5 p-6 shadow-2xl relative overflow-hidden group hover:border-lux-gold/30 transition-colors">
                    <div className="text-lux-gold text-4xl font-cinzel mb-2">{stats.active_weddings_count}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest">Active Weddings</div>
                  </div>
                  <div className="bg-[#0f0f0f] border border-white/5 p-6 shadow-2xl relative overflow-hidden group hover:border-lux-gold/30 transition-colors">
                    <div className="text-lux-gold text-4xl font-cinzel mb-2">{stats.total_scans}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest">Faces Scanned</div>
                  </div>
                  <div className="bg-[#0f0f0f] border border-white/5 p-6 shadow-2xl relative overflow-hidden group hover:border-lux-gold/30 transition-colors">
                    <div className="text-lux-gold text-4xl font-cinzel mb-2">{stats.total_downloads}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest">Total Downloads</div>
                  </div>
                  <div className="bg-[#0f0f0f] border border-white/5 p-6 shadow-2xl relative overflow-hidden group hover:border-lux-gold/30 transition-colors">
                    <div className="text-lux-gold text-4xl font-cinzel mb-2">{stats.total_shares}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest">Total Shares</div>
                  </div>
                </div>
              )}

              {/* ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК: ПРОЕКТЫ / ЗАКАЗЫ */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('projects')}
                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all rounded-sm ${
                      activeTab === 'projects'
                        ? 'bg-lux-gold text-black shadow-gold-glow'
                        : 'bg-[#0f0f0f] text-gray-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    Active Projects ({stats?.active_weddings_count || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all rounded-sm flex items-center gap-2.5 ${
                      activeTab === 'orders'
                        ? 'bg-lux-gold text-black shadow-gold-glow'
                        : 'bg-[#0f0f0f] text-gray-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    <span>Orders: Print, USB & 3D</span>
                    {(() => {
                      const pendingCount =
                        ordersData.print_orders.filter(o => !o.shipped).length +
                        ordersData.usb_orders.filter(o => !o.shipped).length +
                        (ordersData.sculpture_orders || []).filter(o => !o.shipped).length;
                      return pendingCount > 0 ? (
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                          activeTab === 'orders' ? 'bg-black text-lux-gold' : 'bg-lux-gold text-black'
                        }`}>
                          {pendingCount} new
                        </span>
                      ) : null;
                    })()}
                  </button>
                  <button
                    onClick={() => setActiveTab('catalog3d')}
                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all rounded-sm ${
                      activeTab === 'catalog3d'
                        ? 'bg-lux-gold text-black shadow-gold-glow'
                        : 'bg-[#0f0f0f] text-gray-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    3D Shop Catalog ({(catalog3D.products || []).length})
                  </button>
                </div>

                {activeTab === 'orders' && (
                  <button
                    onClick={() => {
                      const pwd = sessionStorage.getItem('super_admin_pwd');
                      if (pwd) fetchOrdersData(pwd);
                    }}
                    className="text-xs text-lux-gold hover:text-white uppercase tracking-widest font-mono"
                  >
                    {isLoadingOrders ? 'Refreshing...' : '↻ Refresh Orders'}
                  </button>
                )}
              </div>

              {activeTab === 'catalog3d' ? (
                <div className="space-y-10">
                  {/* === 1. АКЦИОННЫЙ БАННЕР НА ВИТРИНЕ 3D === */}
                  <div className="bg-[#0f0f0f] border border-lux-gold/30 p-6 rounded-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-white/10 pb-4">
                      <div>
                        <h3 className="font-cinzel text-lg text-lux-gold uppercase tracking-widest">Акционный баннер (Promo Banner)</h3>
                        <p className="text-xs text-gray-500 font-mono">Отображается в шапке страницы kurginian.pro/3d</p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs uppercase tracking-widest">
                        <input
                          type="checkbox"
                          checked={catalog3D.promo?.enabled || false}
                          onChange={(e) => setCatalog3D({ ...catalog3D, promo: { ...catalog3D.promo, enabled: e.target.checked } })}
                          className="accent-[#D4AF37] w-4 h-4"
                        />
                        <span className="text-lux-gold font-bold">Активен</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase mb-1">Золотой бейдж</label>
                        <input
                          type="text"
                          value={catalog3D.promo?.badge || ''}
                          onChange={(e) => setCatalog3D({ ...catalog3D, promo: { ...catalog3D.promo, badge: e.target.value } })}
                          placeholder="PROMO -20%"
                          className="w-full bg-black border border-white/10 p-2.5 text-xs text-lux-gold font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase mb-1">Текст акции (FR)</label>
                        <input
                          type="text"
                          value={catalog3D.promo?.text_fr || ''}
                          onChange={(e) => setCatalog3D({ ...catalog3D, promo: { ...catalog3D.promo, text_fr: e.target.value } })}
                          className="w-full bg-black border border-white/10 p-2.5 text-xs text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase mb-1">Текст акции (EN)</label>
                        <input
                          type="text"
                          value={catalog3D.promo?.text_en || ''}
                          onChange={(e) => setCatalog3D({ ...catalog3D, promo: { ...catalog3D.promo, text_en: e.target.value } })}
                          className="w-full bg-black border border-white/10 p-2.5 text-xs text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase mb-1">Текст акции (RU)</label>
                        <input
                          type="text"
                          value={catalog3D.promo?.text_ru || ''}
                          onChange={(e) => setCatalog3D({ ...catalog3D, promo: { ...catalog3D.promo, text_ru: e.target.value } })}
                          className="w-full bg-black border border-white/10 p-2.5 text-xs text-white outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => save3DCatalogToServer(catalog3D)}
                      disabled={isSavingCatalog3D}
                      className="px-5 py-2.5 bg-lux-gold text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
                    >
                      {isSavingCatalog3D ? 'Сохранение...' : 'Сохранить баннер и категории'}
                    </button>
                  </div>

                  {/* === 2. УПРАВЛЕНИЕ КАТЕГОРИЯМИ (ДОБАВЛЕНИЕ / ПЕРЕИМЕНОВАНИЕ / УДАЛЕНИЕ) === */}
                  <div className="bg-[#0f0f0f] border border-white/10 p-6 rounded-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-white/10 pb-4">
                      <div>
                        <h3 className="font-cinzel text-lg text-white uppercase tracking-widest">Категории 3D-магазина</h3>
                        <p className="text-xs text-gray-500 font-mono">Меняйте названия на 3 языках, добавляйте новые или удаляйте</p>
                      </div>
                      <button
                        onClick={() => {
                          const newId = `cat_${Date.now().toString().slice(-4)}`;
                          const updated = {
                            ...catalog3D,
                            categories: [...(catalog3D.categories || []), { id: newId, name_fr: 'Nouvelle', name_en: 'New Category', name_ru: 'Новая категория' }]
                          };
                          setCatalog3D(updated);
                        }}
                        className="px-4 py-2 border border-lux-gold text-lux-gold hover:bg-lux-gold hover:text-black text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        + Добавить категорию
                      </button>
                    </div>

                    <div className="space-y-3 mb-4">
                      {(catalog3D.categories || []).map((cat: any, idx: number) => (
                        <div key={cat.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-black/50 p-3 border border-white/5 items-center">
                          <div className="text-xs font-mono text-gray-500">ID: <span className="text-lux-gold">{cat.id}</span></div>
                          <input
                            type="text"
                            value={cat.name_fr || ''}
                            onChange={(e) => {
                              const next = [...catalog3D.categories];
                              next[idx] = { ...cat, name_fr: e.target.value };
                              setCatalog3D({ ...catalog3D, categories: next });
                            }}
                            placeholder="Название FR"
                            className="bg-[#0a0a0a] border border-white/10 p-2 text-xs text-white outline-none"
                          />
                          <input
                            type="text"
                            value={cat.name_en || ''}
                            onChange={(e) => {
                              const next = [...catalog3D.categories];
                              next[idx] = { ...cat, name_en: e.target.value };
                              setCatalog3D({ ...catalog3D, categories: next });
                            }}
                            placeholder="Название EN"
                            className="bg-[#0a0a0a] border border-white/10 p-2 text-xs text-white outline-none"
                          />
                          <input
                            type="text"
                            value={cat.name_ru || ''}
                            onChange={(e) => {
                              const next = [...catalog3D.categories];
                              next[idx] = { ...cat, name_ru: e.target.value };
                              setCatalog3D({ ...catalog3D, categories: next });
                            }}
                            placeholder="Название RU"
                            className="bg-[#0a0a0a] border border-white/10 p-2 text-xs text-white outline-none"
                          />
                          <button
                            onClick={() => {
                              if (!confirm(`Удалить категорию "${cat.name_ru}"?`)) return;
                              const next = catalog3D.categories.filter((_: any, i: number) => i !== idx);
                              save3DCatalogToServer({ ...catalog3D, categories: next });
                            }}
                            className="text-xs text-red-400 hover:text-red-300 uppercase tracking-widest justify-self-end px-3 py-1 border border-red-500/30"
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => save3DCatalogToServer(catalog3D)}
                      disabled={isSavingCatalog3D}
                      className="px-5 py-2.5 bg-white/10 hover:bg-lux-gold hover:text-black text-white font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      Сохранить изменения категорий
                    </button>
                  </div>

                  {/* === 3. СПИСОК ТОВАРОВ И КНОПКА СОЗДАНИЯ === */}
                  <div className="bg-[#0f0f0f] border border-white/10 p-6 rounded-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                      <div>
                        <h3 className="font-cinzel text-lg text-lux-gold uppercase tracking-widest">Товары 3D-Магазина ({(catalog3D.products || []).length})</h3>
                        <p className="text-xs text-gray-500 font-mono">Статуэтки, кастомные флешки, вазы и декор с 3D-моделями (.glb)</p>
                      </div>
                      <button
                        onClick={() =>
                          setEditingProduct({
                            id: `prod_${Date.now().toString().slice(-5)}`,
                            category: catalog3D.categories?.[0]?.id || 'sculptures',
                            active: true,
                            title_fr: '',
                            title_en: '',
                            title_ru: '',
                            desc_fr: '',
                            desc_en: '',
                            desc_ru: '',
                            glb_url: '',
                            poster_url: '',
                            price: 50,
                            old_price: 0,
                            requires_photo: false,
                            allows_engraving: true,
                            allows_finish_switch: true,
                            allows_custom_size: false,
                            sizes: [
                              { label: 'Standard', price_color: 50, price_mono: 45 }
                            ]
                          })
                        }
                        className="px-5 py-3 bg-lux-gold text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-all shadow-gold-glow"
                      >
                        + Добавить 3D-товар
                      </button>
                    </div>

                    {/* Форма редактирования / создания товара */}
                    {editingProduct && (
                      <div className="bg-black border-2 border-lux-gold p-6 mb-8 rounded-sm space-y-5">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                          <h4 className="font-cinzel text-base text-lux-gold uppercase tracking-widest">
                            Редактирование товара: {editingProduct.title_ru || editingProduct.id}
                          </h4>
                          <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-white text-sm">✕ Закрыть</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Категория</label>
                            <select
                              value={editingProduct.category}
                              onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                              className="w-full bg-[#111] border border-white/20 p-2.5 text-xs text-white outline-none"
                            >
                              {(catalog3D.categories || []).map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name_ru} ({c.name_fr})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Базовая цена (€)</label>
                            <input
                              type="number"
                              value={editingProduct.price}
                              onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-white/20 p-2.5 text-xs text-lux-gold font-bold outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Старая цена до скидки (€, 0 = без акции)</label>
                            <input
                              type="number"
                              value={editingProduct.old_price || 0}
                              onChange={(e) => setEditingProduct({ ...editingProduct, old_price: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-white/20 p-2.5 text-xs text-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Название (FR)</label>
                            <input
                              type="text"
                              value={editingProduct.title_fr}
                              onChange={(e) => setEditingProduct({ ...editingProduct, title_fr: e.target.value })}
                              placeholder="Ex: Coffret USB Cristal 3D"
                              className="w-full bg-[#111] border border-white/20 p-2.5 text-xs text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Название (EN)</label>
                            <input
                              type="text"
                              value={editingProduct.title_en}
                              onChange={(e) => setEditingProduct({ ...editingProduct, title_en: e.target.value })}
                              placeholder="Ex: 3D Crystal USB Drive"
                              className="w-full bg-[#111] border border-white/20 p-2.5 text-xs text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Название (RU)</label>
                            <input
                              type="text"
                              value={editingProduct.title_ru}
                              onChange={(e) => setEditingProduct({ ...editingProduct, title_ru: e.target.value })}
                              placeholder="Например: Кастомная 3D-флешка"
                              className="w-full bg-[#111] border border-white/20 p-2.5 text-xs text-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Описание (FR)</label>
                            <textarea
                              rows={2}
                              value={editingProduct.desc_fr}
                              onChange={(e) => setEditingProduct({ ...editingProduct, desc_fr: e.target.value })}
                              className="w-full bg-[#111] border border-white/20 p-2.5 text-xs text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Описание (EN)</label>
                            <textarea
                              rows={2}
                              value={editingProduct.desc_en}
                              onChange={(e) => setEditingProduct({ ...editingProduct, desc_en: e.target.value })}
                              className="w-full bg-[#111] border border-white/20 p-2.5 text-xs text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Описание (RU)</label>
                            <textarea
                              rows={2}
                              value={editingProduct.desc_ru}
                              onChange={(e) => setEditingProduct({ ...editingProduct, desc_ru: e.target.value })}
                              className="w-full bg-[#111] border border-white/20 p-2.5 text-xs text-white outline-none"
                            />
                          </div>
                        </div>

                        {/* Загрузка 3D-модели .glb и обложки .webp/.jpg в R2 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                          <div>
                            <label className="block text-[10px] text-lux-gold uppercase font-bold mb-1">Файл 3D-модели (.glb)</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editingProduct.glb_url}
                                onChange={(e) => setEditingProduct({ ...editingProduct, glb_url: e.target.value })}
                                placeholder="https://cdn.kurginian.pro/3d_catalog/..."
                                className="flex-1 bg-[#111] border border-white/20 p-2 text-xs text-gray-300 font-mono outline-none"
                              />
                              <label className="px-3 py-2 bg-lux-gold text-black text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-white shrink-0 flex items-center">
                                {isUploadingAsset ? '...' : 'Загрузить .GLB'}
                                <input
                                  type="file"
                                  accept=".glb"
                                  className="hidden"
                                  onChange={(e) => e.target.files?.[0] && handleUpload3DAsset(e.target.files[0], 'glb_url')}
                                />
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-lux-gold uppercase font-bold mb-1">Превью-обложка (.webp / .jpg)</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editingProduct.poster_url}
                                onChange={(e) => setEditingProduct({ ...editingProduct, poster_url: e.target.value })}
                                placeholder="https://cdn.kurginian.pro/3d_catalog/..."
                                className="flex-1 bg-[#111] border border-white/20 p-2 text-xs text-gray-300 font-mono outline-none"
                              />
                              <label className="px-3 py-2 bg-white/15 text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-lux-gold hover:text-black shrink-0 flex items-center">
                                {isUploadingAsset ? '...' : 'Загрузить Фото'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => e.target.files?.[0] && handleUpload3DAsset(e.target.files[0], 'poster_url')}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Опции конструктора для этого товара */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-white/10 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingProduct.requires_photo}
                              onChange={(e) => setEditingProduct({ ...editingProduct, requires_photo: e.target.checked })}
                              className="accent-[#D4AF37]"
                            />
                            <span>Требовать загрузку фото</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingProduct.allows_engraving}
                              onChange={(e) => setEditingProduct({ ...editingProduct, allows_engraving: e.target.checked })}
                              className="accent-[#D4AF37]"
                            />
                            <span>Поле гравировки</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingProduct.allows_finish_switch}
                              onChange={(e) => setEditingProduct({ ...editingProduct, allows_finish_switch: e.target.checked })}
                              className="accent-[#D4AF37]"
                            />
                            <span>Выбор Цвет / Монохром</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingProduct.allows_custom_size}
                              onChange={(e) => setEditingProduct({ ...editingProduct, allows_custom_size: e.target.checked })}
                              className="accent-[#D4AF37]"
                            />
                            <span>Кнопка «Sur-Mesure»</span>
                          </label>
                        </div>

                        {/* Размеры и цены */}
                        <div className="pt-2 border-t border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Варианты размеров / модификаций</span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingProduct({
                                  ...editingProduct,
                                  sizes: [...(editingProduct.sizes || []), { label: 'New', price_color: editingProduct.price, price_mono: editingProduct.price }]
                                })
                              }
                              className="text-[10px] text-lux-gold uppercase border border-lux-gold/40 px-2 py-1"
                            >
                              + Добавить размер
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(editingProduct.sizes || []).map((sz: any, sIdx: number) => (
                              <div key={sIdx} className="grid grid-cols-4 gap-2 items-center">
                                <input
                                  type="text"
                                  value={sz.label}
                                  onChange={(e) => {
                                    const next = [...editingProduct.sizes];
                                    next[sIdx] = { ...sz, label: e.target.value };
                                    setEditingProduct({ ...editingProduct, sizes: next });
                                  }}
                                  placeholder="Размер (напр. 20cm или 64GB)"
                                  className="bg-[#111] border border-white/20 p-2 text-xs text-white"
                                />
                                <input
                                  type="number"
                                  value={sz.price_color}
                                  onChange={(e) => {
                                    const next = [...editingProduct.sizes];
                                    next[sIdx] = { ...sz, price_color: Number(e.target.value) };
                                    setEditingProduct({ ...editingProduct, sizes: next });
                                  }}
                                  placeholder="Цена Покр. 1 (€)"
                                  className="bg-[#111] border border-white/20 p-2 text-xs text-lux-gold"
                                />
                                <input
                                  type="number"
                                  value={sz.price_mono}
                                  onChange={(e) => {
                                    const next = [...editingProduct.sizes];
                                    next[sIdx] = { ...sz, price_mono: Number(e.target.value) };
                                    setEditingProduct({ ...editingProduct, sizes: next });
                                  }}
                                  placeholder="Цена Монохром (€)"
                                  className="bg-[#111] border border-white/20 p-2 text-xs text-gray-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = editingProduct.sizes.filter((_: any, i: number) => i !== sIdx);
                                    setEditingProduct({ ...editingProduct, sizes: next });
                                  }}
                                  className="text-xs text-red-400 uppercase"
                                >
                                  Удалить
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(null)}
                            className="px-5 py-2.5 border border-white/20 text-xs uppercase tracking-widest text-gray-400"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const existingIdx = (catalog3D.products || []).findIndex((p: any) => p.id === editingProduct.id);
                              const nextProducts = [...(catalog3D.products || [])];
                              if (existingIdx >= 0) {
                                nextProducts[existingIdx] = editingProduct;
                              } else {
                                nextProducts.push(editingProduct);
                              }
                              save3DCatalogToServer({ ...catalog3D, products: nextProducts });
                            }}
                            className="px-6 py-2.5 bg-lux-gold text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
                          >
                            Сохранить товар в каталог
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Карточки существующих товаров */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(catalog3D.products || []).map((prod: any) => (
                        <div key={prod.id} className="bg-black/60 border border-white/10 p-4 flex flex-col justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="w-20 h-20 bg-[#111] border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                              {prod.poster_url ? (
                                <img src={prod.poster_url} alt={prod.title_ru} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] text-lux-gold font-mono">3D GLB</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-lux-gold uppercase tracking-widest font-mono">{prod.category}</div>
                              <div className="font-cinzel text-sm text-white truncate">{prod.title_ru || prod.title_fr}</div>
                              <div className="text-xs font-bold text-white mt-1">
                                {prod.price} €
                                {prod.old_price > prod.price && (
                                  <span className="text-gray-500 line-through ml-2 text-[11px]">{prod.old_price} €</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                            <button
                              onClick={() => setEditingProduct(prod)}
                              className="flex-1 py-2 bg-white/10 hover:bg-lux-gold hover:text-black text-xs uppercase tracking-widest transition-all font-bold"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => {
                                if (!confirm(`Удалить товар "${prod.title_ru || prod.title_fr}"?`)) return;
                                const next = catalog3D.products.filter((p: any) => p.id !== prod.id);
                                save3DCatalogToServer({ ...catalog3D, products: next });
                              }}
                              className="px-3 py-2 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white text-xs uppercase tracking-widest transition-all"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeTab === 'projects' ? (
                <div className="bg-[#0f0f0f] border border-white/5 rounded-sm overflow-hidden">
                  {stats?.active_weddings_list?.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {stats.active_weddings_list.map((slug: string) => (
                        <div key={slug} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openProject(slug)}>
                          <div className="font-mono text-sm text-gray-300 group-hover:text-lux-gold transition-colors">{slug}</div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/weddings/${slug}`, '_blank'); }}
                              className="px-4 py-2 bg-transparent border border-white/20 text-xs text-white hover:border-lux-gold hover:text-lux-gold transition-all uppercase tracking-widest"
                            >
                              Open
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openDualQrModal(slug, cardLang); }}
                              className="px-4 py-2 bg-lux-gold/10 border border-lux-gold/50 text-xs text-lux-gold hover:bg-lux-gold hover:text-black transition-all uppercase tracking-widest font-bold"
                            >
                              QR Code
                            </button>
                            <div className="px-4 py-2 bg-lux-gold border border-lux-gold text-xs text-black hover:bg-white hover:border-white transition-all uppercase tracking-widest font-bold">
                              Manage
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center text-gray-600 font-mono text-sm">No active projects found.</div>
                  )}
                </div>
              ) : (
                <div className="space-y-10">
                  {/* === БЛОК 1: ЗАКАЗЫ НА ПЕЧАТЬ ФОТОГРАФИЙ === */}
                  <div>
                    <h3 className="font-cinzel text-lg text-lux-gold uppercase tracking-widest mb-4">
                      Print Orders ({ordersData.print_orders.length})
                    </h3>
                    {ordersData.print_orders.length === 0 ? (
                      <div className="bg-[#0f0f0f] border border-white/5 p-8 text-center text-gray-600 font-mono text-xs">
                        Нет оплаченных заказов на печать.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {ordersData.print_orders.map((order) => {
                          const addr = order.customer?.address || {};
                          const formattedAddress = [addr.line1, addr.line2, `${addr.postal_code || ''} ${addr.city || ''}`.trim(), addr.country]
                            .filter(Boolean)
                            .join(', ');
                          const totalPhotos = (order.items || []).reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);

                          return (
                            <div
                              key={order.order_id}
                              className={`bg-[#0f0f0f] border p-6 rounded-sm transition-all ${
                                order.shipped ? 'border-white/5 opacity-60' : 'border-lux-gold/40 shadow-gold-glow'
                              }`}
                            >
                              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/10 pb-4 mb-4">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="font-mono text-sm font-bold text-lux-gold">{order.order_id}</span>
                                  <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded text-gray-300">{order.wedding_slug}</span>
                                  <span className="text-xs text-gray-500 font-mono">
                                    {order.created_at ? new Date(order.created_at).toLocaleString('ru-RU') : ''}
                                  </span>
                                  {order.shipped ? (
                                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm">
                                      ✓ Отправлено
                                    </span>
                                  ) : (
                                    <span className="bg-lux-gold/20 text-lux-gold border border-lux-gold/40 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm">
                                      ● Ожидает отправки
                                    </span>
                                  )}
                                </div>
                                <div className="font-cinzel text-xl text-white font-bold">
                                  {order.payment_info?.amount_paid ?? order.total_amount} €
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Клиент и доставка</div>
                                  <div className="text-sm font-bold text-white">{order.customer?.name || 'Имя не указано'}</div>
                                  <div className="text-xs text-gray-400 font-mono mb-2">{order.customer?.email || ''}</div>
                                  <div className="text-xs text-gray-300 bg-black/50 p-3 border border-white/5 font-mono leading-relaxed flex items-start justify-between gap-2">
                                    <span>{formattedAddress || 'Адрес не указан'}</span>
                                    {formattedAddress && (
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${order.customer?.name || ''}\n${formattedAddress}`);
                                          alert('Адрес скопирован!');
                                        }}
                                        className="text-[10px] text-lux-gold hover:text-white uppercase shrink-0 border border-lux-gold/30 px-2 py-1"
                                      >
                                        Copy
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                                    Состав заказа ({totalPhotos} фото)
                                  </div>
                                  <div className="bg-black/50 border border-white/5 p-3 max-h-32 overflow-y-auto space-y-1.5 font-mono text-xs">
                                    {(order.items || []).map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between text-gray-300">
                                        <span>{item.filename}</span>
                                        <span className="text-lux-gold font-bold">{item.size} × {item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-3">
                                <button
                                  onClick={() => handleToggleOrderStatus('print', order.order_id, order.wedding_slug)}
                                  className="px-4 py-2.5 border border-white/20 text-xs uppercase tracking-widest hover:border-white transition-colors"
                                >
                                  {order.shipped ? 'Вернуть в работу' : '✓ Отметить отправленным'}
                                </button>
                                <button
                                  onClick={() => handleDownloadPrintZip(order.wedding_slug, order.order_id)}
                                  disabled={generatingZipId === order.order_id}
                                  className="px-5 py-2.5 bg-lux-gold text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                                >
                                  {generatingZipId === order.order_id ? 'Сборка архива...' : 'Скачать ZIP для типографии'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* === БЛОК 2: ЗАКАЗЫ SIGNATURE USB BOX === */}
                  <div>
                    <h3 className="font-cinzel text-lg text-lux-gold uppercase tracking-widest mb-4">
                      Signature USB Box Orders ({ordersData.usb_orders.length})
                    </h3>
                    {ordersData.usb_orders.length === 0 ? (
                      <div className="bg-[#0f0f0f] border border-white/5 p-8 text-center text-gray-600 font-mono text-xs">
                        Нет оплаченных заказов на USB-футляры.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {ordersData.usb_orders.map((usb) => (
                          <div
                            key={usb.session_id}
                            className={`bg-[#0f0f0f] border p-6 rounded-sm transition-all ${
                              usb.shipped ? 'border-white/5 opacity-60' : 'border-lux-gold/40 shadow-gold-glow'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/10 pb-4 mb-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-mono text-sm font-bold text-lux-gold">
                                  USB BOX × {usb.quantity} шт.
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {usb.created_at ? new Date(usb.created_at).toLocaleString('ru-RU') : ''}
                                </span>
                                {usb.shipped ? (
                                  <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm">
                                    ✓ Отправлено
                                  </span>
                                ) : (
                                  <span className="bg-lux-gold/20 text-lux-gold border border-lux-gold/40 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm">
                                    ● Ожидает отправки
                                  </span>
                                )}
                              </div>
                              <div className="font-cinzel text-xl text-white font-bold">
                                {usb.amount_paid} €
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                              <div className="flex-1">
                                <div className="text-sm font-bold text-white">{usb.customer?.name || 'Имя не указано'}</div>
                                <div className="text-xs text-gray-400 font-mono mb-2">{usb.customer?.email || ''}</div>
                                <div className="text-xs text-gray-300 bg-black/50 p-3 border border-white/5 font-mono flex items-start justify-between gap-2">
                                  <span>{usb.customer?.address_formatted || 'Адрес не указан'}</span>
                                  {usb.customer?.address_formatted && (
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(`${usb.customer?.name || ''}\n${usb.customer?.address_formatted}`);
                                        alert('Адрес скопирован!');
                                      }}
                                      className="text-[10px] text-lux-gold hover:text-white uppercase shrink-0 border border-lux-gold/30 px-2 py-1"
                                    >
                                      Copy
                                    </button>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => handleToggleOrderStatus('usb_box', usb.session_id)}
                                className="px-4 py-2.5 border border-white/20 text-xs uppercase tracking-widest hover:border-white transition-colors shrink-0"
                              >
                                {usb.shipped ? 'Вернуть в работу' : '✓ Отметить отправленным'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* === БЛОК 3: ЗАКАЗЫ НА 3D-СКУЛЬПТУРЫ === */}
                  <div>
                    <h3 className="font-cinzel text-lg text-lux-gold uppercase tracking-widest mb-4">
                      3D Sculpture Orders ({(ordersData.sculpture_orders || []).length})
                    </h3>
                    {(!ordersData.sculpture_orders || ordersData.sculpture_orders.length === 0) ? (
                      <div className="bg-[#0f0f0f] border border-white/5 p-8 text-center text-gray-600 font-mono text-xs">
                        Нет заказов на 3D-скульптуры.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {ordersData.sculpture_orders.map((sc) => (
                          <div
                            key={sc.order_id}
                            className={`bg-[#0f0f0f] border p-6 rounded-sm transition-all ${
                              sc.shipped ? 'border-white/5 opacity-60' : 'border-lux-gold/40 shadow-gold-glow'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/10 pb-4 mb-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-mono text-sm font-bold text-lux-gold">{sc.order_id}</span>
                                <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded text-white">
                                  {sc.size} • {sc.finish}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {sc.created_at ? new Date(sc.created_at).toLocaleString('ru-RU') : ''}
                                </span>
                                {sc.shipped ? (
                                  <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm">
                                    ✓ Завершено / Отправлено
                                  </span>
                                ) : sc.status === 'custom_inquiry' ? (
                                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm">
                                    ★ Спецзапрос (Sur-Mesure)
                                  </span>
                                ) : (
                                  <span className="bg-lux-gold/20 text-lux-gold border border-lux-gold/40 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm">
                                    ● Ожидает 3D-моделирования
                                  </span>
                                )}
                              </div>
                              <div className="font-cinzel text-xl text-white font-bold">
                                {sc.amount_paid > 0 ? `${sc.amount_paid} €` : 'Sur devis'}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Клиент и Контакты</div>
                                <div className="text-sm font-bold text-white">{sc.customer?.name || 'Имя не указано'}</div>
                                <div className="text-xs text-lux-gold font-mono mt-0.5 mb-1">{sc.customer?.phone || ''}</div>
                                <div className="text-xs text-gray-400 font-mono mb-2">{sc.customer?.email || ''}</div>
                                <div className="text-xs text-gray-300 bg-black/50 p-3 border border-white/5 font-mono flex items-start justify-between gap-2">
                                  <span>{sc.customer?.address_formatted || 'Адрес не указан'}</span>
                                  {sc.customer?.address_formatted && (
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(`${sc.customer?.name || ''}\n${sc.customer?.address_formatted}`);
                                        alert('Адрес скопирован!');
                                      }}
                                      className="text-[10px] text-lux-gold hover:text-white uppercase shrink-0 border border-lux-gold/30 px-2 py-1"
                                    >
                                      Copy
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Детали скульптуры</div>
                                  <div className="bg-black/50 border border-white/5 p-3 text-xs font-mono space-y-1">
                                    <div><span className="text-gray-500">Гравировка:</span> <span className="text-lux-gold">{sc.engraving || 'Без гравировки'}</span></div>
                                    <div><span className="text-gray-500">Пожелания:</span> <span className="text-gray-300">{sc.notes || 'Нет'}</span></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
                                    Исходные фото клиента ({(sc.photo_urls || []).length})
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    {(sc.photo_urls || []).map((url: string, idx: number) => (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative w-16 h-16 bg-black border border-lux-gold/40 hover:border-lux-gold overflow-hidden rounded-sm group"
                                        title="Открыть оригинал в новой вкладке"
                                      >
                                        <img src={url} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-3">
                              {sc.customer?.phone && (
                                <a
                                  href={`https://wa.me/${sc.customer.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2.5 bg-green-600/20 border border-green-500/40 text-green-400 hover:bg-green-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                  Написать клиенту в WhatsApp
                                </a>
                              )}
                              <button
                                onClick={() => handleToggleOrderStatus('3d_sculpture', sc.order_id)}
                                className="px-4 py-2.5 border border-white/20 text-xs uppercase tracking-widest hover:border-white transition-colors"
                              >
                                {sc.shipped ? 'Вернуть в работу' : '✓ Отметить отправленным'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="project-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <button 
                onClick={closeProjectViewSafe} 
                className="text-gray-500 hover:text-white uppercase tracking-widest text-xs mb-6 flex items-center gap-2 transition-colors group"
              >
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Dashboard
              </button>
              
              {/* === ПАНЕЛЬ УПРАВЛЕНИЯ ПРОЕКТОМ === */}
              <div className="bg-[#0a0a0a] border border-white/10 p-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="font-cinzel text-3xl text-lux-gold tracking-wider mb-2">{selectedProject}</h2>
                  <div className="flex flex-col gap-2 text-xs font-mono text-gray-400">
                    <div className="flex items-center gap-4">
                      <span>{projectPhotos.length} Photos</span>
                      <span>|</span>
                      <span>
                        Доступен до: <strong className="text-white">{projectExpiry || "Загрузка..."}</strong>
                      </span>
                    </div>
                    {/* СТРОКА С ПАРОЛЕМ */}
                    <div className="flex items-center gap-3">
                      <span>VIP Пароль: <strong className="text-lux-gold tracking-widest">{vipPassword || "Загрузка..."}</strong></span>
                      <button 
                        onClick={changeVipPassword} 
                        className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[10px] uppercase transition-colors"
                      >
                        Изменить
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button onClick={extendProject} className="w-full sm:w-auto px-5 py-3 border border-lux-gold/50 text-lux-gold hover:bg-lux-gold hover:text-black transition-colors text-xs font-bold tracking-widest uppercase">
                    Продлить проект
                  </button>
                  <button onClick={deleteEntireProject} className="w-full sm:w-auto px-5 py-3 bg-red-900/40 border border-red-500 text-red-400 hover:bg-red-600 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase">
                    Удалить проект
                  </button>
                </div>
              </div>

              {/* === РЕДАКТОР WELCOME-ЗОНЫ === */}
              <div className="bg-[#111] border border-lux-gold/30 p-6 mb-8 rounded-sm shadow-gold-glow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h3 className="font-cinzel text-xl text-lux-gold tracking-widest uppercase">Редактор Welcome-зоны</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Настройте обложку и текст, которые увидят гости</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (isSelectingCovers) {
                          setSelectedCovers(originalCovers); // Откат к сохраненному состоянию
                          setIsSelectingCovers(false);
                        } else {
                          setIsSelectingCovers(true);
                        }
                      }} 
                      className={`px-4 py-2 text-[10px] md:text-xs font-bold tracking-widest uppercase border transition-all ${isSelectingCovers ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-transparent text-white border-white/30 hover:border-white'}`}
                    >
                      {isSelectingCovers ? "Отменить выбор" : "Выбрать обложки (3)"}
                    </button>
                    <button 
                      onClick={saveMetaInfo} 
                      disabled={isSavingMeta}
                      className="px-6 py-2 bg-lux-gold text-black text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-white transition-all shadow-gold-glow disabled:opacity-50"
                    >
                      {isSavingMeta ? "..." : "Сохранить"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">Имена молодоженов</label>
                    <input 
                      type="text" 
                      value={eventTitle} 
                      onChange={(e) => setEventTitle(e.target.value)} 
                      placeholder="David & Edita" 
                      className="w-full bg-[#0a0a0a] border border-white/10 focus:border-lux-gold p-3 text-white outline-none transition-colors font-cinzel text-lg tracking-wider" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">Дата и локация</label>
                    <input 
                      type="text" 
                      value={eventSubtitle} 
                      onChange={(e) => setEventSubtitle(e.target.value)} 
                      placeholder="6 Décembre 2026 • Paris, France" 
                      className="w-full bg-[#0a0a0a] border border-white/10 focus:border-lux-gold p-3 text-white outline-none transition-colors font-cormorant italic text-lg tracking-wide" 
                    />
                  </div>
                </div>

                {/* === НАСТРОЙКИ PREMIUM CINEMA === */}
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h4 className="font-cinzel text-lg text-lux-gold tracking-widest uppercase mb-4 flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.5 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-4.5c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25m0-5.25C18 5.004 18.504 4.5 19.125 4.5H20.625" />
                    </svg>
                    Premium Cinema (Landing kurginian.pro)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ссылка на видео (Clip .mp4)</label>
                      <input 
                        type="text" value={cinemaClipUrl} onChange={(e) => setCinemaClipUrl(e.target.value)} 
                        placeholder="./clip.mp4 или https://..." 
                        className="w-full bg-[#0a0a0a] border border-white/10 focus:border-lux-gold p-2.5 text-white outline-none font-mono text-xs transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ссылка на постер (По умолчанию: ./cover.jpg)</label>
                      <input 
                        type="text" value={cinemaPosterUrl} onChange={(e) => setCinemaPosterUrl(e.target.value)} 
                        placeholder="./cover.jpg (подхватится автоматически)" 
                        className="w-full bg-[#0a0a0a] border border-white/10 focus:border-lux-gold p-2.5 text-white outline-none font-mono text-xs transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ссылка на Яндекс.Диск (Фильм)</label>
                      <input 
                        type="text" value={cinemaYandexUrl} onChange={(e) => setCinemaYandexUrl(e.target.value)} 
                        placeholder="https://disk.yandex.ru/d/..." 
                        className="w-full bg-[#0a0a0a] border border-white/10 focus:border-lux-gold p-2.5 text-white outline-none font-mono text-xs transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Секретное слово доступа</label>
                      <input 
                        type="text" value={cinemaSecretWord} onChange={(e) => setCinemaSecretWord(e.target.value)} 
                        placeholder="Например: premium" 
                        className="w-full bg-[#0a0a0a] border border-white/10 focus:border-lux-gold p-2.5 text-lux-gold outline-none font-mono text-xs tracking-widest transition-colors uppercase" 
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Файлы фильма на Яндексе (через запятую)</label>
                      <input 
                        type="text" value={cinemaFiles} onChange={(e) => setCinemaFiles(e.target.value)} 
                        placeholder="1_L&A_(Clip).mp4, 2_L&A_(Film).mp4" 
                        className="w-full bg-[#0a0a0a] border border-white/10 focus:border-lux-gold p-2.5 text-white outline-none font-mono text-xs transition-colors" 
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] text-lux-gold uppercase tracking-widest mb-1 font-bold">Дата и время ПРЕМЬЕРЫ (Оставить пустым для доступа)</label>
                      <input 
                        type="datetime-local" value={cinemaPremiereAt} onChange={(e) => setCinemaPremiereAt(e.target.value)} 
                        className="w-full bg-[#0a0a0a] border border-lux-gold/30 focus:border-lux-gold p-2 text-lux-gold outline-none font-mono text-xs transition-colors" 
                      />
                    </div>
                  </div>
                </div>

                {/* === БЫСТРЫЙ ВЫЗОВ ГЕНЕРАТОРА QR-КАРТОЧЕК ИЗ ПРОЕКТА === */}
                <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <h4 className="font-cinzel text-lg text-lux-gold tracking-widest uppercase mb-1">
                      QR-карточки приглашения (VIP + Гости)
                    </h4>
                    <p className="text-xs text-gray-400 font-mono">
                      Одновременно создает карточку для молодоженов (с VIP-паролем) и карточку для гостей (без пароля)
                    </p>
                  </div>

                  <button
                    onClick={() => openDualQrModal(selectedProject, cardLang)}
                    className="px-6 py-3 bg-lux-gold text-black text-xs font-bold uppercase tracking-widest hover:bg-white transition-all shadow-gold-glow"
                  >
                    Открыть QR-карточки (2 шт.)
                  </button>
                </div>
              </div>

              {/* === СЕТКА ФОТОГРАФИЙ === */}
              {projectPhotos.length === 0 ? (
                <div className="text-center py-20 text-gray-500">Loading images...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {projectPhotos.map((photo) => {
                    const isCover = selectedCovers.includes(photo.filename);
                    return (
                      <div 
                        key={photo.filename} 
                        onClick={() => toggleCover(photo.filename)}
                        className={`relative group aspect-square bg-[#111] rounded-sm overflow-hidden transition-all ${
                          isCover ? 'border-2 border-lux-gold shadow-gold-glow scale-[0.98]' : 'border border-white/10'
                        } ${isSelectingCovers ? 'cursor-pointer hover:border-lux-gold/50' : ''}`}
                      >
                        <Image 
                          src={photo.urls.thumb} 
                          alt={photo.filename} 
                          fill 
                          className={`object-cover transition-opacity ${isDeleting === photo.filename ? 'opacity-20' : 'group-hover:opacity-80'} ${isSelectingCovers && !isCover ? 'opacity-50' : ''}`} 
                          sizes="20vw"
                        />
                        
                        {/* Золотой бейдж "COVER" */}
                        {isCover && (
                          <div className="absolute top-2 left-2 bg-lux-gold text-black text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-lg z-10">
                            Cover
                          </div>
                        )}

                        {/* Кнопка удаления (Скрывается во время режима выбора обложек) */}
                        {!isSelectingCovers && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deletePhoto(photo.filename); }} 
                            disabled={isDeleting === photo.filename} 
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-100 scale-75 shadow-lg z-10 disabled:bg-gray-500"
                          >
                            {isDeleting === photo.filename ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* === ГЛОБАЛЬНОЕ ОКНО С ДВУМЯ QR-КАРТОЧКАМИ (VIP + GUEST) === */}
        <AnimatePresence>
          {qrModalSlug && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQrModalSlug(null)}
              className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0a0a0a] border border-lux-gold/30 p-6 md:p-8 rounded-sm max-w-3xl w-full shadow-2xl my-auto"
              >
                {/* Шапка окна с выбором языка */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
                  <div>
                    <h3 className="font-cinzel text-xl text-lux-gold uppercase tracking-widest">
                      QR Cards • {qrModalSlug}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      Оба варианта готовы: для молодоженов (с VIP-кодом) и для гостей банкета
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex bg-[#111] p-1 border border-white/10 rounded-sm">
                      {(['fr', 'en', 'ru'] as const).map((lng) => (
                        <button
                          key={lng}
                          disabled={isGeneratingCard}
                          onClick={() => openDualQrModal(qrModalSlug, lng)}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                            cardLang === lng ? 'bg-lux-gold text-black' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {lng}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setQrModalSlug(null)}
                      className="p-2 text-gray-500 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Контент: Спиннер или 2 карточки рядом */}
                {isGeneratingCard ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-2 border-lux-gold/20 border-t-lux-gold rounded-full animate-spin" />
                    <span className="text-xs font-mono uppercase tracking-widest text-lux-gold animate-pulse">
                      Генерация VIP и Guest карточек...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                      {/* Карточка 1: VIP (с паролем) */}
                      <div className="flex flex-col items-center bg-[#111] border border-white/10 p-4 rounded-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-lux-gold mb-3">
                          1. VIP (С паролем для молодоженов)
                        </span>
                        <div className="relative w-full max-w-[260px] aspect-[2/3] bg-[#050505] border border-lux-gold/30 mb-4 overflow-hidden">
                          {generatedCards.vip ? (
                            <img src={generatedCards.vip} alt="VIP QR Card" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">Ошибка</div>
                          )}
                        </div>
                        <button
                          onClick={() => triggerCardDownload(generatedCards.vip, `KURGINIAN_${qrModalSlug}_VIP_QR.jpg`)}
                          disabled={!generatedCards.vip}
                          className="w-full py-3 bg-white/10 hover:bg-lux-gold hover:text-black text-white text-xs font-bold uppercase tracking-widest transition-all"
                        >
                          Скачать только VIP
                        </button>
                      </div>

                      {/* Карточка 2: Guest (без пароля) */}
                      <div className="flex flex-col items-center bg-[#111] border border-white/10 p-4 rounded-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-3">
                          2. Guest (Без пароля — для гостей)
                        </span>
                        <div className="relative w-full max-w-[260px] aspect-[2/3] bg-[#050505] border border-white/20 mb-4 overflow-hidden">
                          {generatedCards.guest ? (
                            <img src={generatedCards.guest} alt="Guest QR Card" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">Ошибка</div>
                          )}
                        </div>
                        <button
                          onClick={() => triggerCardDownload(generatedCards.guest, `KURGINIAN_${qrModalSlug}_GUEST_QR.jpg`)}
                          disabled={!generatedCards.guest}
                          className="w-full py-3 bg-white/10 hover:bg-lux-gold hover:text-black text-white text-xs font-bold uppercase tracking-widest transition-all"
                        >
                          Скачать только Guest
                        </button>
                      </div>
                    </div>

                    {/* Нижняя панель: Скачать обе сразу */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          triggerCardDownload(generatedCards.vip, `KURGINIAN_${qrModalSlug}_VIP_QR.jpg`);
                          setTimeout(() => {
                            triggerCardDownload(generatedCards.guest, `KURGINIAN_${qrModalSlug}_GUEST_QR.jpg`);
                          }, 400);
                        }}
                        disabled={!generatedCards.vip || !generatedCards.guest}
                        className="flex-1 py-4 bg-lux-gold text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-all shadow-gold-glow"
                      >
                        Скачать обе карточки (VIP + Guest)
                      </button>
                      <button
                        onClick={() => setQrModalSlug(null)}
                        className="px-8 py-4 bg-[#151515] border border-white/10 text-gray-400 hover:text-white text-xs uppercase tracking-widest"
                      >
                        Закрыть
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}