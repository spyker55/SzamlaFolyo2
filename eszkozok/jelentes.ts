import { szamlafolyo } from '../config/szamlafolyo.ts';
import { sav, type Sav } from '../shared/uzleti/konfidencia.ts';
import { CIMKEK, MEZOK } from '../shared/uzleti/sema.ts';
import { kategoriaCimke } from '../shared/uzleti/enumok.ts';
import type { LancEredmeny } from '../shared/uzleti/lanc.ts';
import { naplo, type Felderites } from '../supabase/functions/kiolvas/felderites.ts';

/**
 * A `kiolvasas:proba` jelentése — **a script tiszta fele.**
 *
 * Azért külön fájl, mert a script maga csupa I/O (fájl, hálózat, `stdout`), ez
 * viszont nem: bemegy egy mérés, kijön a szöveg. Így tesztelhető anélkül, hogy
 * egy modellhívást kellene elkölteni hozzá — és a `allandosag()`, ami a
 * mérőeszköz legfontosabb darabja, épp az a fajta logika, amit nem szabad
 * mérés nélkül hinni.
 */

/** Egy futás eredménye — az XML-ágé és a modellhívásé is ebben az alakban. */
export type Futas = {
  /** Ki olvasta ki: `xml/ubl`, `xml/nav`, … vagy a **kért** modell azonosítója. */
  olvaso: string;
  /** Amit a szolgáltató ténylegesen futtatott. XML-ágon `null`. */
  futtatottModell: string | null;
  promptVerzio: string | null;
  bemenetToken: number | null;
  kimenetToken: number | null;
  /** A `kimenetToken` **része**, nem afölött — lásd `openrouter.ts`. */
  gondolkodasToken: number | null;
  koltseg: number | null;
  idoMs: number;
  eredmeny: LancEredmeny;
};

export type Meres = {
  fajl: { nev: string; bajt: number; mime: string };
  felderites: Felderites;
  futasok: readonly Futas[];
};

const SAV_JEL: Record<Sav, string> = {
  biztos: '✓',
  bizonytalan: '?',
  gyanus: '!',
  nincs_adat: '·',
};

const SAV_SZO: Record<Sav, string> = {
  biztos: 'biztos',
  bizonytalan: 'bizonytalan',
  gyanus: 'gyanús',
  nincs_adat: 'nincs adat',
};

/**
 * A mezők állandósága több futás között.
 *
 * **Ez a script létjogosultsága.** Egyetlen modellfutás semmit nem mond a
 * pontosságról: a projekt legdrágább leckéje épp az volt, hogy ugyanazt a
 * kézzel írott számlát hatszor kiolvasva **hat különböző, kitalált
 * szállítónév** jött ki, miközben minden szám hatszor helyes volt. Aki egyszer
 * futtat, abból egyetlen nevet lát — és elhiszi.
 *
 * Visszaad minden olyan mezőt, amin **nem egyezik** az összes futás, a látott
 * értékekkel együtt. Üres eredmény = a kiolvasás ismételhető volt; ez nem
 * ugyanaz, mint hogy helyes.
 */
export function allandosag(futasok: readonly Futas[]): Record<string, string[]> {
  const ingadozo: Record<string, string[]> = {};

  if (futasok.length < 2) {
    return ingadozo;
  }

  for (const mezo of [...MEZOK, 'afa_bontas'] as const) {
    const latott: string[] = [];

    for (const futas of futasok) {
      const ertek =
        mezo === 'afa_bontas'
          ? JSON.stringify(futas.eredmeny.bontas)
          : (futas.eredmeny.mezok[mezo] ?? '—');

      if (!latott.includes(ertek)) {
        latott.push(ertek);
      }
    }

    if (latott.length > 1) {
      ingadozo[mezo] = latott;
    }
  }

  return ingadozo;
}

/**
 * A `--json` alak — összeméréshez, két prompt- vagy modellverzió között.
 *
 * ⚠️ A felderítésből **nem** a teljes objektum megy ki, hanem a `naplo()`
 * eredménye: pontosan az, amit a `forras_naplo` oszlopba írnánk. Két oka van,
 * és mindkettő számít. A `Felderites` magában hordozza a **teljes XML-t** és
 * az oldalankénti szöveget — vagyis a bizonylat egészét; egy fájlba kiírt
 * mérésnek ehhez semmi köze. A másik: így a JSON azt mutatja, amit az
 * adatbázis látna, nem azt, ami a memóriában volt.
 */
export function jsonAlak(meres: Meres): Record<string, unknown> {
  return {
    fajl: meres.fajl,
    felderites: naplo(meres.felderites),
    futasok: meres.futasok,
  };
}

/** A teljes jelentés. Sima szöveg: a terminálé, nem a böngészőé. */
export function jelentes(meres: Meres): string {
  const sorok: string[] = [
    cim('A FÁJL'),
    par('név', meres.fajl.nev),
    par('méret', `${meres.fajl.bajt.toLocaleString('hu-HU')} bájt`),
    par('típus (tartalomból)', meres.fajl.mime),
    '',
    ...felderitesSorok(meres.felderites),
  ];

  const elso = meres.futasok[0];
  if (elso === undefined) {
    return sorok.join('\n');
  }

  sorok.push('', ...olvasoSorok(elso), '', ...mezoSorok(elso), '', ...bontasSorok(elso));
  sorok.push('', ...validatorSorok(elso), '', ...zaszloSorok(elso, meres.felderites));

  if (meres.futasok.length > 1) {
    sorok.push('', ...ismetlesSorok(meres.futasok));
  }

  sorok.push('', ...osszesitesSorok(meres.futasok));

  return sorok.join('\n');
}

function felderitesSorok(f: Felderites): string[] {
  const sorok = [
    cim('FELDERÍTÉS'),
    par('jelleg', jellegSzo(f.jelleg)),
    par('oldalszám', f.oldalszam === null ? 'ismeretlen' : String(f.oldalszam)),
    par('szövegréteg', `${f.szovegHossz} karakter`),
  ];

  if (f.xmlNev !== null) {
    sorok.push(par('beágyazott XML', `${f.xmlNev} — ${f.xmlBajt ?? 0} bájt`));
  }

  if (f.hiba !== null) {
    sorok.push(par('⚠️ felderítési hiba', f.hiba));
  }

  return sorok;
}

/**
 * A `jelleg` azt mondja meg, **mi volt elérhető**, nem azt, ki olvasta ki — a
 * `felderites.ts` fejléce is ezt köti ki. A szó ezért a lehetőséget nevezi
 * meg; hogy ténylegesen mi futott, az a következő szakasz.
 */
function jellegSzo(jelleg: Felderites['jelleg']): string {
  return {
    strukturalt_xml: 'strukturált XML (önálló fájl)',
    beagyazott_xml: 'hibrid e-számla (PDF-be ágyazott XML)',
    szovegreteg: 'PDF szövegréteggel',
    kep: 'kép vagy szövegréteg nélküli PDF',
  }[jelleg];
}

function olvasoSorok(f: Futas): string[] {
  const sorok = [cim('KI OLVASTA KI'), par('olvasó', f.olvaso)];

  if (f.futtatottModell !== null && f.futtatottModell !== f.olvaso) {
    // ⚠️ Nem ugyanaz, amit kértünk. Ez nem hiba, de a pontosságmérés
    // értelmezhetetlen anélkül, hogy tudnánk, melyik modell felelt.
    sorok.push(par('⚠️ ténylegesen futott', f.futtatottModell));
  } else if (f.futtatottModell !== null) {
    sorok.push(par('ténylegesen futott', f.futtatottModell));
  }

  if (f.promptVerzio !== null) {
    sorok.push(par('prompt verzió', f.promptVerzio));
  }

  sorok.push(par('idő', `${f.idoMs} ms`));

  if (f.bemenetToken !== null || f.kimenetToken !== null) {
    sorok.push(
      par(
        'token',
        `${f.bemenetToken ?? '?'} be · ${f.kimenetToken ?? '?'} ki` +
          (f.gondolkodasToken === null
            ? ''
            : ` (ebből ${f.gondolkodasToken} gondolkodás — a kimenet része, nem afölött)`),
      ),
    );
  }

  sorok.push(par('költség', koltsegSzo(f.koltseg)));

  return sorok;
}

/**
 * A költség **dollárban** marad.
 *
 * A mérés a dolláré; a forint átszámítás, és a napi árfolyam nincs a kezünkben.
 * Egy odaírt forintérték úgy nézne ki, mintha mértük volna.
 */
function koltsegSzo(koltseg: number | null): string {
  if (koltseg === null) {
    return 'nulla — nem modell olvasta ki';
  }

  return `${koltseg.toFixed(6)} USD`;
}

/**
 * A mezők — **a tárolt alakjukban.**
 *
 * Nem a képernyőn látható formázott értéket írjuk ki (`160 000 HUF`), hanem
 * azt, ami az adatbázisba kerülne (`160000.00`): ez a mérőeszköz a
 * normalizálást is méri, és egy elveszett tizedes a formázott alakban nem
 * látszana.
 *
 * Az érték a **sor végén** áll, a pont és a sáv előtte: így egy hosszú
 * szállítónév nem tolja szét az oszlopokat.
 */
function mezoSorok(f: Futas): string[] {
  const sorok = [cim('MEZŐK')];

  for (const mezo of MEZOK) {
    const ertek = f.eredmeny.mezok[mezo];
    const pont = f.eredmeny.konfidencia.combined[mezo];
    const s = sav(pont);

    sorok.push(
      `  ${SAV_JEL[s]} ${pontSzo(pont)}  ${pad(SAV_SZO[s], 12)}${cimke(mezo)}` +
        `${ertek === null || ertek === '' ? '—' : ertek}`,
    );

    const bukas = f.eredmeny.validatorok[mezo];
    if (bukas !== undefined) {
      sorok.push(`      ↳ ${bukas}`);
    }
  }

  return sorok;
}

function pontSzo(pont: number | undefined): string {
  return pont === undefined ? '  —  ' : pont.toFixed(3).replace('.', ',');
}

/**
 * Az ÁFA-bontás a **kiolvasás utáni** alakjában — pontosan az, amit a `kiolvas`
 * a `documents.afa_bontas` oszlopba ír.
 *
 * ⚠️ Mérve (2026-09-21): a **jóváhagyás átírja.** A kiolvasó számokat ír
 * (`netto: 100000`), az Ellenőrzés képernyőről mentett sor viszont szöveget
 * (`"100000.00"`) — ugyanabban a jsonb oszlopban. Ez nem hiba: a bontás
 * olvasói (`afaBontas.ts`) szándékosan `unknown`-t fogadnak és az `osszeg.ts`
 * értelmezőjén futtatják, tehát mindkét alakot értik. De aki a tárolt sort a
 * script kimenetéhez hasonlítja, ezen megakadhat — a kettő csak a
 * jóváhagyás **előtt** azonos.
 */
function bontasSorok(f: Futas): string[] {
  const sorok = [cim('ÁFA-BONTÁS')];
  const s = sav(f.eredmeny.konfidencia.combined['afa_bontas']);

  if (f.eredmeny.bontas === null || f.eredmeny.bontas.length === 0) {
    sorok.push('  nincs');
    return sorok;
  }

  for (const sor of f.eredmeny.bontas) {
    const kategoria = sor.kategoria === null ? '—' : kategoriaCimke(sor.kategoria);
    sorok.push(
      `  ${SAV_JEL[s]} ${pad(`${String(sor.kulcs)}%`, 8)}${pad(kategoria, 20)}` +
        `nettó ${pad(String(sor.netto), 14)}ÁFA ${String(sor.afa)}`,
    );
  }

  const bukas = f.eredmeny.validatorok['afa_bontas'];
  if (bukas !== undefined) {
    sorok.push(`      ↳ ${bukas}`);
  }

  return sorok;
}

/**
 * A bukott validátorok **üzenetenként**, nem mezőnként.
 *
 * Egy „nettó + ÁFA ≠ bruttó" hármat is megjelöl, és háromszor kiírva úgy
 * nézne ki, mintha három baj volna. A mezőknél ott áll mindhárom jelölés; itt
 * az érdekes az, **hány dolog romlott el.**
 */
function validatorSorok(f: Futas): string[] {
  const uzenetenkent = new Map<string, string[]>();

  for (const [mezo, uzenet] of Object.entries(f.eredmeny.validatorok)) {
    uzenetenkent.set(uzenet, [...(uzenetenkent.get(uzenet) ?? []), CIMKEK[mezo] ?? mezo]);
  }

  if (uzenetenkent.size === 0) {
    return [cim('VALIDÁTOROK'), '  mind tiszta'];
  }

  return [
    cim('VALIDÁTOROK'),
    ...[...uzenetenkent].map(([uzenet, mezok]) => `  ! ${uzenet}  (${mezok.join(', ')})`),
  ];
}

function zaszloSorok(f: Futas, felderites: Felderites): string[] {
  return [
    cim('ZÁSZLÓK ÉS KREDIT'),
    par('nehezen olvasható', f.eredmeny.nehezenOlvashato ? 'IGEN' : 'nem'),
    par('több irat gyanúja', f.eredmeny.tobbIratGyanu ? 'IGEN' : 'nem'),
    par(
      'kredit',
      `${f.eredmeny.kreditek} — ${felderites.oldalszam === null ? 'ismeretlen oldalszám' : `${felderites.oldalszam} oldal`}, ` +
        `${szamlafolyo.kredit.oldalPerKredit} oldal / kredit`,
    ),
    '',
    // ⚠️ A kapu döntését **nem** írjuk ki, és ez szándékos: a hét kapuból
    // négy a cég adatbázisbeli előzményeiből dolgozik (ismert szállító,
    // bemelegítés, mintavétel, duplikátum), amihez ennek a scriptnek nincs
    // hozzáférése. Egy szintetikus előzményre adott „automatikusan
    // jóváhagyva" pontosan az a fajta állítás volna, ami tudásnak látszik.
    // Amit a bizonylatról tudni lehet, az fent áll: bukott validátor,
    // hiányzó kulcsmező, alacsony magabiztosság, kézírás, kötegyanú.
    '  (A kapuk döntése nincs itt: annak a cég előzményei kellenek, azok meg az adatbázisban vannak.)',
  ];
}

function ismetlesSorok(futasok: readonly Futas[]): string[] {
  const ingadozo = allandosag(futasok);
  const sorok = [cim(`ÁLLANDÓSÁG (${futasok.length} futás)`)];

  if (Object.keys(ingadozo).length === 0) {
    sorok.push('  Minden mező minden futásban ugyanaz volt.');
    sorok.push('  ⚠️ Ez ismételhetőség, nem helyesség — csak te tudod megmondani, jó-e.');
    return sorok;
  }

  sorok.push('  ⚠️ Ezek a mezők futásról futásra mást adtak:');

  for (const [mezo, ertekek] of Object.entries(ingadozo)) {
    sorok.push(`  ! ${cimke(mezo)}`);
    for (const ertek of ertekek) {
      sorok.push(`      · ${ertek}`);
    }
  }

  return sorok;
}

function osszesitesSorok(futasok: readonly Futas[]): string[] {
  const koltsegek = futasok.map((f) => f.koltseg).filter((k): k is number => k !== null);
  const osszes = koltsegek.reduce((a, b) => a + b, 0);
  const ido = futasok.reduce((a, f) => a + f.idoMs, 0);

  return [
    cim('ÖSSZESEN'),
    par('futás', String(futasok.length)),
    par('idő', `${ido} ms`),
    par(
      'költség',
      koltsegek.length === 0 ? 'nulla — egyetlen modellhívás sem történt' : `${osszes.toFixed(6)} USD`,
    ),
  ];
}

function cim(szoveg: string): string {
  return `${szoveg}\n${'─'.repeat(szoveg.length)}`;
}

function par(nev: string, ertek: string): string {
  return `  ${pad(`${nev}:`, 24)}${ertek}`;
}

function cimke(mezo: string): string {
  return pad(CIMKEK[mezo] ?? mezo, 24);
}

/**
 * Oszlopszélesség — **kódponttal**, nem UTF-16 egységgel. Magyar szövegen a
 * kettő ugyanaz; egy emodzsit tartalmazó szállítónéven nem az, és attól a
 * táblázat csak csúnya lenne, nem hibás.
 */
function pad(szoveg: string, szeles: number): string {
  const hossz = [...szoveg].length;

  return hossz >= szeles ? `${szoveg} ` : szoveg + ' '.repeat(szeles - hossz);
}
