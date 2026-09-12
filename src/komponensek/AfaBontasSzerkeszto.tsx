import { brutto } from '@uzleti/afaBontas.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { AFA_KATEGORIAK, kategoriaCimke } from '@uzleti/enumok.ts';
import { hozzaadhatoSor, uresBontasSor, type UrlapBontasSor } from '@uzleti/urlap.ts';

/**
 * A szerkeszthető ÁFA-bontás.
 *
 * **Szerkeszthető, mert a sorok összege a legerősebb ellenőrzésünk** — ez fogja
 * meg azt a hibát, amikor a modell egy tételsor összegét írja végösszegnek. És
 * amit az ember nem tud javítani, azzal a jelzés is csak bosszantás lenne.
 *
 * A bruttót **nem tároljuk**, soronként itt áll elő: az EN 16931 sem tárol mást,
 * mint adóalapot és adóösszeget, a származtatott érték pedig idővel elcsúszik.
 */

export function AfaBontasSzerkeszto({
  sorok,
  onChange,
  hibak,
  csakOlvashato = false,
}: {
  sorok: UrlapBontasSor[];
  onChange: (sorok: UrlapBontasSor[]) => void;
  hibak: Record<string, string>;
  csakOlvashato?: boolean | undefined;
}) {
  function modosit(i: number, mezo: keyof UrlapBontasSor, ertek: string) {
    onChange(sorok.map((sor, j) => (i === j ? { ...sor, [mezo]: ertek } : sor)));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flabel">ÁFA-bontás</span>
        <span className="text-xs text-slate-400">A bruttó számolt érték</span>
      </div>

      {sorok.length > 0 && (
        /*
          Rögzített oszlopszélességek: enélkül a hosszú kategórianév
          („Mentes (AAM, TAM)") összenyomta a szám oszlopokat, a fejlécek
          egymásra csúsztak, a számolt bruttó pedig kilógott a táblázatból.
          A vízszintes görgetés a szűk képernyőé.
        */
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="mt-1 w-full min-w-[34rem] text-sm tabular-nums">
            <colgroup>
              <col className="w-20" />
              <col />
              <col className="w-32" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-7" />
            </colgroup>
            <thead>
              <tr className="text-xs tracking-wide text-slate-400 uppercase">
                <th className="py-1 text-right font-medium">Kulcs</th>
                <th className="py-1 pl-2 text-left font-medium">Kategória</th>
                <th className="py-1 text-right font-medium">Nettó</th>
                <th className="py-1 text-right font-medium">ÁFA</th>
                <th className="py-1 text-right font-medium">Bruttó</th>
                <th>
                  <span className="sr-only">Törlés</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((sor, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="ÁFA-kulcs"
                      className="control px-2 py-1 text-right"
                      value={sor.kulcs}
                      disabled={csakOlvashato}
                      onChange={(e) => modosit(i, 'kulcs', e.target.value)}
                    />
                    {hibak[`${i}.kulcs`] !== undefined && (
                      <p className="fhiba">{hibak[`${i}.kulcs`]}</p>
                    )}
                  </td>
                  <td className="py-1 pr-1 pl-2">
                    <select
                      aria-label="ÁFA-kategória"
                      className="control px-2 py-1"
                      value={sor.kategoria}
                      disabled={csakOlvashato}
                      onChange={(e) => modosit(i, 'kategoria', e.target.value)}
                    >
                      <option value="">—</option>
                      {AFA_KATEGORIAK.map((k) => (
                        <option key={k} value={k}>
                          {kategoriaCimke(k)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Adóalap"
                      className="control px-2 py-1 text-right"
                      value={sor.netto}
                      disabled={csakOlvashato}
                      onChange={(e) => modosit(i, 'netto', e.target.value)}
                    />
                    {hibak[`${i}.netto`] !== undefined && (
                      <p className="fhiba">{hibak[`${i}.netto`]}</p>
                    )}
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="ÁFA összege"
                      className="control px-2 py-1 text-right"
                      value={sor.afa}
                      disabled={csakOlvashato}
                      onChange={(e) => modosit(i, 'afa', e.target.value)}
                    />
                    {hibak[`${i}.afa`] !== undefined && <p className="fhiba">{hibak[`${i}.afa`]}</p>}
                  </td>
                  <td className="py-2 pr-1 text-right whitespace-nowrap text-slate-500">
                    {formaz(brutto(sor.netto, sor.afa))}
                  </td>
                  <td className="py-2 text-right">
                    {!csakOlvashato && (
                      <button
                        type="button"
                        aria-label="Sor törlése"
                        className="btn btn-ghost btn-sm px-1 text-slate-400 hover:text-red-700"
                        onClick={() => onChange(sorok.filter((_, j) => j !== i))}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!csakOlvashato && hozzaadhatoSor(sorok) && (
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-1 px-0 text-blue-700"
          onClick={() => onChange([...sorok, uresBontasSor()])}
        >
          + Sor hozzáadása
        </button>
      )}
    </div>
  );
}
