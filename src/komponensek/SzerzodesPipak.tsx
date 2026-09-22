import { szamlafolyo } from '@config/szamlafolyo.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { FeltetelekPipa } from './FeltetelekPipa.tsx';

/**
 * A szerződéskötés két nyilatkozata — **ott, ahol a szerződés létrejön.**
 *
 * # Miért itt, és nem a regisztrációnál
 *
 * Az ÁSZF 1. pontja kimondja: „a regisztráció önmagában fiókot hoz létre; a
 * szerződés a **cég létrehozásával** jön létre". A pipa viszont eddig a
 * regisztrációs képernyőn állt, a cégalapítón pedig **semmi** — vagyis a
 * nyilatkozat és a szerződéskötés két külön képernyőn élt, és egyiket sem
 * rögzítettük.
 *
 * A regisztráció pipája megmarad: ott a saját személyes adatairól szóló
 * tájékoztatás tudomásulvétele a tétje, itt pedig a **szerződés**.
 *
 * # Miért két pipa, és miért nem elég egy
 *
 * A Ptk. 6:78. § (2)–(3) bekezdése szerint a szokásos szerződési gyakorlattól
 * lényegesen eltérő kikötés **csak akkor** válik a szerződés részévé, ha a
 * másik felet arról külön tájékoztatták, és azt kifejezetten elfogadta.
 *
 * Az ÁSZF eddig ezt **önmagáról állította** (13. pont: „az Előfizető elismeri,
 * hogy külön tájékoztatást kapott") — egy önmagára hivatkozó kijelentés
 * viszont nem tájékoztatás, és nem is bizonyíték. A két kikötést maga az ÁSZF
 * nevezi meg, tehát nincs mérlegelnivaló abban, melyik kettőt kell kiemelni:
 * a **felelősség összegszerű korlátja** (13.) és az **eredeti fájlok
 * automatikus törlése** (10.).
 *
 * Ezért látszik itt, olvashatóan, mindkettő lényege — nem csak egy link rá.
 *
 * # Amit ez a komponens nem csinál
 *
 * Nem tárol és nem küld semmit: a két állapotot a hívó képernyő viszi, és a
 * `ceg_letrehozas()` RPC rögzíti a verzióval együtt. A szerver a második
 * pipát **kapuként** is kezeli — enélkül a sorban álló `true` a szerver saját
 * állítása volna a felhasználóról.
 */
export function SzerzodesPipak({
  feltetelek,
  feltetelekValtozott,
  kikotesek,
  kikotesekValtozott,
}: {
  feltetelek: boolean;
  feltetelekValtozott: (ertek: boolean) => void;
  kikotesek: boolean;
  kikotesekValtozott: (ertek: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <FeltetelekPipa elfogadva={feltetelek} valtozott={feltetelekValtozott} />

      <div className="border-t border-slate-200 pt-3">
        <p className="mb-2 text-xs font-semibold text-slate-700">
          Két kikötésre külön is felhívjuk a figyelmed:
        </p>
        <ul className="mb-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li>
            <strong>Az eredeti fájlok az export után törlődnek</strong> a szerverről —
            alapesetben azonnal, legfeljebb {szamlafolyo.megorzes.maxNap} napos türelmi idővel,
            amit a Beállításokban te állítasz. A kiolvasott adat megmarad, de a bizonylatok
            jogszabályi megőrzése a te dolgod, nem a miénk (ÁSZF 10.).
          </li>
          <li>
            <strong>A felelősségünknek összegszerű korlátja van:</strong> legfeljebb a
            káreseményt megelőző hat hónapban ténylegesen megfizetett díj. Ez nem vonatkozik a
            szándékosan okozott kárra, az emberi életet, testi épséget vagy egészséget
            megkárosító szerződésszegésre, sem az adatvédelmi felelősségünkre (ÁSZF 13.). A
            legkisebb csomag havi díja ma {formaz(szamlafolyo.csomagok.kicsi.arHavi, 'Ft')} —
            érdemes ehhez mérni, mit jelent a korlát.
          </li>
        </ul>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 rounded border-slate-300"
            required
            checked={kikotesek}
            onChange={(e) => kikotesekValtozott(e.target.checked)}
          />
          <span>E két kikötést külön, kifejezetten elfogadom.</span>
        </label>
      </div>
    </div>
  );
}
