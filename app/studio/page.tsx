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

  // === СТЕЙТЫ УПРАВЛЕНИЯ ЗАКАЗАМИ (PRINT & USB BOX) ===
  const [activeTab, setActiveTab] = useState<'projects' | 'orders'>('projects');
  const [ordersData, setOrdersData] = useState<{ print_orders: any[]; usb_orders: any[] }>({ print_orders: [], usb_orders: [] });
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [generatingZipId, setGeneratingZipId] = useState<string | null>(null);

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

  const handleToggleOrderStatus = async (orderType: 'print' | 'usb_box', orderId: string, weddingSlug: string = '') => {
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
                    <span>Orders: Print & USB</span>
                    {(() => {
                      const pendingCount =
                        ordersData.print_orders.filter(o => !o.shipped).length +
                        ordersData.usb_orders.filter(o => !o.shipped).length;
                      return pendingCount > 0 ? (
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                          activeTab === 'orders' ? 'bg-black text-lux-gold' : 'bg-lux-gold text-black'
                        }`}>
                          {pendingCount} new
                        </span>
                      ) : null;
                    })()}
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

              {activeTab === 'projects' ? (
                <div className="bg-[#0f0f0f] border border-white/5 rounded-sm overflow-hidden">
                  {stats?.active_weddings_list?.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {stats.active_weddings_list.map((slug: string) => (
                        <div key={slug} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openProject(slug)}>
                          <div className="font-mono text-sm text-gray-300 group-hover:text-lux-gold transition-colors">{slug}</div>
                          <div className="flex items-center gap-3">
                            <button onClick={(e) => { e.stopPropagation(); window.open(`/weddings/${slug}`, '_blank'); }} className="px-4 py-2 bg-transparent border border-white/20 text-xs text-white hover:border-lux-gold hover:text-lux-gold transition-all uppercase tracking-widest">Guest</button>
                            <button onClick={(e) => { e.stopPropagation(); window.open(`/weddings/${slug}/admin`, '_blank'); }} className="px-4 py-2 bg-transparent border border-white/20 text-xs text-white hover:border-lux-gold hover:text-lux-gold transition-all uppercase tracking-widest">VIP</button>
                            <div className="px-4 py-2 bg-lux-gold border border-lux-gold text-xs text-black hover:bg-white hover:border-white transition-all uppercase tracking-widest font-bold">Manage</div>
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
      </main>
    </div>
  );
}