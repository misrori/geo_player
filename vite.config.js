import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'Túra Player',
        short_name: 'GeoPlayer',
        description: 'Túraútvonalak lejátszása élő GPS navigációval',
        theme_color: '#1b5e20',
        background_color: '#f5f5f5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // A túraképek (public/images) nem kerülnek előcache-be, csak megnyitáskor (runtime cache).
        globPatterns: ['**/*.{js,css,html,png,svg,gpx,json,webp}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/images/') && /\.jpe?g$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-tour-images',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 }
            }
          },
          {
            urlPattern: /^https:\/\/kirandulastippek\.hu\/.*\.(png|jpg|jpeg|webp)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tour-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 }
            }
          }
        ]
      }
    })
  ]
})
