import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the rarely-changing third-party libraries into their own chunks so an
        // app-code redeploy doesn't invalidate the user's cached vendor bundle. React
        // and supabase-js are needed at app root (the auth listener), so they load on
        // first paint regardless — this only improves repeat-visit caching.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) {
              return 'supabase-vendor'
            }
            if (
              id.includes('react-router') ||
              id.includes('/react-dom/') ||
              id.includes('/react/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor'
            }
          }
        },
      },
    },
  },
})
