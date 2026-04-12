import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt"; 

// ВАЖНО: Говорим Cloudflare использовать быстрые серверы
export const runtime = "edge";

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel" });
const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"], 
  weight: ["400", "600", "700"], 
  variable: "--font-cormorant" 
});
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });

export const viewport: Viewport = {
  themeColor: "#D4AF37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "KURGINIAN Premium Gallery",
  description: "Votre galerie de mariage numérique avec reconnaissance faciale",
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KURGINIAN",
    startupImage: [
      {
        url: "/apple-touch-icon.png",
      },
    ],
  },

  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",           // Главная иконка для iOS
  },

  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "format-detection": "telephone=no",       // Отключаем автоматическое превращение номеров в ссылки
  },
};

import { AppProvider } from "@/context/AppContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${cormorant.variable} ${montserrat.variable}`}>
      <body className="antialiased bg-lux-bg text-lux-text overscroll-none">
        <AppProvider>
          {children}
          <InstallPrompt />
        </AppProvider>
      </body>
    </html>
  );
}