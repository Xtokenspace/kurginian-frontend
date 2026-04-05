import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

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
        sizes: "180x180",
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