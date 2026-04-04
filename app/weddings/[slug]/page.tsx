'use client';

import { useState, useRef, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Gallery from '@/components/Gallery';
import imageCompression from 'browser-image-compression'; // <-- ДОБАВЛЕН ИМПОРТ

// === ТИПИЗАЦИЯ API (согласно ТЗ) ===
export interface MatchedPhoto {
  filename: string;
  width: number;
  height: number;
  urls: { web: string; thumb: string; };
}

export interface AuthResponse {
  status: string;
  message: string;
  matches_count: number;
  data: MatchedPhoto[];
}

export default function WeddingGuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'network_error'>('idle');
  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // === ИНТЕГРАЦИЯ API: Сжатие и отправка селфи ===
  const handleSelfieUpload = async (file: File) => {
    setStatus('loading');

    try {
      // 1. НАСТРОЙКИ СЖАТИЯ (по ТЗ: до 500 КБ, макс 800px)
      const options = {
        maxSizeMB: 0.5,           // Максимальный размер 500 КБ
        maxWidthOrHeight: 800,    // Максимальная сторона 800px
        useWebWorker: true,       // Использовать фоновый поток (чтобы не зависала анимация загрузки)
        fileType: 'image/jpeg'    // Принудительно конвертируем в JPEG (полезно для HEIC с iPhone)
      };

      // 2. СЖИМАЕМ ФОТО
      const compressedFile = await imageCompression(file, options);
      
      // Для отладки в консоли браузера (можно удалить позже)
      console.log(`Оригинал: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Сжатое: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

      // 3. ГОТОВИМ ДАННЫЕ ДЛЯ ОТПРАВКИ
      const formData = new FormData();
      // Передаем именно compressedFile, а не исходный file
      formData.append('selfie', compressedFile, compressedFile.name);

      // 4. ОТПРАВЛЯЕМ НА СЕРВЕР
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${apiUrl}/api/weddings/${slug}/auth`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erreur HTTP');

      const data: AuthResponse = await response.json();

      if (data.matches_count > 0) {
        setPhotos(data.data);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Ошибка при обращении к API или сжатии:', error);
      setStatus('network_error');
    }
  };

  // Обработчик выбора файла
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelfieUpload(file);
    }
  };

  return (
    <main className="min-h-screen bg-lux-bg text-lux-text font-montserrat p-6 flex flex-col items-center justify-center selection:bg-lux-gold selection:text-black">
      <input 
        type="file" 
        accept="image/*" 
        capture="user" 
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        
        {/* ЭКРАН ПРИВЕТСТВИЯ */}
        {status === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-lg"
          >
            <h1 className="font-cinzel text-3xl md:text-5xl text-lux-gold mb-6 uppercase tracking-widest">
              Bienvenue
            </h1>
            <p className="font-cormorant text-xl md:text-2xl mb-12 italic text-gray-300">
              Bienvenue dans votre galerie. Je suis l'assistant numérique de ce mariage.
            </p>
            <button 
              onClick={handleButtonClick}
              className="px-8 py-4 bg-transparent border border-lux-gold text-lux-gold font-montserrat uppercase tracking-[0.2em] rounded-sm hover:bg-lux-gold hover:text-black hover:shadow-gold-glow-hover transition-all duration-500"
            >
              Trouver mes photos
            </button>
          </motion.div>
        )}

        {/* ЭКРАН ЗАГРУЗКИ */}
        {status === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-lux-bg flex items-center justify-center z-50 p-6 text-center"
          >
            <motion.p 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="font-cinzel text-xl text-lux-gold tracking-widest"
            >
              Recherche de votre visage parmi les souvenirs...
            </motion.p>
          </motion.div>
        )}

        {/* ЭКРАН ОШИБКИ (ЛИЦО НЕ НАЙДЕНО) */}
        {status === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <p className="font-cormorant text-2xl text-lux-text mb-8">
              Désolé, nous n'avons pas trouvé votre visage. Essayez avec une autre photo.
            </p>
            <button 
              onClick={handleButtonClick}
              className="px-6 py-3 border border-lux-gold text-lux-gold uppercase tracking-wider rounded-sm hover:shadow-gold-glow transition-all"
            >
              Réessayer
            </button>
          </motion.div>
        )}

        {/* ЭКРАН СЕТЕВОЙ ОШИБКИ (БЭКЕНД НЕДОСТУПЕН) */}
        {status === 'network_error' && (
          <motion.div 
            key="network_error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md bg-red-900/20 border border-red-500/50 p-8 rounded-sm"
          >
            <p className="font-cormorant text-2xl text-red-400 mb-6">
              Erreur de connexion au serveur.
            </p>
            <p className="font-montserrat text-sm text-gray-400 mb-8">
              Veuillez vérifier votre connexion ou réessayer plus tard.
            </p>
            <button 
              onClick={() => setStatus('idle')}
              className="px-6 py-3 border border-lux-gold text-lux-gold uppercase tracking-wider rounded-sm hover:shadow-gold-glow transition-all"
            >
              Retour
            </button>
          </motion.div>
        )}

        {/* ЭКРАН УСПЕХА (ГАЛЕРЕЯ) */}
        {status === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl pt-10"
          >
            <Gallery photos={photos} />
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  );
}