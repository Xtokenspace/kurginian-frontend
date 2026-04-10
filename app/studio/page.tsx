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

  useEffect(() => {
    const savedPassword = sessionStorage.getItem('super_admin_pwd');
    if (savedPassword) {
      fetchDashboardData(savedPassword);
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
      } else {
        setError('Неверный мастер-пароль');
        sessionStorage.removeItem('super_admin_pwd');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
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
        setProjectPhotos(data.data);
        
        // Форматируем дату, если она есть
        if (data.expires_at) {
          const dateObj = new Date(data.expires_at);
          setProjectExpiry(dateObj.toLocaleDateString('ru-RU'));
        } else {
          setProjectExpiry("Не задано");
        }
        
        // Подхватываем пароль
        setVipPassword(data.vip_password || "Скрыт (Старый формат)");
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
    const monthsStr = prompt("На сколько МЕСЯЦЕВ вы хотите продлить (или задать) срок хранения этого проекта?", "6");
    if (!monthsStr) return;
    
    const months = parseInt(monthsStr.trim());
    if (isNaN(months) || months <= 0) {
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
        setSelectedProject(null);
        fetchDashboardData(pwd!); // Обновляем дашборд
      } else {
        alert("Ошибка при удалении проекта.");
      }
    } catch (e) {
      alert("Ошибка сети при удалении проекта.");
    }
  };

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
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedProject(null)}>
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

              <h2 className="font-cinzel text-2xl text-white mb-6 tracking-wider">Active Projects</h2>
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
            </motion.div>
          ) : (
            <motion.div key="project-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <button onClick={() => setSelectedProject(null)} className="text-gray-500 hover:text-white uppercase tracking-widest text-xs mb-6 flex items-center gap-2 transition-colors">← Back to Dashboard</button>
              
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

              {projectPhotos.length === 0 ? (
                <div className="text-center py-20 text-gray-500">Loading images...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {projectPhotos.map((photo) => (
                    <div key={photo.filename} className="relative group aspect-square bg-[#111] border border-white/10 rounded-sm overflow-hidden">
                      <Image src={photo.urls.thumb} alt={photo.filename} fill className={`object-cover transition-opacity ${isDeleting === photo.filename ? 'opacity-20' : 'group-hover:opacity-60'}`} sizes="20vw"/>
                      <button onClick={() => deletePhoto(photo.filename)} disabled={isDeleting === photo.filename} className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-100 scale-75 shadow-lg z-10 disabled:bg-gray-500">
                        {isDeleting === photo.filename ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>✕</span>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}