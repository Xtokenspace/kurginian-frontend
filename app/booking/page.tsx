import BookingClient from './BookingClient';

// THE REAPER / ZERO-OOM CLOUDFLARE HACK:
// Принудительно отключаем генерацию Edge Worker для этого роута.
// Страница соберется как статический HTML, что мгновенно освободит ~1.4 MiB веса приложения.
export const dynamic = 'force-static';

export default function BookingPage() {
  return <BookingClient />;
}