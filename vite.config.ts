import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from GitHub Pages at https://eitherway-isa.github.io/offcut/
export default defineConfig({
  base: '/offcut/',
  plugins: [react()],
})
