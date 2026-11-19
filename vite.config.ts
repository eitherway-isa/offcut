import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH is '/offcut/' on GitHub Pages; hosts that serve from the root
// (Cloudflare Pages, Vercel, Netlify) can leave it unset.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
