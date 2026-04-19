// === ФАЙЛ: app/weddings/[slug]/page.tsx (СЕРВЕРНЫЙ КОМПОНЕНТ) ===
import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// 1. Серверный запрос данных (БЕЗ МЕРЦАНИЯ!)
async function getWeddingMeta(slug: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${apiUrl}/api/weddings/${slug}/meta`, {
      cache: 'no-store'
    });
    
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Ошибка загрузки меты на сервере:", error);
    return null;
  }
}

// 2. ДИНАМИЧЕСКОЕ SEO (Для красивых ссылок в WhatsApp / Telegram)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const metaResponse = await getWeddingMeta(resolvedParams.slug);
  const data = metaResponse?.data;
  
  const title = data?.title ? `${data.title} | KURGINIAN` : 'KURGINIAN Premium Gallery';
  const subtitle = data?.subtitle || 'Votre galerie de mariage privée';
  
  // Умный выбор обложки для SEO: сначала ищем в новом массиве, затем в старом
  const coverImage = data?.covers_data?.[0]?.url || data?.covers?.[0] || '/apple-touch-icon.png';

  return {
    title: title,
    description: subtitle,
    openGraph: {
      title: title,
      description: subtitle,
      images: [coverImage],
    }
  };
}

// 3. Главный компонент (Обертка)
export default async function WeddingPage({ params }: PageProps) {
  const resolvedParams = await params;
  const metaResponse = await getWeddingMeta(resolvedParams.slug);

  // Передаем готовые данные клиенту. Пользователь мгновенно увидит интерфейс без скачков!
  return (
    <ClientPage 
      slug={resolvedParams.slug} 
      initialMeta={metaResponse?.data || null} 
    />
  );
}