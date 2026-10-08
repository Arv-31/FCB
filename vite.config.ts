import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/FCB/"); "/" everywhere else.
// Dedicated dev ports so this app never collides with other local projects.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5199, strictPort: true },
  preview: { port: 5198, strictPort: true },
})
