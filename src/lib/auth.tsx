import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';
import type { Szerep } from '@uzleti/enumok.ts';

/**
 * A munkamenet és a cég egy helyen.
 *
 * A cég nem a munkamenetből jön, hanem lekérdezésből: **a séma több céget
 * elbírna, a termék egyet mutat.** A kiválasztás a legkorábbi tagság, nem a
 * legkisebb azonosító — ezt az adatbázisban a `belso.aktualis_ceg()` dönti el,
 * és itt ugyanaz a rendezés fut, hogy a kettő ne csússzon szét.
 */

export type Ceg = {
  id: string;
  name: string;
  tax_number: string;
  trial_ends_at: string | null;
  stripe_status: string | null;
  stripe_price_id: string | null;
  /** A cég Stripe-ügyfele. Ebből tudja a felület, van-e egyáltalán portálja. */
  stripe_customer_id: string | null;
  /**
   * Mikor ér véget a lemondott előfizetés — `null`, ha nincs lemondás.
   *
   * ⚠️ A portálon a lemondás **a ciklus végére** szól, tehát a `stripe_status`
   * közben `active` marad. A lemondás egyedül ezen a mezőn látszik; enélkül a
   * felület a lemondás után is változatlan előfizetést mutatna.
   */
  stripe_cancel_at: string | null;
  auto_jovahagyas_be: boolean;
  overage_enabled: boolean;
  overage_limit_ft: number | null;
  file_retention_days: number;
  /**
   * A beküldő cím titkos része. A `companies(*)` hozza, és **csak a cég
   * tagjai látják** (RLS) — a felületen a teljes cím ebből áll össze.
   */
  bekuldes_token: string;
  bekuldes_be: boolean;
  bekuldes_barkitol: boolean;
};

type AuthAllapot = {
  session: Session | null;
  user: User | null;
  ceg: Ceg | null;
  szerep: Szerep | null;
  /** Amíg igaz, még nem tudjuk, be van-e lépve — ilyenkor nem irányítunk sehova. */
  betolt: boolean;
  ujratolt: () => Promise<void>;
  kijelentkezes: () => Promise<void>;
};

const AuthContext = createContext<AuthAllapot | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ceg, setCeg] = useState<Ceg | null>(null);
  const [szerep, setSzerep] = useState<Szerep | null>(null);
  const [betolt, setBetolt] = useState(true);

  async function cegetBetolt(aktivSession: Session | null) {
    if (aktivSession === null) {
      setCeg(null);
      setSzerep(null);
      return;
    }

    // A tagságon át kérdezzük a céget, mert a rendezés a tagság
    // létrejöttének idejére megy — ugyanúgy, mint az adatbázisban.
    const { data, error } = await supabase
      .from('company_members')
      .select('role, created_at, companies(*)')
      .not('accepted_at', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error !== null || data === null || data.length === 0) {
      setCeg(null);
      setSzerep(null);
      return;
    }

    // A beágyazott relációt a PostgREST objektumként adja vissza (a kapcsolat
    // sok-az-egyhez), generált típusok nélkül viszont a supabase-js tömbnek
    // tippeli. Mindkettőt elviseljük, hogy a típusgenerálás bekapcsolása se
    // törje el.
    const tagsag = data[0] as unknown as { role: Szerep; companies: Ceg | Ceg[] | null };
    const cegErtek = Array.isArray(tagsag.companies)
      ? (tagsag.companies[0] ?? null)
      : tagsag.companies;

    setCeg(cegErtek);
    setSzerep(tagsag.role);
  }

  useEffect(() => {
    let elo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!elo) return;
      setSession(data.session);
      await cegetBetolt(data.session);
      if (elo) setBetolt(false);
    });

    const { data: felirat } = supabase.auth.onAuthStateChange(async (_esemeny, ujSession) => {
      if (!elo) return;
      setSession(ujSession);
      await cegetBetolt(ujSession);
      if (elo) setBetolt(false);
    });

    return () => {
      elo = false;
      felirat.subscription.unsubscribe();
    };
  }, []);

  const ertek: AuthAllapot = {
    session,
    user: session?.user ?? null,
    ceg,
    szerep,
    betolt,
    ujratolt: async () => {
      const { data } = await supabase.auth.getSession();
      await cegetBetolt(data.session);
    },
    kijelentkezes: async () => {
      await supabase.auth.signOut();
      setCeg(null);
      setSzerep(null);
    },
  };

  return <AuthContext.Provider value={ertek}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthAllapot {
  const ertek = useContext(AuthContext);

  if (ertek === null) {
    throw new Error('A useAuth csak AuthProvider alatt használható.');
  }

  return ertek;
}

/** Szerkeszthet-e: feltölt, javít, jóváhagy, exportál. */
export function useSzerkeszthet(): boolean {
  const { szerep } = useAuth();
  return szerep !== null && szerep !== 'megtekinto';
}
