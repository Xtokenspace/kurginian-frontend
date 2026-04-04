import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lux: {
          bg: '#050505',    // Глубокий черный
          card: '#0F0F0F',  // Цвет карточек
          gold: '#D4AF37',  // Золото
          text: '#F0F0F0',  // Холодный белый
        }
      },
      fontFamily: {
        cinzel: ['var(--font-cinzel)', 'serif'],
        cormorant: ['var(--font-cormorant)', 'serif'],
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 4px 20px rgba(212, 175, 55, 0.3)',
        'gold-glow-hover': '0 8px 30px rgba(212, 175, 55, 0.5)',
      },
      borderRadius: {
        'sm': '4px', // Минимум скруглений по ТЗ
      }
    },
  },
  plugins: [],
};
export default config;