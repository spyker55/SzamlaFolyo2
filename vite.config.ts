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
    // Az Edge Function tesztjei is itt futnak. Nem minden fájlja tesztelhető
    // innen (a `Deno.serve` és a `Deno.env` nem létezik Node alatt), de ami
    // közönséges npm-csomagra épül — a PDF-darabolás — **mérhető telepítés
    // előtt**, és pont az a fajta kód, amit nem szabad élesben először látni.
    include: [
      // Az árazási szabályok tesztje a számok mellett lakik (`config/`), nem a
      // `shared/uzleti/`-ben: aki egy árat átír, annak ott akadjon meg a szeme
      // rajta. E sor nélkül az a teszt **némán sosem futna le**.
      'config/**/*.test.ts',
      'shared/**/*.test.ts',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'supabase/functions/**/*.test.ts',
    ],
  },
});
