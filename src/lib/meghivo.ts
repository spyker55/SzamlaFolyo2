import { supabase } from './supabase.ts';
import { cimHelyes, cimetNormalizal, type MeghivoAllapot } from '@uzleti/meghivo.ts';
import type { Szerep } from '@uzleti/enumok.ts';
import { hibaSzoveg } from './fuggveny.ts';

/**
 * A meghívó adatműveletei.
 *
 * Öt RPC és két Edge Function-hívás. A táblát közvetlenül **csak olvassuk**:
 * írási jog nincs rajta (`20260915000300` migráció), és ez szándékos — a
 * meghívó három művelete mind olyan szabályt kényszerít ki, amit egy
 * RLS-politika nem tud kimondani (már tag-e a cím, egyezik-e a belépési cím,
 * van-e már cége a fióknak).
 *
 * # A létrehozás és a küldés külön lépés
 *
 * Előbb létrejön a meghívó, aztán megy ki a levél. Ha a második elakad, az
 * első **megmarad**: a listában ott a sor, és a „Küldd újra" gomb pont azt
 * csinálja, amit ígér. Egy összevont művelet ilyenkor vagy hazudna, vagy
 * elvesztené a meghívót.
 */

export type Meghivo = {
  id: string;
  email: string;
  role: Szerep;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  /**
   * Mikor ment ki a levél, vagy `null`, ha nem tudunk kiküldött levélről.
   *
   * ⚠️ Nem díszítés: az első verzió minden függő meghívóra „Elküldve"-t írt,
   * miközben a levél a CORS-elővizsgálaton elakadt és el sem indult.
   */
  sent_at: string | null;
};

type Eredmeny = { ok: boolean; hiba?: string };

/** A cég meghívói, a legfrissebb elöl. Csak a tulajdonos látja őket (RLS). */
export async function meghivok(cegId: string): Promise<Meghivo[]> {
  const { data } = await supabase
    .from('company_invites')
    .select('id, email, role, token, created_at, expires_at, accepted_at, revoked_at, sent_at')
    .eq('company_id', cegId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []) as Meghivo[];
}

/**
 * Egy meghívó élő állapota — ugyanaz a négy eset, amit az adatbázis is mond.
 *
 * Azért számoljuk itt is, mert a lista sorainál nincs értelme soronként
 * lekérdezni. A `meghivo_adatok()` marad az igazság a **meghívott** oldalán;
 * ez itt a tulajdonos listájának a kijelzése.
 */
export function allapota(m: Meghivo, most: Date = new Date()): MeghivoAllapot {
  if (m.revoked_at !== null) return 'visszavont';
  if (m.accepted_at !== null) return 'elfogadott';
  if (new Date(m.expires_at).getTime() <= most.getTime()) return 'lejart';

  return 'ervenyes';
}

/** Létrehozás. A levelet **nem** ez küldi — lásd `meghivotKuld`. */
export async function meghivotLetrehoz(
  cegId: string,
  cim: string,
  szerep: Szerep,
): Promise<{ ok: boolean; id?: string; hiba?: string }> {
  const tiszta = cimetNormalizal(cim);

  // A formai ellenőrzés itt is megvan, nem csak az adatbázisban: egy hibás cím
  // miatt ne kelljen hálózatra menni, és a hibaüzenet a mezőnél jelenjen meg.
  if (!cimHelyes(tiszta)) {
    return { ok: false, hiba: 'Ez nem érvényes e-mail cím.' };
  }

  const { data, error } = await supabase.rpc('meghivot_letrehoz', {
    ceg: cegId,
    cim: tiszta,
    szerep,
  });

  return error === null
    ? { ok: true, id: data as string }
    : { ok: false, hiba: error.message };
}

/**
 * A levél kiküldése.
 *
 * Külön hibát ad vissza, mint a létrehozás, mert **más a teendő**: egy
 * elakadt levélnél a meghívó megvan, csak újra kell küldeni vagy a linket
 * kézzel átadni.
 */
export async function meghivotKuld(meghivoId: string): Promise<Eredmeny> {
  const { data, error } = await supabase.functions.invoke<{ hiba?: string }>('meghivo-kuld', {
    body: { meghivo_id: meghivoId },
  });

  if (error !== null) {
    // A `FunctionsHttpError` üzenete csak annyi, hogy „non-2xx status code" —
    // a valódi indok a válasz testében van, azt olvassuk ki.
    const reszletek = await hibaSzoveg(error);

    return { ok: false, hiba: reszletek ?? 'A levél nem ment ki.' };
  }

  return data?.hiba === undefined ? { ok: true } : { ok: false, hiba: data.hiba };
}

/** Visszavonás. A link ettől azonnal érvénytelen. */
export async function meghivotVisszavon(meghivoId: string): Promise<Eredmeny> {
  const { error } = await supabase.rpc('meghivot_visszavon', { meghivo: meghivoId });

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}

export type MeghivoAdatok = {
  allapot: MeghivoAllapot;
  ceg_nev: string | null;
  cim: string | null;
  szerep: Szerep | null;
  lejar: string | null;
};

/**
 * Mit mutasson a meghívó oldal.
 *
 * Belépés **nélkül** is hívható (`anon`), és ez nem lazaság: a meghívott
 * jellemzően nincs belépve, amikor a linkre kattint. Ha nem tudnánk semmit
 * mutatni neki a bejelentkezés előtt, egy üres képernyőre kérnénk jelszót.
 */
export async function meghivoAdatok(token: string): Promise<MeghivoAdatok> {
  const { data, error } = await supabase.rpc('meghivo_adatok', { jel: token });

  if (error !== null) {
    return { allapot: 'ismeretlen', ceg_nev: null, cim: null, szerep: null, lejar: null };
  }

  const sor = (data as MeghivoAdatok[] | null)?.[0];

  return sor ?? { allapot: 'ismeretlen', ceg_nev: null, cim: null, szerep: null, lejar: null };
}

/**
 * Fiók nyitása meghívóra, és azonnali belépés.
 *
 * ⚠️ **Nem `supabase.auth.signUp()`.** A nyilvános regisztráció a Supabase-ben
 * ki van kapcsolva — enélkül a böngészőcsomagban szereplő publikálható kulccsal
 * bárki fiókot nyithatna az API-n, a felületi kapcsolót megkerülve. A
 * `disable_signup` viszont nem tesz különbséget meghívott és idegen között,
 * ezért a meghívós fióknyitás egy külön, `service_role`-os Edge Functionön megy
 * (`meghivo-fiok`), ami **csak meghívott címre** és **csak élő meghívóra** ad
 * fiókot.
 *
 * A belépés rögtön utána fut: megerősítő levél nincs, mert a cím ellenőrzése a
 * meghívó jelével már megtörtént. Az `onAuthStateChange` innen viszi tovább —
 * a meghívó képernyő magától átvált az elfogadó gombra.
 */
export async function meghivosFiok(token: string, jelszo: string): Promise<Eredmeny> {
  const { data, error } = await supabase.functions.invoke<{ hiba?: string; cim?: string }>(
    'meghivo-fiok',
    { body: { jel: token, jelszo } },
  );

  if (error !== null) {
    const reszletek = await hibaSzoveg(error);

    return { ok: false, hiba: reszletek ?? 'A fiókot nem sikerült létrehozni.' };
  }

  if (data?.hiba !== undefined) {
    return { ok: false, hiba: data.hiba };
  }

  if (data?.cim === undefined) {
    return { ok: false, hiba: 'A fiókot nem sikerült létrehozni.' };
  }

  const { error: belepesHiba } = await supabase.auth.signInWithPassword({
    email: data.cim,
    password: jelszo,
  });

  // A fiók ilyenkor **megvan**, csak a belépés akadt el — ezt ki is mondjuk,
  // különben a látogató újra próbálná a fióknyitást, és „már van fiók"
  // üzenetet kapna a semmiért.
  return belepesHiba === null
    ? { ok: true }
    : { ok: false, hiba: 'A fiók elkészült, de a belépés nem sikerült. Próbálj bejelentkezni.' };
}

/** Elfogadás. A négy kaput az adatbázis zárja — itt csak az üzenete látszik. */
export async function meghivotElfogad(token: string): Promise<Eredmeny> {
  const { error } = await supabase.rpc('meghivot_elfogad', { jel: token });

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}

export type VaroMeghivo = {
  /** A token — ebből épül a `/meghivo/:token` útvonal. */
  jel: string;
  ceg_nev: string;
  szerep: Szerep;
  lejar: string;
};

/**
 * A belépett fiókra váró, még élő meghívó — vagy `null`.
 *
 * A cégalapítás képernyője kérdezi meg, mielőtt bárki saját céget nyitna. Enélkül
 * az a felhasználó, aki a meghívó **levelét** elveszítette, a `/ceg-letrehozas`-on
 * köt ki, és ha ott céget alapít, a meghívóból **véglegesen** kizárja magát
 * (`meghivot_elfogad` 3. kapuja) — a `/fiok-torles` pedig még helyőrző, tehát
 * vissza sem tud lépni.
 *
 * ⚠️ **Nincs paramétere, és ez nem hiányosság.** A cím a munkamenetből jön, nem
 * a kliens állításából: egy `varoMeghivo(cim)` alak cím-kitalálós orákulum volna.
 *
 * Hibánál is `null`, mert a hívó oldalon a hiba és az üres eredmény ugyanaz a
 * döntés: ne mutassunk kártyát. Egy hibaüzenet itt csak zavarna — a cégalapítás
 * enélkül is működik.
 */
export async function varoMeghivo(): Promise<VaroMeghivo | null> {
  const { data, error } = await supabase.rpc('varo_meghivo');

  if (error !== null) {
    return null;
  }

  return (data as VaroMeghivo[] | null)?.[0] ?? null;
}
