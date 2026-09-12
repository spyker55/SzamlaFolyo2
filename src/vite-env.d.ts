/// <reference types="vite/client" />

/**
 * A böngészőbe kerülő beállítások típusa.
 *
 * Csak a `VITE_` előtagúak jutnak el a kliensig — ez nem konvenció, hanem a
 * Vite szabálya, és pont ez véd attól, hogy egy titok véletlenül a csomagba
 * kerüljön. Ami itt fel van sorolva, az nyilvános.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_REGISZTRACIO_NYITVA: string;
  readonly VITE_FEJLESZTES_ALATT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
