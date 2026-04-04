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
      }
    ],
  },
};

export default nextConfig;