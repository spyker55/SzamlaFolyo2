import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

/**
 * `node eszkozok/meres-osszevetes.ts meres-alap.json meres-low.json …`
 *
 * Több `kiolvasas:proba --json` mérés egymás mellett, **röviden** – hogy a
 * gondolkodás korlátozásáról egy képernyőnyi táblázatból lehessen dönteni, ne
 * három hosszú JSON-ból.
 *
 * Amit oszloponként kiír: a beállítást; hány futás volt, sikerült, bukott (és
 * ebből hány 429, hány gondolkodott a keret végéig); a gondolkodás, a kimenet
 * és az idő mediánját és szélsőit; a költséget; és mezőnként azt, hány sikeres
 * futás adta a helyes értéket.
 *
 * ⚠️ **Helyes értéket csak a saját próbaszámlánkra ismerünk**
 * (`tesztadat/egy-szamla-rendes.pdf` → a `harom-szamla-rendes.json` első
 * számlája). Minden más fájlnál – valódi számlánál – csak azt írja ki, mezőnként
 * hány **különböző** érték jött, magukat az értékeket nem: a kimenet
 * beszélgetésbe másolható, és egy valódi partner neve, adószáma ne kerüljön oda.
 *
 * A script a Node saját TypeScript-futtatásával indul (csak típustörlés):
 * paramétertulajdonság, `enum`, `namespace` itt nem használható – lásd
 * `kiolvasasProba.test.ts`.
 */

type Futas = {
  kimenetToken: number | null;
  gondolkodasToken: number | null;
  koltseg: number | null;
  idoMs: number;
  eredmeny: { mezok: Record<string, string | null> };
};

type Bukott = {
  hiba: string;
  leallas: string | null;
  koltseg: number | null;
  idoMs: number;
};

export type MeresJson = {
  fajl: { nev: string };
  beallitas?: { modell: string | null; gondolkodas: string } | null;
  futasok: Futas[];
  bukottFutasok?: Bukott[];
};

/** A mezők, amikre a próbaszámlán a helyes érték ismert, és a sorrendjük. */
const ELLENORZOTT: [string, string][] = [
  ['doc_type', 'Típus'],
  ['doc_number', 'Bizonylatszám'],
  ['supplier_name', 'Szállító'],
  ['supplier_tax_number', 'Szállító adószáma'],
  ['customer_name', 'Vevő'],
  ['customer_tax_number', 'Vevő adószáma'],
  ['issue_date', 'Kelt'],
  ['fulfillment_date', 'Teljesítés'],
  ['due_date', 'Határidő'],
  ['net_amount', 'Nettó'],
  ['vat_amount', 'ÁFA'],
  ['gross_amount', 'Bruttó'],
  ['fizetendo', 'Fizetendő'],
  ['currency', 'Pénznem'],
  ['payment_method', 'Fizetési mód'],
];

/** A próbaszámla ismert adatai, a mezők tárolt alakjához igazítva. */
export function probaszamlaElvart(): Record<string, string> {
  const adat = JSON.parse(
    readFileSync(new URL('../tesztadat/harom-szamla-rendes.json', import.meta.url), 'utf8'),
  ) as { szamlak: Record<string, unknown>[] };
  const sz = adat.szamlak[0]!;

  return {
    doc_type: 'szamla',
    doc_number: String(sz['doc_number']),
    supplier_name: String(sz['supplier_name']),
    supplier_tax_number: String(sz['supplier_tax_number']),
    customer_name: String(sz['customer_name']),
    customer_tax_number: String(sz['customer_tax_number']),
    issue_date: String(sz['issue_date']),
    fulfillment_date: String(sz['fulfillment_date']),
    due_date: String(sz['due_date']),
    net_amount: String(sz['net_amount']),
    vat_amount: String(sz['vat_amount']),
    gross_amount: String(sz['gross_amount']),
    fizetendo: String(sz['gross_amount']),
    currency: String(sz['currency']),
    payment_method: String(sz['payment_method']),
  };
}

/** Összegnél a szám dönt (`203200.00` = `203200`), máshol a szöveg, kis-nagybetű nélkül. */
function egyezik(kapott: string | null | undefined, elvart: string): boolean {
  if (kapott === null || kapott === undefined) return false;
  const k = Number(kapott);
  const e = Number(elvart);
  if (elvart.trim() !== '' && Number.isFinite(e) && Number.isFinite(k)) return k === e;
  return kapott.trim().toLocaleLowerCase('hu') === elvart.trim().toLocaleLowerCase('hu');
}

function median(szamok: number[]): number | null {
  if (szamok.length === 0) return null;
  const r = [...szamok].sort((a, b) => a - b);
  const k = Math.floor(r.length / 2);
  return r.length % 2 === 1 ? r[k]! : Math.round((r[k - 1]! + r[k]!) / 2);
}

function tartomany(szamok: (number | null)[], mertek = ''): string {
  const t = szamok.filter((s): s is number => s !== null);
  if (t.length === 0) return '–';
  return `${median(t)}${mertek} (${Math.min(...t)}–${Math.max(...t)})`;
}

function pad(s: string, n: number): string {
  const h = [...s].length;
  return h >= n ? `${s} ` : s + ' '.repeat(n - h);
}

/** Az összevetés szövege. `elvart`: a helyes értékek, vagy `null`, ha nem ismertek. */
export function osszevet(meresek: { nev: string; m: MeresJson }[], elvart: Record<string, string> | null): string {
  const SZ = 26;
  const OSZ = 24;
  const sor = (cim: string, ertekek: string[]) => pad(cim, SZ) + ertekek.map((e) => pad(e, OSZ)).join('');
  const sorok: string[] = [];

  sorok.push(sor('', meresek.map((x) => x.nev)));
  sorok.push(sor('fájl', meresek.map((x) => x.m.fajl.nev)));
  sorok.push(sor('gondolkodás-beállítás', meresek.map((x) => x.m.beallitas?.gondolkodas ?? '?')));

  const bukottak = (m: MeresJson) => m.bukottFutasok ?? [];
  sorok.push(
    sor(
      'futás / siker / bukott',
      meresek.map((x) => {
        const b = bukottak(x.m).length;
        return `${x.m.futasok.length + b} / ${x.m.futasok.length} / ${b}`;
      }),
    ),
  );
  sorok.push(sor('  ebből 429', meresek.map((x) => String(bukottak(x.m).filter((b) => b.hiba.includes('(429)')).length))));
  sorok.push(
    sor(
      '  ebből keret végéig',
      meresek.map((x) => String(bukottak(x.m).filter((b) => /MAX_TOKENS|length/.test(b.leallas ?? '')).length)),
    ),
  );
  sorok.push(
    sor(
      '  egyéb hiba',
      meresek.map(
        (x) =>
          String(
            bukottak(x.m).filter((b) => !b.hiba.includes('(429)') && !/MAX_TOKENS|length/.test(b.leallas ?? '')).length,
          ),
      ),
    ),
  );
  sorok.push(sor('gondolkodás (med, min–max)', meresek.map((x) => tartomany(x.m.futasok.map((f) => f.gondolkodasToken)))));
  sorok.push(sor('kimenet (med, min–max)', meresek.map((x) => tartomany(x.m.futasok.map((f) => f.kimenetToken)))));
  sorok.push(sor('idő ms (med, min–max)', meresek.map((x) => tartomany(x.m.futasok.map((f) => f.idoMs)))));
  sorok.push(
    sor(
      'költség össz. (USD)',
      meresek.map((x) => {
        const k = [...x.m.futasok, ...bukottak(x.m)].map((f) => f.koltseg ?? 0).reduce((a, b) => a + b, 0);
        return k.toFixed(4);
      }),
    ),
  );

  sorok.push('');

  if (elvart !== null) {
    sorok.push(sor('MEZŐK – helyes / sikeres', []));
    for (const [mezo, cimke] of ELLENORZOTT) {
      sorok.push(
        sor(
          `  ${cimke}`,
          meresek.map((x) => {
            const jo = x.m.futasok.filter((f) => egyezik(f.eredmeny.mezok[mezo], elvart[mezo]!)).length;
            return `${jo}/${x.m.futasok.length}${jo < x.m.futasok.length ? '  ✗' : ''}`;
          }),
        ),
      );
    }

    // A hibás értékek – a próbaszámlán ez nem valódi adat, tehát kiírható.
    const hibasak: string[] = [];
    for (const x of meresek) {
      for (const [mezo, cimke] of ELLENORZOTT) {
        const rosszak = x.m.futasok
          .map((f) => f.eredmeny.mezok[mezo])
          .filter((v) => !egyezik(v, elvart[mezo]!));
        if (rosszak.length > 0) {
          const db = new Map<string, number>();
          for (const r of rosszak) db.set(String(r), (db.get(String(r)) ?? 0) + 1);
          hibasak.push(
            `  ${x.nev} · ${cimke}: ${[...db].map(([v, n]) => `„${v}" ×${n}`).join(', ')} (helyes: „${elvart[mezo]}")`,
          );
        }
      }
    }
    if (hibasak.length > 0) sorok.push('', 'ELTÉRÉSEK', ...hibasak);
  } else {
    sorok.push(sor('MEZŐK – különböző értékek', []));
    sorok.push('  (valódi számla: az értékek szándékosan nincsenek kiírva)');
    for (const [mezo, cimke] of ELLENORZOTT) {
      sorok.push(
        sor(
          `  ${cimke}`,
          meresek.map((x) => {
            const kul = new Set(x.m.futasok.map((f) => String(f.eredmeny.mezok[mezo]))).size;
            return `${kul}${kul > 1 ? '  ≠' : ''}`;
          }),
        ),
      );
    }
  }

  return sorok.join('\n');
}

function fo(): number {
  const fajlok = process.argv.slice(2);
  if (fajlok.length === 0) {
    console.error('Használat: node eszkozok/meres-osszevetes.ts meres-alap.json meres-low.json …');
    return 1;
  }

  const meresek = fajlok.map((f) => ({
    nev: basename(f, '.json'),
    m: JSON.parse(readFileSync(f, 'utf8')) as MeresJson,
  }));

  const mindProba = meresek.every((x) => x.m.fajl.nev === 'egy-szamla-rendes.pdf');
  console.log(osszevet(meresek, mindProba ? probaszamlaElvart() : null));
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(basename(process.argv[1]))) {
  process.exitCode = fo();
}
