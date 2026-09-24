import { zip } from '../zip.ts';
import { FIZMOD_CIMKEK, type KontirBeallitas } from './beallitas.ts';
import type { KonyveloiBizonylat } from './atalakit.ts';
import { ansiCsv, datum, szoveg } from './mezok.ts';

/**
 * Kulcs-Könyvelés – Főkönyvi Adatimporter, „új" struktúra.
 *
 * Forrás (2026-09-24-én letöltve):
 * - https://old.kulcs-soft.hu/frissitesek/tudasbazis/Kulcs-K%C3%B6nyvel%C3%A9s-Modul-F%C5%91k%C3%B6nyvi-Adatimporter-strukt%C3%BAra-le%C3%ADr%C3%A1s-%C3%BAj_03.xlsx
 *   (sha256 715597673fb4d5677b6a06588b7e41fdcd035bbbc0c76c694085730e5cab3fcd)
 * - https://fokonyv.kulcs-soft.hu/support/solutions/articles/80001062748-f%C5%91k%C3%B6nyvi-adatimporter
 *
 * A `brutto_03` változat (bruttó értékes tételsor) külön beállításhoz
 * tartozik; azt **nem** keverjük ide.
 *
 * # A szerkezet
 *
 * Három, azonos alapnevű fájl: `feladas.csv` (számlafej, 33 mező),
 * `feladas.001` (tételek, 22 mező), `feladas.002` (partnerek, 21 mező).
 * **Mindhárom fájl fejlécsorral kezdődik** (`KULCS_FEJLECEK`), bár a leírás
 * szerint „tetszőlegesen lehet vagy nem lehet".
 *
 * Miért fejléccel? Az Adatimporter „Fejléc kihagyása" beállítása dönti el,
 * hogy az első sort eldobja-e, és a két rossz eset nem egyformán rossz
 * (használati útmutató, 4. és 12. oldal):
 * - fejléc nélkül, bepipálva: az **első számla csendben kimarad** – egyetlen
 *   számlánál „nem tartalmaz adatot", többnél a többi beolvasódik;
 * - fejléccel, pipa nélkül: a tallózásnál **hibaüzenet** jön.
 *
 * A hangos hibát választjuk; a pipáról a betöltési lépés szól
 * (`betoltes.ts`). 2026-09-24: az első demó-próba fejléc nélkül épp „nem
 * tartalmaz adatot"-tal állt meg.
 * A fejet és a tételt a `szamlaid` köti össze, a fejet és a partnert az
 * `Ugyfelkod`. Egész forint („nincs fillér kezelés").
 *
 * Az ÁFA-kód és -név **a könyvelő Kulcs-Könyvelésében rögzített** kulcsé –
 * ezt nem tudhatjuk, a beállításból jön.
 *
 * ⚠️ A kódolást a leírás nem mondja ki; a magyar Windows-os szokás (ANSI)
 * szerint írunk, mint a másik két programnál. **Nincs kimérve valódi
 * Kulcs-Könyvelésben** – a felületen béta.
 */

/** A három fájl neve a ZIP-ben – a betöltési lépések (`betoltes.ts`) is ezt mondják. */
export const KULCS_FAJLOK = { fej: 'feladas.csv', tetel: 'feladas.001', partner: 'feladas.002' } as const;

/**
 * A struktúraleírás (`új_03.xlsx`, „Leírás" lap) mezőnevei betű szerint – a
 * fejlécsor tartalmát a program nem olvassa, de így a fájl önmagát írja le.
 */
export const KULCS_FEJLECEK = {
  fej: [
    'tipus', 'nev', 'Foszamla', 'szamlaid', 'iktatoszam', 'szamlaszam', 'fizmodnev', 'teljesites',
    'kelt', 'esedekesseg', 'Elsz.id.záró dátum', 'valutabrutto', 'valutanem', 'arfolyam',
    'reszlegszam', 'Munkaszam', 'irany', 'esed', 'afas', 'nettó', 'bruttó', 'rontott', 'storno',
    'stornoszam', 'Stornomode', 'Ugyfelkod', 'Helyesbitoosszeg', 'Megjegyzés', 'EUAdos',
    'Penzforgalmi', 'kezhezvetel', 'Projekt', 'Koltseghely - EGYEDI',
  ],
  tetel: [
    'id', 'fokszamnetto', 'Valutaertek', 'afakulcs', 'fejid', 'fokszamafa', 'afakod', 'afanev',
    'Helyesbito', 'Előleg számla száma\\ Kipontozandó számla száma', 'Megjegyzés', 'Részlegszám',
    'Munkaszám', 'Másodlagos', 'Fordított', 'Projekt', 'VTSZKOD', 'VTSZSuly', 'Koltseghely - EGYEDI',
    'Elhatarolasi idoszak kezdete', 'Elhatarolasi idoszak vege', 'Hibridvetomag',
  ],
  partner: [
    'Ügyfélkod', 'Adoszam', 'Cím', 'Ugyintezo', 'Telefon', 'Email', 'Bankszamla', 'Euadoszam',
    'ISOKOD', 'Orszag', 'Iranyitoszam', 'Varos', 'Kozterulet', 'Kozterulet jellege', 'Hazszam',
    'Epulet', 'Lepcsohaz', 'Emelet', 'Ajto', 'Afaalany', 'Csoportazonosito',
  ],
} as const;

const FEJ_MEZOK = 33;
const TETEL_MEZOK = 22;
const UGYFEL_MEZOK = 21;

export function kulcsEllenoriz(b: KonyveloiBizonylat): string[] {
  const ki: string[] = [];
  if (b.partner.torzsszam === null)
    ki.push('A partnernek nincs érvényes magyar adószáma – a Kulcs-ügyfélkód ebből készül.');
  if (b.tipus === 'sztorno' || b.tipus === 'helyesbito')
    ki.push(
      'Sztornó és helyesbítő számlánál a Kulcs az eredeti számla számát kéri – ezt a bizonylatból nem olvassuk ki.',
    );
  if (b.bizonylatszam.length > 80) ki.push('A bizonylatszám hosszabb 80 karakternél (Kulcs-korlát).');
  return ki;
}

export async function kulcs(
  bizonylatok: readonly KonyveloiBizonylat[],
  k: KontirBeallitas,
  iktatoszamok: ReadonlyMap<string, number>,
): Promise<Uint8Array> {
  const fejek: string[][] = [];
  const tetelek: string[][] = [];
  const ugyfelek = new Map<string, string[]>();
  let tetelId = 0;

  for (const b of bizonylatok) {
    const ikt = iktatoszamok.get(b.id);
    if (ikt === undefined) throw new Error(`Nincs iktatószáma: ${b.bizonylatszam}`);

    const bejovo = b.irany === 'bejovo';
    const torzs = b.partner.torzsszam as string;
    const szamlaid = `SZF${ikt}`;
    const brutto = b.netto + b.afa;

    const fej: string[] = new Array(FEJ_MEZOK).fill('');
    // 1 = vevői, 2 = szállítói, 4 = (vevői) előleg számla.
    fej[0] = bejovo ? '2' : b.tipus === 'eloleg' ? '4' : '1';
    fej[1] = szoveg(b.partner.nev, 80);
    fej[2] = bejovo ? k.szallito : k.vevo;
    fej[3] = szamlaid;
    fej[4] = bejovo ? String(ikt) : '';
    fej[5] = szoveg(b.bizonylatszam, 80);
    fej[6] = FIZMOD_CIMKEK[b.fizmod];
    fej[7] = datum(b.teljesites);
    fej[8] = datum(b.kelt);
    fej[9] = datum(b.esedekesseg);
    fej[11] = String(brutto);
    fej[12] = 'HUF';
    fej[13] = '1';
    fej[16] = bejovo ? 'B' : 'K';
    fej[17] = String(napok(b.kelt, b.esedekesseg));
    fej[18] = b.sorok.some((s) => s.afa !== 0) ? '1' : '0';
    fej[19] = String(b.netto);
    fej[20] = String(brutto);
    fej[21] = '0'; // rontott
    fej[22] = '0'; // storno – a sztornó akadály, lásd kulcsEllenoriz
    fej[24] = '0'; // Stornomode: „fenntartott mező, jelenleg 0"
    fej[25] = torzs;
    fej[27] = szoveg(b.megjegyzes, 80);
    fej[28] = '0'; // EUAdos
    fej[29] = k.penzforgalmi ? '1' : '0';
    fejek.push(fej);

    for (const s of b.sorok) {
      const kod = k.kulcs.afakodok[s.fajta];
      const t: string[] = new Array(TETEL_MEZOK).fill('');
      t[0] = String(++tetelId);
      t[1] = bejovo ? k.koltseg : k.arbevetel;
      t[2] = String(s.netto);
      t[3] = s.fajta === 'mentes' ? '0' : s.fajta;
      t[4] = szamlaid;
      t[5] = bejovo ? k.elozetesAfa : k.fizetendoAfa;
      t[6] = kod.kod;
      t[7] = kod.nev;
      t[8] = '0'; // Helyesbito
      t[14] = '0'; // Fordított
      tetelek.push(t);
    }

    if (!ugyfelek.has(torzs)) {
      const u: string[] = new Array(UGYFEL_MEZOK).fill('');
      u[0] = torzs;
      u[1] = b.partner.adoszam ?? '';
      u[8] = 'HU';
      u[9] = 'Magyarország';
      u[19] = '1'; // belföldi ÁFA-alany: érvényes magyar adószáma van
      ugyfelek.set(torzs, u);
    }
  }

  return zip([
    { nev: KULCS_FAJLOK.fej, tartalom: ansiCsv([[...KULCS_FEJLECEK.fej], ...fejek]), tomorit: true },
    { nev: KULCS_FAJLOK.tetel, tartalom: ansiCsv([[...KULCS_FEJLECEK.tetel], ...tetelek]), tomorit: true },
    {
      nev: KULCS_FAJLOK.partner,
      tartalom: ansiCsv([[...KULCS_FEJLECEK.partner], ...ugyfelek.values()]),
      tomorit: true,
    },
  ]);
}

/** A fizetési határidő napokban a kelttől (a Kulcs `esed` mezője). */
export function napok(kelt: string, esedekesseg: string): number {
  const nap = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.max(0, Math.round((nap(esedekesseg) - nap(kelt)) / 86_400_000));
}
