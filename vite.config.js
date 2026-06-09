import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/monipad': {
        target: 'https://monipad.dipendajatim.go.id',
        changeOrigin: true,
        secure: false, // Set false if the target has self-signed cert
      }
    }
  }
})
