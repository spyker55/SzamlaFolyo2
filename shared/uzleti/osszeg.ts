/**
 * Pénzösszeg értelmezése és kiírása magyar írásmód szerint.
 *
 * A modell tizedesponttal, csoportosítás nélkül adja vissza az összeget — de az
 * ellenőrző képernyőn ember is beleír, és ő úgy gépel, ahogy a papíron látja:
 * `1 612 900,25`. Ez a modul mindkettőt elfogadja, és `null` helyett **hibás**
 * választ ad, ha nem érti — így a hívó vissza tud szólni a felhasználónak
 * ahelyett, hogy csendben nullát írna az adatbázisba.
 *
 * Az érték **sztringként** utazik (`'1612900.25'`), nem `number`-ként: az oszlop
 * `numeric(15,2)`, és a supabase-js is sztringként adja vissza. Így a
 * lebegőpontos sodródás sosem jut be az adatbázisba.
 */

export type OsszegEredmeny = {
  readonly ok: boolean;
  readonly ertek: string | null;
};

const HIBAS: OsszegEredmeny = { ok: false, ertek: null };

/**
 * Értelmezés. A visszatérő `ertek` mindig két tizedesre vágott, pont
 * elválasztójú, csoportosítás nélküli sztring — vagy `null`, ha üres volt a
 * bemenet (az `ok` ilyenkor is igaz: az üres mező nem hiba).
 */
export function ertelmez(nyers: string | number | null | undefined): OsszegEredmeny {
  if (nyers === null || nyers === undefined) {
    return { ok: true, ertek: null };
  }

  if (typeof nyers === 'number') {
    if (!Number.isFinite(nyers)) {
      return HIBAS;
    }
    return { ok: true, ertek: kerekitSzamrol(nyers) };
  }

  // Minden szóközfajta csoportosító jel: a sima szóköz, a nem törhető szóköz
  // (U+00A0) és a keskeny nem törhető szóköz (U+202F) is — az Intl formázók
  // maguk is ez utóbbiakat írják ki.
  let s = nyers.trim().replace(/[\s  ]+/gu, '');

  if (s === '') {
    return { ok: true, ertek: null };
  }

  let negativ = false;
  if (s.startsWith('-')) {
    negativ = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  // Pénznem-jelek és a magyar „Ft" lecsípése.
  s = s.replace(/(Ft|HUF|EUR|USD|€|\$)$/iu, '');

  if (!/^[0-9.,]+$/.test(s)) {
    return HIBAS;
  }

  const pont = szamlal(s, '.');
  const vesszo = szamlal(s, ',');

  let egesz: string;
  let tort: string;

  if (pont > 0 && vesszo > 0) {
    // Mindkettő szerepel: a jobbra álló a tizedesjel.
    const tizedesJel = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
    const csoportJel = tizedesJel === ',' ? '.' : ',';
    const vagas = s.lastIndexOf(tizedesJel);
    egesz = s.slice(0, vagas);
    tort = s.slice(vagas + 1);

    if (!csoportositasRendben(egesz, csoportJel) || !/^\d+$/.test(tort)) {
      return HIBAS;
    }

    egesz = egesz.split(csoportJel).join('');
  } else if (vesszo === 1) {
    // Egyetlen vessző magyar írásmódban mindig tizedesjel.
    const reszek = s.split(',');
    egesz = reszek[0] ?? '';
    tort = reszek[1] ?? '';
    if (!/^\d+$/.test(egesz) || !/^\d+$/.test(tort)) {
      return HIBAS;
    }
  } else if (vesszo > 1) {
    // Több vessző csak csoportosítás lehet: 1,612,900
    if (!csoportositasRendben(s, ',')) {
      return HIBAS;
    }
    egesz = s.split(',').join('');
    tort = '';
  } else if (pont === 1) {
    // Egyetlen pont a valóban kétes eset. A `100.000` magyarul százezer, a
    // `256.5` viszont tizedes. Csak a pontosan hármas végződésű, ezres alakot
    // vesszük csoportosításnak — és csak ha nem nullával kezdődik, mert a
    // `0.500` nem lehet ezres csoport.
    if (/^[1-9]\d{0,2}\.\d{3}$/.test(s)) {
      egesz = s.split('.').join('');
      tort = '';
    } else {
      const reszek = s.split('.');
      egesz = reszek[0] ?? '';
      tort = reszek[1] ?? '';
      if (!/^\d+$/.test(egesz) || !/^\d+$/.test(tort)) {
        return HIBAS;
      }
    }
  } else if (pont > 1) {
    if (!csoportositasRendben(s, '.')) {
      return HIBAS;
    }
    egesz = s.split('.').join('');
    tort = '';
  } else {
    egesz = s;
    tort = '';
  }

  if (!/^\d+$/.test(egesz)) {
    return HIBAS;
  }

  return { ok: true, ertek: kerekitSzamjegyekbol(negativ, egesz, tort) };
}

/** Megjelenítés: `1 612 900,25`, felesleges tizedesek nélkül. */
export function formaz(
  ertek: string | number | null | undefined,
  penznem?: string | null,
): string {
  if (ertek === null || ertek === undefined || ertek === '') {
    return '—';
  }

  // A tárolt alak kanonikus (pont a tizedesjel), ezért **nem** az emberi
  // értelmezőt futtatjuk rá: az a `100.000`-et százezernek olvasná, holott
  // tárolt értékként az száz. A megjelenítés azt mutassa, ami az adatbázisban
  // van, ne értelmezze újra.
  const kanonikus =
    typeof ertek === 'number' ? kerekitSzamrol(ertek) : olvasKanonikus(ertek);

  if (kanonikus === null) {
    return '—';
  }

  const negativ = kanonikus.startsWith('-');
  const magnitudo = negativ ? kanonikus.slice(1) : kanonikus;
  const [egeszResz = '0', tortResz = ''] = magnitudo.split('.');

  const tizedesKell = /[1-9]/.test(tortResz);
  const formazott =
    (negativ ? '-' : '') +
    csoportosit(egeszResz) +
    (tizedesKell ? ',' + tortResz.slice(0, 2).padEnd(2, '0') : '');

  return penznem !== null && penznem !== undefined && penznem !== ''
    ? `${formazott} ${penznem}`
    : formazott;
}

// ---------------------------------------------------------------------------
// Belső segédek
// ---------------------------------------------------------------------------

function szamlal(s: string, jel: string): number {
  let db = 0;
  for (const karakter of s) {
    if (karakter === jel) db++;
  }
  return db;
}

/**
 * `1 234 567` alakú-e: az első csoport 1–3 jegy, a többi pontosan 3.
 * Enélkül a `12.34.567` is átcsúszna csoportosításként.
 */
function csoportositasRendben(egesz: string, jel: string): boolean {
  if (!egesz.includes(jel)) {
    return /^\d+$/.test(egesz);
  }

  const reszek = egesz.split(jel);
  const elso = reszek.shift() ?? '';

  if (!/^\d{1,3}$/.test(elso)) {
    return false;
  }

  return reszek.every((resz) => /^\d{3}$/.test(resz));
}

/**
 * Kerekítés két tizedesre, **a lebegőpont érintése nélkül.**
 *
 * Két csapdát kerül el, amit a naiv port nem venne észre:
 *
 * 1. A PHP `round()` a nullától elfelé kerekít (`-2,5 → -3`), a JS
 *    `Math.round()` viszont a `+∞` felé (`-2,5 → -2`). A sztornó és a
 *    helyesbítő számla összege **negatív**, tehát ez nem elméleti eltérés.
 * 2. A `toFixed` sem menekülőút: `(1.005).toFixed(2)` JS-ben `"1.00"`, mert a
 *    lebegőpontos ábrázolás mást hoz, mint amit leírtunk.
 *
 * Itt a bemenet már számjegysztringekre van bontva, ezért a vágás tiszta
 * sztringművelet: az első eldobott jegy dönt (≥5 → a nullától elfelé), az
 * átvitelt pedig `BigInt` viszi, tehát tetszőleges hosszon is pontos.
 */
function kerekitSzamjegyekbol(negativ: boolean, egesz: string, tort: string): string {
  const egeszTiszta = egesz.replace(/^0+(?=\d)/, '');
  const harom = (tort + '000').slice(0, 3);
  const megtart = harom.slice(0, 2);
  const eldobott = harom.charCodeAt(2) - 48;

  let osszefuzve = egeszTiszta + megtart;

  if (eldobott >= 5) {
    osszefuzve = (BigInt(osszefuzve) + 1n).toString();
  }

  osszefuzve = osszefuzve.padStart(3, '0');

  const ujEgesz = osszefuzve.slice(0, -2);
  const ujTort = osszefuzve.slice(-2);

  // A `-0.00` nem érték: ha a nagyságrend nulla, az előjel elmarad.
  const nulla = /^0+$/.test(ujEgesz) && ujTort === '00';
  const elojel = negativ && !nulla ? '-' : '';

  return `${elojel}${ujEgesz.replace(/^0+(?=\d)/, '')}.${ujTort}`;
}

/** Számból kanonikus alak, exponenciális írásmódot is kibontva. */
function kerekitSzamrol(n: number): string {
  const negativ = n < 0 || Object.is(n, -0);
  const s = Math.abs(n).toString();

  if (!s.includes('e') && !s.includes('E')) {
    const [egesz = '0', tort = ''] = s.split('.');
    return kerekitSzamjegyekbol(negativ, egesz, tort);
  }

  // Exponenciális alak: 20 tizedesig kibontva bőven a numeric(15,2) alatt
  // maradunk, a kerekítést pedig úgyis a sztringes ág végzi.
  const kibontva = Math.abs(n).toFixed(20);
  const [egesz = '0', tort = ''] = kibontva.split('.');
  return kerekitSzamjegyekbol(negativ, egesz, tort);
}

/** A tárolt, kanonikus alak beolvasása. Ami nem az, arra nincs mit mutatni. */
function olvasKanonikus(ertek: string): string | null {
  const s = ertek.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    // Nem kanonikus — ilyenkor még mindig jobb az emberi értelmezővel
    // megpróbálni, mint gondolkodás nélkül gondolatjelet írni.
    return ertelmez(s).ertek;
  }
  const negativ = s.startsWith('-');
  const magnitudo = negativ ? s.slice(1) : s;
  const [egesz = '0', tort = ''] = magnitudo.split('.');
  return kerekitSzamjegyekbol(negativ, egesz, tort);
}

/** Ezres csoportosítás sima szóközzel, ahogy a magyar írásmód kéri. */
function csoportosit(egesz: string): string {
  return egesz.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
