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
  
  // === НОВЫЕ СТЕЙТЫ ДЛЯ УПРАВЛЕНИЯ ПРОЕКТОМ ===
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectPhotos, setProjectPhotos] = useState<StudioPhoto[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Хранит filename удаляемого фото

  // Проверка сессии при старте
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
      }
    } catch (err) {
      console.error("Ошибка загрузки фото", err);
    }
  };

  // === УДАЛЕНИЕ ФОТОГРАФИИ ===
  const deletePhoto = async (filename: string) => {
    if (!confirm(`Вы уверены, что хотите НАВСЕГДА удалить фото ${filename}? Оно будет стерто из облака.`)) return;
    
    const pwd = sessionStorage.getItem('super_admin_pwd');
    if (!pwd) return;

    setIsDeleting(filename);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/admin/weddings/${selectedProject}/delete-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, filename }),
      });

      if (res.ok) {
        // Убираем удаленное фото из интерфейса мгновенно
        setProjectPhotos((prev) => prev.filter((p) => p.filename !== filename));
      } else {
        alert("Ошибка при удалении. Проверьте логи сервера.");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка сети при удалении.");
    } finally {
      setIsDeleting(null);
    }
  };

  // === ЭКРАН ВХОДА ===
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-6 text-white font-montserrat select-none">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <h1 className="font-cinzel text-3xl text-lux-gold text-center mb-2 tracking-[0.3em] uppercase">Studio</h1>
          <p className="text-gray-500 text-center text-xs tracking-widest mb-10 uppercase">Secure Access</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Master Password"
                className="w-full bg-transparent border-b border-white/20 focus:border-lux-gold text-center text-xl p-3 outline-none transition-colors placeholder:text-gray-700 tracking-widest"
                autoFocus
              />
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

  // === ИНТЕРФЕЙС ===
  return (
    <div className="min-h-screen bg-[#050505] text-white font-montserrat pb-20">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedProject(null)}>
            <span className="font-cinzel text-xl text-lux-gold tracking-widest uppercase hover:text-white transition-colors">Kurginian Studio</span>
            <span className="hidden md:inline-block px-2 py-1 bg-white/10 rounded text-[10px] uppercase tracking-widest text-gray-400">Super Admin</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        <AnimatePresence mode="wait">
          
          {/* ==================================================== */}
          {/* ВЬЮ 1: ГЛОБАЛЬНЫЙ ДАШБОРД (СПИСОК ПРОЕКТОВ И ЦИФРЫ) */}
          {/* ==================================================== */}
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
                          <button onClick={(e) => { e.stopPropagation(); window.open(`/weddings/${slug}`, '_blank'); }} className="px-4 py-2 bg-transparent border border-white/20 text-xs text-white hover:border-lux-gold hover:text-lux-gold transition-all uppercase tracking-widest">
                            Guest
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); window.open(`/weddings/${slug}/admin`, '_blank'); }} className="px-4 py-2 bg-transparent border border-white/20 text-xs text-white hover:border-lux-gold hover:text-lux-gold transition-all uppercase tracking-widest">
                            VIP
                          </button>
                          <div className="px-4 py-2 bg-lux-gold border border-lux-gold text-xs text-black hover:bg-white hover:border-white transition-all uppercase tracking-widest font-bold">
                            Manage
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-gray-600 font-mono text-sm">
                    No active projects found.
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            
          /* ==================================================== */
          /* ВЬЮ 2: УПРАВЛЕНИЕ КОНКРЕТНЫМ ПРОЕКТОМ (РЕДАКТОР)   */
          /* ==================================================== */
            <motion.div key="project-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <button onClick={() => setSelectedProject(null)} className="text-gray-500 hover:text-white uppercase tracking-widest text-xs mb-2 flex items-center gap-2 transition-colors">
                    ← Back to Dashboard
                  </button>
                  <h2 className="font-cinzel text-3xl text-lux-gold tracking-wider">{selectedProject}</h2>
                  <p className="text-gray-400 font-mono text-sm mt-1">{projectPhotos.length} photos loaded</p>
                </div>
              </div>

              {projectPhotos.length === 0 ? (
                <div className="text-center py-20 text-gray-500">Loading images...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {projectPhotos.map((photo) => (
                    <div key={photo.filename} className="relative group aspect-square bg-[#111] border border-white/10 rounded-sm overflow-hidden">
                      <Image 
                        src={photo.urls.thumb} 
                        alt={photo.filename} 
                        fill 
                        className={`object-cover transition-opacity ${isDeleting === photo.filename ? 'opacity-20' : 'group-hover:opacity-60'}`}
                        sizes="20vw"
                      />
                      
                      {/* Оверлей при наведении */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-none">
                        <div className="text-[9px] bg-black/60 text-white/70 px-1 py-0.5 rounded backdrop-blur-md self-start font-mono">
                          {photo.filename}
                        </div>
                      </div>

                      {/* Кнопка удаления (Появляется при ховере) */}
                      <button 
                        onClick={() => deletePhoto(photo.filename)}
                        disabled={isDeleting === photo.filename}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-100 scale-75 shadow-lg z-10 disabled:bg-gray-500"
                        title="Delete photo permanently"
                      >
                        {isDeleting === photo.filename ? (
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
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