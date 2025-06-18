import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'  // Changed from 'vite'

export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  server: {
    allowedHosts: ['capacitor.petetreadaway.com']
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
