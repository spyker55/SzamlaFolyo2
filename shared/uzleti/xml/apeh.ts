import type { DokumentumTipus } from '../enumok.ts';
import { konfidencia, type Ertelmezo, type NyersValasz } from './ertelmezo.ts';
import {
  datummaAlakit,
  gyerekek,
  nevterTartalmaz,
  ut,
  utSzam,
  utSzoveg,
  type Csomopont,
  type Dokumentum,
} from './fa.ts';

/**
 * APEH 2005 „számla adatexport" — a magyar számlázóprogramok e-számla
 * csatolmánya.
 *
 * Régebbi a NAV Online Számla sémájánál, és **nem ugyanaz**: csupa magyar
 * elemnév, `szamla` gyökér, `http://www.apeh.hu/2005/szamla` névtér. A
 * könyvelőhöz eljutó fájlok jó része ilyen — az Online Számla portál ugyanis
 * bizonylatonkénti XML-t nem ad, csak xlsx/csv **listát**.
 *
 * Hogy ez nem elméleti: az első valódi importunk (Billingo-számla, 1794 bájt)
 * pontosan ilyen volt, és mivel egyik értelmezőnk sem ismerte fel, a modellhez
 * esett — 0,005605 USD, 5,5 másodperc. Ugyanaz a fájl ezen az ágon nulla
 * forint és nulla találgatás.
 */
export const apeh: Ertelmezo = {
  nev: 'xml/apeh',

  tamogatja: (doc: Dokumentum) => {
    // A `szamla` gyökérnév önmagában messze nem elég: egy tetszőleges magyar
    // házi XML is hívhatja így magát. A névtér az, ami minősíti.
    if (doc.gyoker.nev !== 'szamla') {
      return false;
    }

    return nevterTartalmaz(doc, 'apeh.hu/2005/szamla');
  },

  ertelmez: (gyoker: Csomopont): NyersValasz => {
    const fejlec = ut(gyoker, 'fejlec');
    const elado = ut(fejlec, 'elado');
    const vevo = ut(fejlec, 'vevo');
    const info = ut(fejlec, 'szamlainfo');
    const osszesites = ut(gyoker, 'osszesites');
    const vegosszeg = ut(osszesites, 'vegosszeg');

    const mezok: Record<string, unknown> = {
      doc_type: tipus(info),
      supplier_name: utSzoveg(elado, 'nev'),
      supplier_tax_number: utSzoveg(elado, 'adoszam'),
      customer_name: utSzoveg(vevo, 'nev'),
      // Magánszemély vevőnél az `<adoszam>` elem ott van, de üres — az
      // `utSzoveg()` az üres szöveget már ma is `null`-ra fordítja.
      customer_tax_number: utSzoveg(vevo, 'adoszam'),
      doc_number: utSzoveg(info, 'sorszam'),
      issue_date: datummaAlakit(utSzoveg(info, 'kialldatum')),
      fulfillment_date: datummaAlakit(utSzoveg(info, 'teljdatum')),
      due_date: datummaAlakit(utSzoveg(info, 'fizhatarido')),
      // Szabad szöveg a bizonylaton („Bankkártya", „Átutalás 30 nap"), nem
      // kódlista — úgy megy tovább, ahogy a papíron áll.
      payment_method: utSzoveg(info, 'fizmod'),
      currency: utSzoveg(info, 'penznem'),
      net_amount: utSzam(vegosszeg, 'nettoarossz'),
      vat_amount: utSzam(vegosszeg, 'afaertekossz'),
      gross_amount: utSzam(vegosszeg, 'bruttoarossz'),
      // Ez a formátum nem ismer a bruttótól eltérő fizetendő összeget.
      fizetendo: null,
    };

    const bontas = bontasSorok(osszesites);

    return {
      ...mezok,
      afa_bontas: bontas,
      // Ez a séma egy fájlban egy bizonylatot ír le.
      tobb_irat_gyanu: false,
      // A strukturált adat nem átírás kérdése: nincs mit félreolvasni.
      nehezen_olvashato: false,
      confidence: konfidencia(mezok, bontas.length > 0),
    };
  },
};

/**
 * A bizonylattípus a **szabad szövegű** `szamlatipusa` elemből.
 *
 * Nem kódlista: a gyártó azt írja bele, ami a bizonylatra kerül („Számla",
 * „Sztornó számla"). Ezért normalizálva hasonlítunk, és amit nem ismerünk fel,
 * arra **nem tippelünk** — a `null` azt jelenti, hogy az ellenőrző képernyőn az
 * embernek kell kiválasztania. Ugyanaz a doktrína, amit a `kodok.ts` kimond: egy
 * rossz típus rosszabb, mint egy üres.
 *
 * A `hivatkozottszamla` csak tartalék: ha a típus szövege ismeretlen, de van
 * hivatkozott bizonylat, akkor ez **valamilyen** helyesbítő okirat. A pontos
 * gyűjtőfogalmat adjuk, nem szűkítünk sztornóra — egy helyesbítést sztornónak
 * minősíteni egy egész számlát érvénytelenítene.
 */
function tipus(info: Csomopont | null): DokumentumTipus | null {
  const szoveg = (utSzoveg(info, 'szamlatipusa') ?? '').toLowerCase();

  if (szoveg.includes('sztor') || szoveg.includes('stor') || szoveg.includes('érvénytelen')) {
    return 'sztorno_szamla';
  }

  if (szoveg.includes('helyesbít') || szoveg.includes('módosít') || szoveg.includes('jóváír')) {
    return 'helyesbito_szamla';
  }

  if (szoveg.includes('előleg')) {
    return 'elolegszamla';
  }

  if (szoveg.includes('díjbekérő') || szoveg.includes('proforma')) {
    return 'dijbekero';
  }

  if (szoveg.includes('nyugta')) {
    return 'nyugta';
  }

  if (szoveg.includes('szállítólevél')) {
    return 'szallitolevel';
  }

  if (szoveg.includes('számla')) {
    return 'szamla';
  }

  return utSzoveg(info, 'hivatkozottszamla') === null ? null : 'helyesbito_szamla';
}

/**
 * ÁFA-bontás az `osszesites/afarovat` elemekből.
 *
 * ⚠️ **Közvetlen gyerekek, nem leszármazott-keresés** — és ez itt élesebb, mint
 * az UBL-nél vagy a CII-nél volt. A tételsorok (`tetelek/tetel`) gyerekei
 * **szó szerint ugyanúgy hívódnak**: `afakulcs`, `nettoar`, `afaertek`,
 * `bruttoar`. Egy leszármazott-keresés tehát nem hasonló nevet találna el,
 * hanem pontosan ugyanazt — az első tételsor értékeit írná a bizonylat
 * ÁFA-bontásába, és semmi nem jelezné a tévedést.
 */
function bontasSorok(osszesites: Csomopont | null): Record<string, unknown>[] {
  return gyerekek(osszesites, 'afarovat').map((sor) => ({
    kulcs: kulcs(sor),
    // A formátum nem tartalmaz ÁFA-kategóriát (`S`, `E`, `AE`…), és nem is
    // következtetjük ki: az adószám ÁFA-kódjából sejthető volna, de az a
    // szállítóról szól, nem erről a sorról.
    kategoria: null,
    netto: utSzam(sor, 'nettoar'),
    afa: utSzam(sor, 'afaertek'),
  }));
}

/**
 * Az ÁFA-kulcs. A formátum **egész százalékot** ír (`27`, `5`, `0`) — nem
 * törtet, mint a NAV-séma.
 *
 * Ha egy gyártó mégis `27%`-ot ír, a nyers szöveg megy tovább: a
 * `afaBontas.kulcsErtelmez()` azt is érti. Ez nem finomkodás — kulcs nélkül a
 * `tisztitBontas()` **az egész sort eldobja**, tehát egy százalékjel némán
 * elvinné a bizonylat ÁFA-bontását.
 */
function kulcs(sor: Csomopont): unknown {
  return utSzam(sor, 'afakulcs') ?? utSzoveg(sor, 'afakulcs');
}
