// ════════════════════════════════════════════════════════════
// apps/web/vite.config.ts
// ════════════════════════════════════════════════════════════
import { defineConfig } from 'vite'
import react            from '@vitejs/plugin-react'
import { VitePWA }      from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType:  'autoUpdate',
      includeAssets: ['favicon.ico','icon-192.png','icon-512.png'],
      manifest: {
        name:             'PharmPro Enterprise',
        short_name:       'PharmPro',
        description:      'Enterprise pharmacy management system',
        theme_color:      '#1a56db',
        background_color: '#0d1117',
        display:          'standalone',
        icons: [
          { src:'icon-192.png', sizes:'192x192', type:'image/png' },
          { src:'icon-512.png', sizes:'512x512', type:'image/png' },
        ],
      },
      workbox: {
        // Cache API GET responses for offline support
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/(drugs|inventory\/stats)/,
            handler:    'StaleWhileRevalidate',
            options: {
              cacheName:          'api-cache',
              expiration:         { maxEntries: 50, maxAgeSeconds: 300 },
              cacheableResponse:  { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:      'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})


