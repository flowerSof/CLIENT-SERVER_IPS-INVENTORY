import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // <--- ESTO ES OBLIGATORIO PARA DOCKER
    strictPort: true,
    port: 5173,
    watch: {
      usePolling: true
    }
  }
})