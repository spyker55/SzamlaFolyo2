// A `vitest/config` defineConfig-ja ugyanaz, mint a Vite-é, csak ismeri a
// `test` blokkot is — így egy konfiguráció szolgálja a buildet és a teszteket.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // A tiszta üzleti logika egyetlen példányban él. Ugyanezt a mappát
      // importálja az Edge Function is, relatív úton — ezért nem `src/` alatt
      // van: ami itt változik, ott is változik, és nem lehet szétcsúszni.
      '@uzleti': fileURLToPath(new URL('./shared/uzleti', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@config': fileURLToPath(new URL('./config', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
