import withPWAInit from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
  cacheStartUrl: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /\/api\/auth\/.*/i,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /\/families\/.*\/(expenses|reports|budgets|categories)/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-data',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30,
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};

export default withPWA(nextConfig);
