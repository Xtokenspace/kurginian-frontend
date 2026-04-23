import nextDynamic from 'next/dynamic';

// 1. Полностью отсекаем серверный рендеринг (SSR) для хука useSearchParams
const BookingClient = nextDynamic(() => import('./BookingClient'), { ssr: false });

// 2. ЖЕСТКОЕ ПЕРЕОПРЕДЕЛЕНИЕ: Сбрасываем глобальный edge runtime из layout.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-static';

export default function BookingPage() {
  return <BookingClient />;
}