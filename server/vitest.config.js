import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    // Un solo worker: los tests comparten una SQLite :memory: por archivo
    // (ver tests/setup.js) — correr en paralelo real complicaría el estado
    // sin aportar nada para un suite de este tamaño.
    fileParallelism: false,
  },
});
