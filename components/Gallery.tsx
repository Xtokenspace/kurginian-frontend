'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Gallery({ photos }: { photos: any[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  // Обновленная функция скачивания (Броня от CORS и кэша)
  const handleDownload = async (url: string, filename: string) => {
    try {
      // Добавляем уникальный параметр, чтобы 100% обойти агрессивный кэш Safari/Chrome
      const fetchUrl = `${url}?download=${Date.now()}`;
      
      const response = await fetch(fetchUrl, {
        mode: 'cors',
        cache: 'no-cache', // Запрашиваем свежие CORS-заголовки у Cloudflare
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const link = document.createElement('a');
      const objectUrl = window.URL.createObjectURL(blob);
      
      link.href = objectUrl;
      link.download = filename || 'photo.jpg';
      
      // Добавляем в DOM, кликаем и сразу убираем (Best Practice)
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Очищаем память
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Erreur de téléchargement / Ошибка при скачивании:', error);
      alert("Erreur lors du téléchargement. Veuillez réessayer.");
    }
  };

  return (
    <>
      {/* Сетка Masonry */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.filename || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="break-inside-avoid cursor-pointer overflow-hidden rounded-sm border border-transparent hover:border-lux-gold hover:shadow-gold-glow transition-all duration-500"
            onClick={() => setSelectedPhoto(photo)}
          >
            <img 
              src={photo.urls.thumb} 
              alt="Wedding memory" 
              className="w-full object-cover"
              loading="lazy"
            />
          </motion.div>
        ))}
      </div>

      {/* Лайтбокс (полноэкранный просмотр) */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-lux-bg/95 backdrop-blur-sm p-4 md:p-10"
          >
            {/* Кнопка закрытия */}
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-6 right-6 text-lux-text hover:text-lux-gold text-4xl font-light z-[101]"
            >
              &times;
            </button>

            {/* Фото */}
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              src={selectedPhoto.urls.web}
              alt="Full size"
              className="max-w-full max-h-[85vh] object-contain rounded-sm border border-lux-card shadow-gold-glow"
            />

            {/* Кнопка скачивания */}
            <button
              onClick={() => handleDownload(selectedPhoto.urls.web, `kurginian_${selectedPhoto.filename}`)}
              className="absolute bottom-10 px-8 py-3 bg-lux-gold text-black font-montserrat uppercase tracking-widest rounded-sm shadow-gold-glow hover:bg-white transition-colors"
            >
              Télécharger
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}