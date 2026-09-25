/**
 * A hirdetésképek mintaadatai – kitalált cégek, kitalált számok.
 *
 * Minden **felületszöveg** (állapotcímke, hibaüzenet, forrásjelzés) szó
 * szerint az alkalmazásból jön, és a `hirdetes.test.ts` ellenőrzi, hogy ma is
 * ott áll: a hirdetés képe ne mutasson olyan felületet, ami nincs.
 */
import { bekuldesiCim } from '@uzleti/bekuldes.ts';
import { CIMKEK } from '@uzleti/kiolvasoForras.ts';
import { allapotCimke } from '@uzleti/enumok.ts';

/** A validátor mondata (`shared/uzleti/validatorok.ts`), szó szerint. */
export const VALIDATOR_UZENET = 'A nettó és az ÁFA összege nem adja ki a bruttót.';

/*
 * A mezőkártya. A szállító adószáma érvényes ellenőrző számjeggyel kitalált
 * szám (1234567-6: 9·1+7·2+3·3+1·4+9·5+7·6+3·7 = 144 → 6), így a kártya
 * nem mutat hibát ott, ahol a valódi validátor sem mutatna.
 */
export const MEZOK: readonly { cimke: string; ertek: string; gyanus: boolean }[] = [
  { cimke: 'Szállító neve', ertek: 'Hegyvidék Nyomda Zrt.', gyanus: false },
  { cimke: 'Szállító adószáma', ertek: '12345676-2-42', gyanus: false },
  { cimke: 'Nettó', ertek: '100 000 Ft', gyanus: false },
  { cimke: 'ÁFA', ertek: '27 000 Ft', gyanus: false },
  { cimke: 'Bruttó', ertek: '130 000 Ft', gyanus: true },
];

/** A nyitólap `BeerkezoMinta()`-jának sorai, szó szerint. */
export const BEERKEZO_SOROK: readonly { fajl: string; mit: string; allapot: string; varakozik: boolean }[] = [
  { fajl: 'e-szamla.xml', mit: 'Az adatok közvetlenül az XML-fájlból származnak.', allapot: allapotCimke('jovahagyva'), varakozik: false },
  { fajl: 'etterem_blokk.jpg', mit: 'Egy adat ellenőrzést igényel.', allapot: allapotCimke('ellenorzesre_var'), varakozik: true },
  {
    fajl: 'aws_invoice_08.pdf',
    mit: 'Külföldi, fordított adózású számla. Az automatikus ellenőrzések nem jeleztek eltérést.',
    allapot: allapotCimke('jovahagyva'),
    varakozik: false,
  },
];

/** Egy kitalált token – a cím alakja a valódi `bekuldesiCim()`-é. */
export const MINTA_BEKULDESI_CIM = bekuldesiCim('x7k2m9q4');

export const EMAIL = {
  targy: 'Fw: Számla 2026/0412',
  melleklet: 'szamla_2026_0412.pdf',
  eredmeny: '1 új bizonylat a Beérkezőben',
} as const;

/** Az export képernyő választható formátumai, ahogy a hirdetés mutatja. */
export const EXPORT_SOROK: readonly { nev: string; mit: string }[] = [
  { nev: 'RLB Kettős', mit: 'importfájl' },
  { nev: 'Novitax NTAX', mit: 'importfájl' },
  { nev: 'Kulcs-Könyvelés', mit: 'importfájl' },
  { nev: 'XLSX · CSV · JSON', mit: 'táblázat és adat' },
];

export const MINTA_UGYFEL = 'Ügyfél: Hegyvidék Nyomda Zrt.';

export const XML_FORRAS = {
  rovid: CIMKEK['xml/ubl'] ?? 'UBL e-számla',
  mondat: 'A bizonylat adatai a fájlban lévő strukturált e-számlából származnak: a szállító rendszere írta ki őket, mi átvettük.',
} as const;
