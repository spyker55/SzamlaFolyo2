import { tisztit } from './sema.ts';
import { normalizal } from './normalizal.ts';
import { bukottak } from './validatorok.ts';
import { osszevon, type Osszevont } from './konfidencia.ts';
import { oldalakbol } from './kredit.ts';
import { dontes, type Elozmeny, type KapuDontes } from './kapuk.ts';
import type { BontasSor, Mezo } from './sema.ts';

/**
 * A feldolgozási lánc — **a modellhívás és az adatbázis között.**
 *
 * Ez a modul szándékosan tiszta: bemegy a nyers válasz (a modellé vagy az
 * XML-értelmezőé) és amit a cégről tudunk, kijön az, ami az adatbázisba kerül.
 * Nincs benne hálózat, nincs benne SQL — ezért egyben tesztelhető, és ezért
 * lehet ugyanaz a lánc a strukturált és a modellel kiolvasott bizonylatra.
 *
 * A sorrend kötött, és mindegyik lépésnek oka van:
 *
 * 1. **tisztítás** — ismeretlen mező kiesik, a kihagyott mező ugyanaz, mint a null;
 * 2. **normalizálás** — a tárolási alakra hozás (`numeric(15,2)`, `date`);
 * 3. **validátorok** — a papírtól független ellenőrzések;
 * 4. **konfidencia** — a két jel összevonása, és a validátor **csak lefelé húz**;
 * 5. **kapuk** — ember elé kerüljön-e;
 * 6. **kredit** — a bizonylatra, nem a fájlra.
 */

export type LancBemenet = {
  /** A modell vagy az XML-értelmező nyers válasza. */
  nyers: Record<string, unknown>;
  /**
   * A **bizonylat** oldalszáma. Ha a bizonylat az egész fájl, akkor a fájlé;
   * ha oldaltartomány tartozik hozzá, akkor a tartomány hossza. `null`, ha nem
   * tudjuk — akkor egy kredit, mert bizonytalanságból nem számlázunk többet.
   */
  oldalszam: number | null;
  duplikatum: boolean;
  autoJovahagyasBe: boolean;
  elozmeny: Elozmeny;
  mintaSorszam: number;
};

export type LancEredmeny = {
  mezok: Record<Mezo, string | null>;
  bontas: BontasSor[] | null;
  validatorok: Record<string, string>;
  konfidencia: Osszevont;
  tobbIratGyanu: boolean;
  nehezenOlvashato: boolean;
  kapu: KapuDontes;
  kreditek: number;
  /** Az állapot, amit a dokumentum kap. */
  allapot: 'jovahagyva' | 'ellenorzesre_var';
};

export function feldolgoz(be: LancBemenet): LancEredmeny {
  const tiszta = tisztit(be.nyers);
  const mezok = normalizal(tiszta.mezok);
  const validatorok = bukottak(mezok, tiszta.bontas);

  const konfidencia = osszevon(
    tiszta.konfidencia,
    validatorok,
    // Az ÁFA-bontás nem skalár, ezért külön adjuk oda — de ugyanúgy van
    // magabiztossága, és ugyanúgy lehúzhatja a validátor.
    { ...mezok, afa_bontas: tiszta.bontas },
    tiszta.nehezen_olvashato,
  );

  const kapu = dontes({
    mezok,
    konfidencia: konfidencia.combined,
    bukottValidatorok: validatorok,
    nehezenOlvashato: tiszta.nehezen_olvashato,
    tobbIratGyanu: tiszta.tobb_irat_gyanu,
    duplikatum: be.duplikatum,
    autoJovahagyasBe: be.autoJovahagyasBe,
    elozmeny: be.elozmeny,
    mintaSorszam: be.mintaSorszam,
  });

  return {
    mezok,
    bontas: tiszta.bontas,
    validatorok,
    konfidencia,
    tobbIratGyanu: tiszta.tobb_irat_gyanu,
    nehezenOlvashato: tiszta.nehezen_olvashato,
    kapu,
    kreditek: oldalakbol(be.oldalszam),
    allapot: kapu.automatikus ? 'jovahagyva' : 'ellenorzesre_var',
  };
}

/**
 * Hány oldal a bizonylat.
 *
 * Ha oldaltartomány tartozik hozzá (mert a fájlban több bizonylat van), akkor a
 * tartomány hossza; egyébként az egész fájlé. **A fájlt nem vágjuk szét** —
 * elég oldaltartományt tárolni.
 */
export function bizonylatOldalszama(
  oldalTol: number | null,
  oldalIg: number | null,
  fajlOldalszam: number | null,
): number | null {
  if (oldalTol !== null && oldalIg !== null) {
    return oldalIg - oldalTol + 1;
  }

  return fajlOldalszam;
}
