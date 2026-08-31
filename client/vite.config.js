import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // En dev, todo /api y /public le pega al Express de verdad (evita
      // configurar CORS/cookies distinto entre dev y prod).
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/public': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
