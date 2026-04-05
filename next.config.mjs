/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.kurginian.pro',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        pathname: '/**',
      },
    ],
    // ← Добавили поддержку quality=95 (убирает warning)
    qualities: [75, 95],
  },
};

export default nextConfig;