/**
 * Az adatbázisban minden idő UTC, a képernyőn minden idő budapesti. Ez az
 * egyetlen hely, ahol a kettő találkozik.
 *
 * A megjelenítés `Intl`-lel megy, nem külső könyvtárral: a `shared/uzleti`-nek
 * **nulla függősége** van, mert ugyanezt a mappát importálja a Deno-alapú Edge
 * Function is.
 */

export const ZONA = 'Europe/Budapest';

/** `2026. 03. 14.` */
export function datum(ido: Date | string | null | undefined): string {
  const d = datumma(ido);
  if (d === null) return '—';

  return reszek(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** `2026. 03. 14. 09:32` */
export function datumIdo(ido: Date | string | null | undefined): string {
  const d = datumma(ido);
  if (d === null) return '—';

  const nap = reszek(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const ora = new Intl.DateTimeFormat('hu-HU', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return `${nap} ${ora}`;
}

/** A mai nap Budapesten, `YYYY-MM-DD` alakban. */
export function ma(): string {
  return budapestiNap(new Date());
}

/**
 * Egy időbélyeg **napja** Budapesten, `YYYY-MM-DD` alakban.
 *
 * Az export ezt írja a „Beérkezés" oszlopba: gépi feldolgozásra az ISO alak
 * kell, nem a magyar kiírás — de a nap akkor is a budapesti nap, mert a
 * felhasználó a saját naptárában keresi vissza. Egy 23:30-kor feltöltött
 * bizonylat UTC szerint már másnapi lenne.
 */
export function nap(ido: Date | string | null | undefined): string | null {
  const d = datumma(ido);
  return d === null ? null : budapestiNap(d);
}

/**
 * A modell `YYYY-MM-DD`-t ad vissza, de a papíron `2026.03.14.` áll —
 * ellenőrzéskor ember is beleírhat. Ez mindkettőt elfogadja, és **csak valóban
 * létező napot** enged át: a `2026-02-31` némán március 3-ává válna.
 */
export function datumErtelmez(nyers: string | null | undefined): string | null {
  if (nyers === null || nyers === undefined || nyers.trim() === '') {
    return null;
  }

  const s = nyers.trim().replace(/[.\s/]+/g, '-').replace(/^-+|-+$/g, '');

  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (!m) {
    return null;
  }

  const ev = Number(m[1]);
  const ho = Number(m[2]);
  const nap = Number(m[3]);

  if (!letezoNap(ev, ho, nap)) {
    return null;
  }

  return `${pad(ev, 4)}-${pad(ho, 2)}-${pad(nap, 2)}`;
}

// ---------------------------------------------------------------------------
// Belső segédek
// ---------------------------------------------------------------------------

/** A `checkdate()` megfelelője: a hónap túlcsordulása nem csúszhat át. */
function letezoNap(ev: number, ho: number, nap: number): boolean {
  if (ho < 1 || ho > 12 || nap < 1) {
    return false;
  }
  // A 0. nap a következő hónapban az előző hónap utolsó napja.
  const utolso = new Date(Date.UTC(ev, ho, 0)).getUTCDate();
  return nap <= utolso;
}

function pad(n: number, hossz: number): string {
  return String(n).padStart(hossz, '0');
}

function datumma(ido: Date | string | null | undefined): Date | null {
  if (ido === null || ido === undefined || ido === '') return null;
  const d = ido instanceof Date ? ido : new Date(ido);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Az `Intl` magyar formátuma `2026. 03. 14.` alakú, de a szeparátorok
 * böngészőnként eltérhetnek — ezért a részekből rakjuk össze, nem a kimenetet
 * toldozzuk.
 */
function reszek(d: Date, opciok: Intl.DateTimeFormatOptions): string {
  const formazo = new Intl.DateTimeFormat('hu-HU', { timeZone: ZONA, ...opciok });
  const map = new Map(formazo.formatToParts(d).map((r) => [r.type, r.value]));
  return `${map.get('year')}. ${map.get('month')}. ${map.get('day')}.`;
}

function budapestiNap(d: Date): string {
  const formazo = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // Az `en-CA` eleve `YYYY-MM-DD` alakot ad.
  return formazo.format(d);
}
