import { fejlesztesAlatt, kapcsolatEmail } from '../lib/kornyezet.ts';

/**
 * „Az oldal fejlesztés alatt áll" — a belépés előtti képernyőkön.
 *
 * Ez a komponens azért született, mert a `.env.example` **ígérte**, a kód meg
 * nem váltotta be: a `fejlesztesAlatt` kapcsoló ott állt a `kornyezet.ts`-ben,
 * exportálva, és sehol nem használtuk. Egy kapcsoló, ami nem kapcsol semmit,
 * rosszabb a hiányánál — azt hiszed, védve vagy.
 *
 * Miért a belépés **előtti** képernyőkön, és csak ott: aki már bent van, az
 * tudja, mibe nyúlt. Aki kívülről érkezik, annak egy szó nélküli bejelentkező
 * űrlap azt mondja, hogy ez egy kész, éles szolgáltatás — pedig nem az.
 *
 * Induláskor a `VITE_FEJLESZTES_ALATT=false` egyetlen mozdulattal leveszi.
 */
export function FejlesztesAlattSav() {
  if (!fejlesztesAlatt) {
    return null;
  }

  return (
    <div className="alert alert-figyelem mb-5 text-sm">
      <strong className="font-semibold">Az oldal fejlesztés alatt áll.</strong> Amit itt látsz,
      még változik, és az adatok is eltűnhetnek. Ha érdekel a SzámlaFolyó, írj:{' '}
      <a href={`mailto:${kapcsolatEmail}`} className="font-medium underline">
        {kapcsolatEmail}
      </a>
    </div>
  );
}
