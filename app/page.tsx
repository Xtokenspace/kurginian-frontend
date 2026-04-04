import { redirect } from 'next/navigation';

export default function HomePage() {
  // Вариант 1: Просто перенаправляем на тестовую свадьбу (раскомментируй, если нужно)
  // redirect('/weddings/test-wedding');

  // Вариант 2: Красивая заглушка
  return (
    <main className="min-h-screen bg-lux-bg flex flex-col items-center justify-center p-6 text-center">
      <h1 className="font-cinzel text-3xl md:text-5xl text-lux-gold mb-6 tracking-widest uppercase">
        Kurginian Premium
      </h1>
      <p className="font-cormorant text-xl text-gray-400 italic mb-8">
        L'accès à la galerie nécessite un lien d'invitation privé.
        <br /> (Доступ к галерее требует приватной ссылки-приглашения).
      </p>
    </main>
  );
}