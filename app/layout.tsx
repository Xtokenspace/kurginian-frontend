import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

// Загружаем премиальные шрифты
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel" });
const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"], 
  weight: ["400", "600", "700"], 
  variable: "--font-cormorant" 
});
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });

// Настройки для PWA (превращаем сайт в приложение)
export const viewport: Viewport = {
  themeColor: "#050505",
};

// Оставляем остальные настройки здесь
export const metadata: Metadata = {
  title: "KURGINIAN Premium Gallery",
  description: "Votre galerie de mariage numérique",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kurginian",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${cinzel.variable} ${cormorant.variable} ${montserrat.variable} bg-lux-bg text-lux-text antialiased`}>
        {children}
      </body>
    </html>
  );
}