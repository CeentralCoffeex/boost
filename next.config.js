/** @type {import('next').NextConfig} */
const nextConfig = {
  // Blocage par défaut : seul TELEGRAM_ONLY=false désactive. Sinon on bloque l'accès hors Telegram.
  env: {
    NEXT_PUBLIC_TELEGRAM_ONLY: process.env.TELEGRAM_ONLY === 'false' ? 'false' : 'true',
  },
  // Ajout pour résoudre les problèmes de détection de racine dans les monorepos ou structures complexes
  outputFileTracingRoot: __dirname,

  // Augmentation des limites pour les actions serveur et le proxy (uploads vidéo)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    // Limite du corps des requêtes quand le proxy est utilisé (ex: /api/upload)
    proxyClientMaxBodySize: '500mb',
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configuration des images
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'imager.habbo.lat',
      },
      {
        protocol: 'https',
        hostname: 'imager.habbo.lat',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 't.me',
      },
      {
        protocol: 'https',
        hostname: 'api.telegram.org',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self' http: https: data: blob:; img-src 'self' http: https: data: blob:; media-src 'self' http: https: data: blob:; connect-src 'self' http: https: wss: ws:; script-src 'self' 'unsafe-inline' http: https: data:; style-src 'self' 'unsafe-inline' http: https: data: https://fonts.googleapis.com; font-src 'self' http: https: data: https://fonts.gstatic.com;",
  },

  // Rewrites pour éviter 404 sur /administration (Telegram WebApp, bot admin)
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/favicon.ico', destination: '/icon.svg' },
        { source: '/administration', destination: '/administration/index.html' },
        { source: '/administration/', destination: '/administration/index.html' },
      ],
    };
  },

  // Configuration des en-têtes de sécurité
  async headers() {
    return [
      {
        source: '/administration/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' http: https: data: blob:; script-src 'self' 'unsafe-inline' http: https: data:; style-src 'self' 'unsafe-inline' http: https: data: https://fonts.googleapis.com; img-src 'self' http: https: data: blob:; font-src 'self' http: https: data: https://fonts.gstatic.com; connect-src 'self' http: https: wss: ws:; media-src 'self' http: https: data: blob:; worker-src 'self' blob:; frame-src 'self' http: https: data:; frame-ancestors 'self';"
          },
        ],
      },
      {
        source: '/((?!administration).*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
