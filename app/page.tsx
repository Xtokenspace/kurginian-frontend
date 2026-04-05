'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function PWAHome() {
  const router = useRouter();
  const [lastSlug, setLastSlug] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kurginianUserData');
    if (saved) {
      const data = JSON.parse(saved);
      setLastSlug(data.lastUsedSlug || null);
    }
  }, []);

  // Автоматически открываем последнюю использованную свадьбу при запуске PWA
  useEffect(() => {
    if (lastSlug) {
      router.replace(`/weddings/${lastSlug}`);
    }
  }, [lastSlug, router]);

  // Если пользователь впервые — красивая премиальная заставка
  if (!lastSlug) {
    return (
      <main className="min-h-screen bg-lux-bg flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-md"
        >
          <h1 className="font-cinzel text-5xl md:text-6xl text-lux-gold mb-4 tracking-widest">KURGINIAN</h1>
          <p className="font-cormorant text-2xl text-lux-text/80 mb-12 italic">
            Votre galerie de mariage<br />avec reconnaissance faciale
          </p>

          <button
            onClick={() => {
              const slug = prompt('Вставьте slug свадьбы\n(например: anna-ivan-21-10-2025)');
              if (slug && slug.trim()) {
                router.push(`/weddings/${slug.trim()}`);
              }
            }}
            className="w-full px-10 py-5 bg-lux-gold text-black font-medium rounded-sm text-lg shadow-gold-glow hover:shadow-gold-glow-hover transition-all"
          >
            🔗 Ввести ссылку приглашения
          </button>

          <p className="text-xs text-gray-500 mt-8">
            Или откройте ссылку, которую вам прислали
          </p>
        </motion.div>
      </main>
    );
  }

  return null; // редирект уже произошёл
}