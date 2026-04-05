'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

// --- ИНТЕРФЕЙСЫ ---
interface MatchedPhoto {
  filename: string;
  width: number;
  height: number;
  urls: {
    web: string;
    thumb: string;
  };
}

interface GalleryProps {
  photos: MatchedPhoto[];
  slug: string;
}

// --- ВАРИАНТЫ АНИМАЦИИ ---
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Построчное проявление
    },
  },
};

const brickVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  },
};

// --- КОМПОНЕНТ ОДНОГО ФОТО ---
function PhotoRowItem({ photo, slug, index }: { photo: MatchedPhoto; slug: string; index: number }) {
  const flexGrow = photo.width / photo.height;
  const flexBasis = flexGrow * 250; 

  return (
    <motion.div
      variants={brickVariants}
      whileHover={{ scale: 1.015, zIndex: 1 }}
      whileTap={{ scale: 0.985 }}
      className="relative overflow-hidden group border border-lux-gold/10 hover:border-lux-gold/60 transition-colors shadow-lg active:shadow-gold-glow"
      style={{
        flexGrow: flexGrow,
        flexBasis: `${flexBasis}px`,
        aspectRatio: `${photo.width} / ${photo.height}`,
      }}
    >
      {/* ДОБАВЛЕН КЛАСС relative СЮДА ↓ */}
      <Link href={`/weddings/${slug}/photo/${photo.filename}`} className="block relative w-full h-full cursor-pointer">
        
        <div className="absolute inset-0 bg-[#070707] flex items-center justify-center">
          <motion.div 
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="font-cinzel text-[10px] text-lux-gold/30 tracking-widest"
          >
            KURGINIAN
          </motion.div>
        </div>

        <Image
          src={photo.urls.thumb}
          alt={photo.filename}
          fill
          // Убираем LCP warning: первые 6 фото грузим приоритетно, остальные lazy
          priority={index < 6}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-opacity duration-700 group-hover:scale-105"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </Link>
    </motion.div>
  );
}


// --- ОСНОВНАЯ ГАЛЕРЕЯ ---
export default function Gallery({ photos, slug }: GalleryProps) {
  
  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-20 bg-lux-card border border-lux-gold/20 rounded-sm">
        <p className="font-cinzel text-lux-gold/60 uppercase tracking-widest">
          No photos found.
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-lux-bg" />}>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex flex-wrap gap-2 md:gap-4 pt-10 pb-20 after:content-[''] after:flex-grow-[999]"
      >
        {photos.map((photo, index) => (
          // Передаем index сюда ↓
          <PhotoRowItem key={photo.filename} photo={photo} slug={slug} index={index} />
        ))}
      </motion.div>
    </Suspense>
  );
}