import { szamlafolyo } from '../../config/szamlafolyo.ts';

/**
 * E-mailes beküldés — a döntések, kapcsolat nélkül.
 *
 * Ebben a modulban nincs hálózat, nincs adatbázis és nincs fájl: csak az a
 * négy kérdés, amit egy beérkezett levélre meg kell válaszolni.
 *
 *   1. Melyik cégnek szól? (`cimzettToken`)
 *   2. Elfogadjuk-e a feladót? (`feladotEllenoriz`)
 *   3. Melyik mellékletét töltsük le egyáltalán? (`mellekletValogat`)
 *   4. Mit írjunk ki róla a felhasználónak? (a `reason` mondatok)
 *
 * Azért van külön a webhook-függvénytől, mert **ez az a rész, ami elromolhat
 * csendben**. Egy rossz címzett-értelmezés idegen cég keretéből költene; egy
 * rossz melléklet-válogatás minden aláírásból bizonylatot csinálna. Mindkettő
 * úgy hibázna, hogy közben 200-as választ adunk, és senki nem néz oda.
 * Egységtesztben ezek olcsón mérhetők — élesben nem.
 */

const { bekuldes, feltoltes } = szamlafolyo;

/* -------------------------------------------------------------------------
 * 1. Kinek szól
 * ---------------------------------------------------------------------- */

/**
 * A címzettből a cég tokenje, vagy `null`.
 *
 * A bejövő cím sokféle alakban jön, mert a küldő oldalán ember írta:
 * `b-abc@d.hu`, `"Számlák" <b-abc@d.hu>`, `B-ABC@D.HU`. Mindhárom ugyanaz a
 * cím — a helyi rész kis/nagybetűje elvileg számíthatna, de a gyakorlatban
 * egyetlen levelező sem tesz különbséget, és egy nagybetűs továbbküldés miatt
 * elveszett számla nem magyarázható meg senkinek.
 *
 * A tartományt **ellenőrizzük**: enélkül egy `b-<idegen token>@barmi.hu`
 * címre küldött levél — amit például egy Cc: sor hoz be — a saját cégünkhöz
 * kerülne. A címzett-lista nem a mi állításunk.
 */
export function cimzettToken(cim: string, domain: string = bekuldes.domain): string | null {
  const tiszta = cimetKibont(cim);

  if (tiszta === null) {
    return null;
  }

  const kukac = tiszta.lastIndexOf('@');
  const helyi = tiszta.slice(0, kukac);
  const tartomany = tiszta.slice(kukac + 1);

  if (tartomany !== domain.toLowerCase()) {
    return null;
  }

  if (!helyi.startsWith(bekuldes.elotag)) {
    return null;
  }

  const token = helyi.slice(bekuldes.elotag.length);

  // Pontosan az az ábécé, amit a `bekuldes_token_general()` használ. Szűken
  // tartva: így egy `b-abc+valami@…` alakú plusz-címzés sem csúszik át
  // tokennek, és a lekérdezés soha nem lát tetszőleges szöveget.
  return /^[abcdefghjkmnpqrstvwxyz23456789]{16}$/.test(token) ? token : null;
}

/**
 * A címzett-listából az **első** olyan cím, ami hozzánk szól.
 *
 * Miért az első, és miért nem hiba a több: egy levél mehet két cég címére is
 * (`To:` és `Cc:`), és ilyenkor a szolgáltató **külön webhookot küld
 * mindegyikre**, saját levélazonosítóval. A lista, amit itt látunk, a levél
 * teljes címzettsora — abból nekünk az kell, amelyik a mi tartományunkba esik.
 */
export function cimzettekbolToken(cimek: readonly string[], domain: string = bekuldes.domain): string | null {
  for (const cim of cimek) {
    const token = cimzettToken(cim, domain);

    if (token !== null) {
      return token;
    }
  }

  return null;
}

/** A `b-<token>@<domain>` cím, ahogy a felületen megjelenik. */
export function bekuldesiCim(token: string, domain: string = bekuldes.domain): string {
  return `${bekuldes.elotag}${token}@${domain}`;
}

/* -------------------------------------------------------------------------
 * 2. Elfogadjuk-e a feladót
 * ---------------------------------------------------------------------- */

export type FeladoDontes = { ok: true } | { ok: false; indok: string };

/**
 * ⚠️ **Ez nem biztonsági határ.** A `From` fejléc hamisítható; a biztonsági
 * határ maga a kitalálhatatlan cím. Ez a szűrő a *véletlen* ellen véd: a
 * hírlevél ellen, az automata válasz ellen, az aláírásból kiszivárgott cím
 * ellen — vagyis az ellen, hogy a cég keretét olyasmi költse el, amit senki
 * nem küldött oda szándékosan.
 *
 * Ezt azért kell kimondani, mert egy „feladó-ellenőrzés" nevű dolog könnyen
 * látszik többnek, mint ami. A nap végén, ha a cím kiszivárog, a válasz a
 * token cseréje, nem ez a lista.
 */
export function feladotEllenoriz(
  felado: string,
  tagCimek: readonly string[],
  barkitol: boolean,
): FeladoDontes {
  if (barkitol) {
    return { ok: true };
  }

  const cim = cimetKibont(felado);

  if (cim === null) {
    return { ok: false, indok: 'A feladó címe nem értelmezhető.' };
  }

  const ismert = tagCimek.some((tag) => cimetKibont(tag) === cim);

  if (ismert) {
    return { ok: true };
  }

  return {
    ok: false,
    indok:
      `A(z) „${cim}" nem a cég tagjának a címe. Ha szeretnéd, hogy bárki ` +
      'küldhessen erre a címre, kapcsold be a Beállításokban.',
  };
}

/* -------------------------------------------------------------------------
 * 3. Melyik mellékletet töltsük le
 * ---------------------------------------------------------------------- */

export type MellekletFej = {
  id: string;
  filename?: string | null;
  content_type?: string | null;
  /**
   * A melléklet mérete bájtban, vagy **`null`/hiányzó = nem tudjuk**.
   *
   * ⚠️ A kettő nem ugyanaz, és ezen élesben el is bukott egy valódi levél: a
   * webhook payloadja a mellékletről csak azonosítót, nevet és típust ad,
   * méretet **nem** — azt külön API-hívás adja. Egy `size ?? 0` így minden
   * beérkező számlát „üres"-nek minősített.
   */
  size?: number | null;
  /**
   * `'inline'` = a levél **törzsébe ágyazott** kép (aláírás-logó, beillesztett
   * képernyőkép); `'attachment'` = csatolmány.
   *
   * Ez a jelzés sokkal erősebb, mint a méret: egy valódi levélen mérve az
   * aláírás-logó 194 kB volt — a „valószínűleg aláíráskép" küszöb négyszerese
   * —, miközben a `content_disposition` első ránézésre megmondta róla az
   * igazat.
   */
  content_disposition?: string | null;
};

export type Valogatas = {
  /** Ezeket töltjük le. A sorrend a beérkezési sorrend. */
  elfogadott: MellekletFej[];
  /** Amit kihagytunk, a miértjével együtt — ez megy a naplóba. */
  mellozott: { nev: string; indok: string }[];
};

type Jelleg = 'bizonylat' | 'kep' | 'egyeb';

/**
 * Melyik mellékletet érdemes egyáltalán letölteni.
 *
 * # Két lépcső, és miért nem egy
 *
 * Ez a függvény **csak a fejlécekből** dolgozik: fájlnév, deklarált típus,
 * méret. Mindhárom a küldő *állítása*, nem tény — a tényt a letöltött bájtok
 * adják, és azokat a `fajltipus.ts` `ellenoriz()`-e nézi meg, ugyanaz a
 * függvény, ami a böngészős feltöltésnél is dönt.
 *
 * Akkor miért van ez a lépcső egyáltalán? Mert a letöltés pénzbe és időbe
 * kerül, és egy aláírásnyi logót nincs értelme áthozni ahhoz, hogy utána
 * eldobjuk. Ez a szűrő tehát **olcsóbb, nem szigorúbb** — a végső szót a
 * bájtok mondják ki.
 *
 * # A szabály
 *
 * Ha a levélben van PDF vagy XML, a képekhez **hozzá sem nyúlunk**. Ez fedi le
 * a gyakori esetet — szállítói számla PDF-ben, céglogó az aláírásban — anélkül,
 * hogy bármilyen méretküszöbre támaszkodnánk.
 *
 * Kép csak akkor jön szóba, ha a levélben nincs bizonylat-alakú melléklet; ez
 * a „lefotóztam a nyugtát" eset. Ilyenkor a méret dönt, és ez bevallottan
 * heurisztika (lásd a `kepMinBajt` indoklását a configban).
 */
export function mellekletValogat(mellekletek: readonly MellekletFej[]): Valogatas {
  const elfogadott: MellekletFej[] = [];
  const mellozott: { nev: string; indok: string }[] = [];

  const meretre: MellekletFej[] = [];

  for (const m of mellekletek) {
    const nev = m.filename ?? '(névtelen melléklet)';
    // `null` = nem tudjuk. Ez NEM nulla bájt, és a kettőt összemosni annyi,
    // mint hiányzó információra elutasítani — ugyanaz a hiba, mint amit a
    // kredit- és keretszámolás mindenhol elkerül.
    const meret = m.size ?? null;

    if (meret !== null && meret > feltoltes.maxBajt) {
      const mb = Math.round(feltoltes.maxBajt / 1024 / 1024);
      mellozott.push({ nev, indok: `Nagyobb ${mb} MB-nál.` });
      continue;
    }

    if (meret === 0) {
      mellozott.push({ nev, indok: 'Üres.' });
      continue;
    }

    meretre.push(m);
  }

  const vanBizonylat = meretre.some((m) => jellege(m) === 'bizonylat');

  // Van-e olyan kép, amit **kifejezetten csatoltak**? Ha igen, a törzsbe
  // ágyazottak mellette díszek — tipikusan az aláírás logója a lefotózott
  // nyugta mellett. Ha viszont minden kép beágyazott, akkor nincs mihez
  // képest dísznek lennie: valaki beillesztette a képet a levél törzsébe, és
  // az a bizonylat. Ilyenkor marad a méretküszöb.
  const vanCsatoltKep = meretre.some((m) => jellege(m) === 'kep' && !beagyazott(m));

  for (const m of meretre) {
    const nev = m.filename ?? '(névtelen melléklet)';
    const jelleg = jellege(m);

    if (jelleg === 'egyeb') {
      mellozott.push({ nev, indok: 'Nem feldolgozható típus.' });
      continue;
    }

    if (jelleg === 'kep') {
      if (vanBizonylat) {
        mellozott.push({ nev, indok: 'A levélben van PDF vagy XML, a képeket ilyenkor kihagyjuk.' });
        continue;
      }

      if (beagyazott(m) && vanCsatoltKep) {
        mellozott.push({ nev, indok: 'A levél törzsébe ágyazott kép – valószínűleg aláírás.' });
        continue;
      }

      // Ismeretlen méretnél **átengedjük**. A küszöb heurisztika, és egy
      // heurisztika nem utasíthat el olyasmit, amiről semmit nem tudunk: egy
      // elveszett számla rosszabb, mint egy fölösleges bizonylat, amit a
      // felhasználó egy kattintással eldob.
      const meret = m.size ?? null;

      if (meret !== null && meret < bekuldes.kepMinBajt) {
        const kb = Math.round(bekuldes.kepMinBajt / 1024);
        mellozott.push({ nev, indok: `Kisebb ${kb} kB-nál – valószínűleg aláíráskép.` });
        continue;
      }
    }

    if (elfogadott.length >= bekuldes.maxMelleklet) {
      mellozott.push({ nev, indok: `Egy levélből legfeljebb ${bekuldes.maxMelleklet} mellékletet dolgozunk fel.` });
      continue;
    }

    elfogadott.push(m);
  }

  return { elfogadott, mellozott };
}

/**
 * A melléklet jellege a **deklarált** típusból és a fájlnévből.
 *
 * Mindkettőt nézzük, mert külön-külön egyik sem elég: sok levelezőprogram
 * `application/octet-stream`-et mond mindenre, más meg kiterjesztés nélküli
 * nevet ad. Ha bármelyik azt mondja, hogy PDF, akkor megnézzük — a bájtok
 * úgyis eldöntik.
 */
/**
 * A levél **törzsébe ágyazott** melléklet-e.
 *
 * Csak a kifejezett `inline` számít annak. A hiányzó jelzés nem jelent
 * beágyazottságot — ugyanaz az elv, mint a méretnél: hiányzó információra nem
 * utasítunk el.
 */
function beagyazott(m: MellekletFej): boolean {
  return (m.content_disposition ?? '').toLowerCase().trim() === 'inline';
}

function jellege(m: MellekletFej): Jelleg {
  const tipus = (m.content_type ?? '').toLowerCase().split(';')[0]?.trim() ?? '';
  const nev = (m.filename ?? '').toLowerCase();
  const kiterjesztes = nev.includes('.') ? nev.slice(nev.lastIndexOf('.') + 1) : '';

  if (tipus === 'application/pdf' || kiterjesztes === 'pdf') {
    return 'bizonylat';
  }

  if (tipus === 'text/xml' || tipus === 'application/xml' || kiterjesztes === 'xml') {
    return 'bizonylat';
  }

  if (
    tipus === 'image/jpeg' ||
    tipus === 'image/png' ||
    tipus === 'image/webp' ||
    ['jpg', 'jpeg', 'png', 'webp'].includes(kiterjesztes)
  ) {
    return 'kep';
  }

  return 'egyeb';
}

/* -------------------------------------------------------------------------
 * Közös
 * ---------------------------------------------------------------------- */

/**
 * Egy e-mail fejlécmezőből a puszta cím, kisbetűsen — vagy `null`.
 *
 * Kezeli a `"Név" <cim@hol.hu>` alakot és a csupasz címet is. Nem teljes
 * RFC 5322 értelmező, és nem is akar az lenni: itt egyetlen címet kell
 * kibontani, nem egy listát zárójelezett megjegyzésekkel.
 */
export function cimetKibont(nyers: string): string | null {
  const szoveg = nyers.trim();
  const nyito = szoveg.lastIndexOf('<');
  const zaro = szoveg.lastIndexOf('>');

  const cim = nyito !== -1 && zaro > nyito ? szoveg.slice(nyito + 1, zaro) : szoveg;
  const tiszta = cim.trim().toLowerCase();

  const kukac = tiszta.indexOf('@');

  if (kukac <= 0 || kukac !== tiszta.lastIndexOf('@') || kukac === tiszta.length - 1) {
    return null;
  }

  if (/[\s,;<>"]/.test(tiszta)) {
    return null;
  }

  return tiszta;
}
