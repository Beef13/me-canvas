import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Fixed port for the Tauri dev window; strict so failures surface loudly.
  server: { port: 1420, strictPort: true },
})
