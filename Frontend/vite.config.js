import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Évite qu'un vieux pré-bundle Vite résolve encore html2canvas (erreur color() / parse CSS).
      html2canvas: path.resolve(__dirname, 'src/shims/stub-html2canvas.js'),
    },
  },
  optimizeDeps: {
    include: ['html-to-image'],
  },
  server: {
    headers: {
      'Cache-Control': 'no-store',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
