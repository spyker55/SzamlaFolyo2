import { szamlafolyo, type CsomagKulcs } from '../../config/szamlafolyo.ts';
import { szerepCimke, type Szerep } from './enumok.ts';

/**
 * Meghívó — a döntések és a levél szövege, kapcsolat nélkül.
 *
 * Ami itt van: a cím normalizálása, a link összeállítása és a levél teljes
 * tartalma. Ami nincs: hálózat, adatbázis, Deno.
 *
 * # Miért kerül a levél szövege egy tiszta modulba
 *
 * Mert **a levél kimegy**, és utána nem lehet visszaszívni. Egy elrontott link
 * vagy egy elrontott cégnév nem olyan hiba, ami legközelebb majd kiderül: a
 * címzett egyszer kattint. A szöveget ezért ugyanúgy egységtesztelni akarjuk,
 * mint egy validátort — Edge Function nélkül, mérve.
 *
 * # A cégnév idegen szöveg
 *
 * A cég nevét a felhasználó írja be, a levél pedig HTML. Aki ezt nem escape-eli,
 * az a saját, hitelesített tartományáról küld ki tetszőleges HTML-t. Nem
 * „XSS az e-mailben" a fő baj — a levelezők nem futtatnak szkriptet —, hanem
 * hogy egy `<a href>` a levél közepén a mi nevünkben mutathat bárhová.
 */

/**
 * A cím normalizálása.
 *
 * ⚠️ Ugyanez a szabály **az adatbázisban is ott van** (`meghivot_letrehoz`:
 * `lower(trim(cim))`), és ez nem felesleges kettőzés: a tárolt alak az, amire
 * az egyediség és az elfogadáskori összehasonlítás épül, tehát az SQL-ben kell
 * dőlnie. Itt azért van, hogy a felület **ugyanazt** mutassa, amit majd tárol —
 * ne a beírt „Kati@Example.COM" jelenjen meg a listában.
 */
export function cimetNormalizal(cim: string): string {
  return cim.trim().toLowerCase();
}

/**
 * Elfogadható alakú-e a cím.
 *
 * Szándékosan **megengedő**: egy e-mail cím teljes szabványa (RFC 5322)
 * reguláris kifejezéssel nem írható le értelmesen, és egy túl szigorú szűrő
 * valódi címeket utasítana el. Csak a nyilvánvalóan rosszat fogja meg — a
 * végső szót úgyis a kézbesítés mondja ki.
 */
export function cimHelyes(cim: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cimetNormalizal(cim));
}

/** A meghívó linkje. A `webcim` a configból jön, nem a kérés fejlécéből. */
export function meghivoLink(token: string): string {
  return `${szamlafolyo.webcim}/meghivo/${token}`;
}

export type MeghivoAllapot = 'ervenyes' | 'lejart' | 'visszavont' | 'elfogadott' | 'ismeretlen';

const ALLAPOT_CIMKEK: Record<MeghivoAllapot, string> = {
  ervenyes: 'Függőben',
  lejart: 'Lejárt',
  visszavont: 'Visszavonva',
  elfogadott: 'Elfogadva',
  ismeretlen: 'Ismeretlen',
};

export function allapotCimke(allapot: MeghivoAllapot): string {
  return ALLAPOT_CIMKEK[allapot] ?? allapot;
}

/**
 * Mit írjunk egy függő meghívó sorára a levélről.
 *
 * ⚠️ Az első verzió minden függő meghívóra azt írta, hogy **„Elküldve"** — akkor
 * is, ha a levél soha nem indult el. Élesben ez azonnal el is sült: a böngésző a
 * CORS-elővizsgálaton elbukott, a szolgáltatóhoz egyetlen kérés sem ment, a
 * felület mégis sikert mutatott.
 *
 * Ezért néz ez a függvény **a `sent_at`-re**, nem az állapotra: csak akkor mondja
 * azt, hogy elküldtük, ha van róla feljegyzés. A `null` itt állítás, nem hiányzó
 * adat — és a tulajdonosnak pont ez a hasznos: tudja, hogy a linket kézzel kell
 * átadnia, vagy újra kell próbálnia.
 */
export function kikuldesCimke(sentAt: string | null): { cimke: string; rendben: boolean } {
  return sentAt === null
    ? { cimke: 'A levél nem ment ki', rendben: false }
    : { cimke: 'Elküldve', rendben: true };
}

/** Hány nap van még hátra. Lejárt meghívóra 0 — negatív napot nem írunk ki. */
export function hatralevoNap(lejar: string, most: Date = new Date()): number {
  const vege = new Date(lejar).getTime();

  if (Number.isNaN(vege)) return 0;

  return Math.max(0, Math.ceil((vege - most.getTime()) / 86_400_000));
}

type LevelAdat = {
  cegNev: string;
  szerep: Szerep;
  meghivo: string;
  token: string;
  lejar: string;
};

export type Level = { targy: string; html: string; szoveg: string };

/**
 * A meghívó levél.
 *
 * Négy dolgot mond el, és semmi mást: **ki** hívott, **hova**, **milyen
 * szerepben**, és **meddig él** a link. Az utolsó azért kell, mert egy lejárt
 * link magyarázat nélkül úgy néz ki, mintha a rendszer romlott volna el.
 *
 * A záró mondat sem udvariasság: aki véletlenül kapja, tudja meg, hogy
 * **elég nem csinálnia semmit**. Egy „ha nem te voltál, jelezd" felszólítás
 * dolgot adna annak, akinek semmi köze hozzá.
 */
export function meghivoLevel(adat: LevelAdat): Level {
  const ceg = htmlBiztos(adat.cegNev);
  const hivo = htmlBiztos(adat.meghivo);
  const link = meghivoLink(adat.token);
  const nap = hatralevoNap(adat.lejar);
  const szerep = szerepCimke(adat.szerep);

  const ervenyesseg =
    nap <= 0 ? 'A link már lejárt.' : `A link ${nap} napig érvényes.`;

  const szoveg = [
    `${adat.meghivo} meghívott a(z) ${adat.cegNev} SzámlaFolyó-fiókjába, ${szerep.toLowerCase()} szerepben.`,
    '',
    'A meghívó elfogadása:',
    link,
    '',
    `${ervenyesseg} Elfogadni azzal az e-mail címmel lehet, amelyikre ez a levél érkezett.`,
    '',
    'Ha nem számítottál erre a levélre, nincs teendőd — a meghívó magától lejár.',
    '',
    'SzámlaFolyó',
  ].join('\n');

  const html = `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f6ede4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1e293b">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
<p style="margin:0 0 16px;font-size:16px;line-height:1.5"><strong>${hivo}</strong> meghívott a(z) <strong>${ceg}</strong> SzámlaFolyó-fiókjába, <strong>${htmlBiztos(szerep.toLowerCase())}</strong> szerepben.</p>
<p style="margin:0 0 24px"><a href="${htmlBiztos(link)}" style="display:inline-block;background:#9e5537;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Elfogadom a meghívót</a></p>
<p style="margin:0 0 8px;font-size:14px;color:#475569">${ervenyesseg} Elfogadni azzal az e-mail címmel lehet, amelyikre ez a levél érkezett.</p>
<p style="margin:0 0 16px;font-size:14px;color:#475569">Ha nem számítottál erre a levélre, nincs teendőd — a meghívó magától lejár.</p>
<p style="margin:0;font-size:13px;color:#94a3b8">Ha a gomb nem működik, másold be ezt a címet:<br>${htmlBiztos(link)}</p>
</div>
</body></html>`;

  return {
    targy: `Meghívó a(z) ${adat.cegNev} SzámlaFolyó-fiókjába`,
    html,
    szoveg,
  };
}

/**
 * HTML-escape.
 *
 * Öt karakter, saját kézzel — mert a `shared/uzleti` szabálya a **nulla
 * függőség**, és ez a projekt egyetlen helye, ahol HTML-t állítunk elő
 * szerveroldalon.
 */
function htmlBiztos(szoveg: string): string {
  return szoveg
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Hány felhasználó fér a csomagba, vagy `null`, ha korlátlan.
 *
 * ⚠️ **Ez az ígéret eddig sehol nem volt betartva** — és eddig nem is sülhetett
 * el, mert kollégát felvenni egyáltalán nem lehetett. A nyitólap árkártyái és
 * az ÁSZF 5. pontja viszont **mindig is** csomagonkénti felhasználószámot
 * hirdettek. Amint a meghívás működik, ez a mondat állítássá válik, tehát
 * tartani kell.
 */
export function helyek(keret: { allapot: string; csomagKulcs: CsomagKulcs | null }): number | null {
  if (keret.csomagKulcs !== null) {
    return szamlafolyo.csomagok[keret.csomagKulcs].felhasznalok;
  }

  // Próbaidőn és lejárt előfizetésnél is a próba kerete áll. A lejárt eset
  // szándékosan nem tágabb: aki nem fizet, ne tudjon csapatot építeni.
  return szamlafolyo.proba.felhasznalok;
}

/**
 * Fér-e még egy ember a cégbe.
 *
 * A **függő meghívókat is beleszámolja**, nem csak a meglévő tagokat: egy
 * kiküldött meghívó egy lefoglalt hely. Enélkül öt meghívóval át lehetne lépni
 * egy kétfős csomagot, és a túllépés csak az elfogadáskor derülne ki — a
 * meghívottnál, aki a legkevésbé tehet róla.
 *
 * # Ez a szabály a felületé — de már nem csak azé
 *
 * Sokáig itt állt, hogy „aki megkerüli a felületet, több helyet vehet fel".
 * **2026-09-20 óta nem igaz**: ugyanez a két szabály az adatbázisban is ott van
 * (`20260920000200_hely_korlat.sql`), a `meghivot_letrehoz()`-ban és a
 * `meghivot_elfogad()`-ban.
 *
 * ⚠️ A kettő **nem ugyanaz a feltétel**, és ez szándékos. Ez a függvény a
 * **kiküldés** szabálya (tagok + függő meghívók), mert a függő meghívó
 * foglalás. Az elfogadásnál viszont csak a tagok számítanak: aki két embert
 * hívott egy helyre, az elsőt ne büntesse a második meghívó léte. Az elfogadás
 * szabálya ezért **csak SQL-ben** él — a felület nem is tudná lefuttatni, mert
 * abban a pillanatban a meghívott gépe fut, nem a tulajdonosé, és a
 * taglétszámot az RLS előle elrejti.
 *
 * A számok továbbra is a `config/szamlafolyo.ts`-ben születnek; az SQL-beli
 * másolatukat a `config/hely.test.ts` őrzi, ami a migrációból olvassa ki őket.
 */
export function ferMegTag(
  keret: { allapot: string; csomagKulcs: CsomagKulcs | null },
  tagok: number,
  fuggoMeghivok: number,
): { fer: boolean; indok?: string } {
  const max = helyek(keret);

  if (max === null) {
    return { fer: true };
  }

  const foglalt = tagok + fuggoMeghivok;

  if (foglalt < max) {
    return { fer: true };
  }

  return {
    fer: false,
    indok:
      fuggoMeghivok > 0
        ? `A csomagodba ${max} felhasználó fér, és a függő meghívókkal együtt már ennyi van. Vonj vissza egy meghívót, vagy válts nagyobb csomagra.`
        : `A csomagodba ${max} felhasználó fér. Nagyobb csomaggal több kolléga vehető fel.`,
  };
}
