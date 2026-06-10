import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // quitar import si se desinstala tailwind

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ], // quitar tailwindcss() si se desinstala tailwind
})