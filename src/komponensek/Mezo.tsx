import type { ReactNode } from 'react';
import { savOsztaly, type Sav } from '@uzleti/konfidencia.ts';

/**
 * Egy mező az ellenőrző képernyőn: címke, beviteli elem, sáv-keret, indoklás.
 *
 * **A kiemelés a bajt jelöli, nem a rendben lévőt** — a jelöletlen mező nem
 * garancia, csak annyi, hogy nem akadt fenn semmin. Egy képernyő, ahol minden
 * ki van emelve, semmit nem emel ki.
 *
 * A szín önmagában nem elég: a bukott ellenőrzés indoklása **szövegesen is** ott
 * áll. Színvakság mellett a szín nem látszik — a vastagabb bal szegély és a
 * mondat viszont igen.
 */

export type MezoProps = {
  mezo: string;
  cimke: string;
  ertek: string;
  onChange: (ertek: string) => void;
  sav: Sav;
  /** A bukott determinisztikus ellenőrzés indoklása. */
  hiba?: string | null | undefined;
  /** A bevitel értelmezhetetlenségére adott hiba (mentéskor derül ki). */
  urlapHiba?: string | null | undefined;
  tipus?: 'text' | 'date' | undefined;
  /** Jobbra igazítás az összegeknek. */
  jobbra?: boolean | undefined;
  maxHossz?: number | undefined;
  nagybetus?: boolean | undefined;
  inputRef?: ((elem: HTMLInputElement | HTMLSelectElement | null) => void) | undefined;
};

export function Mezo({
  mezo,
  cimke,
  ertek,
  onChange,
  sav,
  hiba,
  urlapHiba,
  tipus = 'text',
  jobbra = false,
  maxHossz,
  nagybetus = false,
  inputRef,
}: MezoProps) {
  return (
    <div>
      <label className="flabel" htmlFor={mezo}>
        {cimke}
      </label>
      <input
        id={mezo}
        ref={inputRef}
        type={tipus}
        inputMode={jobbra ? 'decimal' : undefined}
        maxLength={maxHossz}
        className={`control ${savOsztaly(sav)} ${jobbra ? 'text-right' : ''} ${nagybetus ? 'uppercase' : ''}`}
        value={ertek}
        onChange={(e) => onChange(e.target.value)}
      />
      <Jelzes hiba={hiba} urlapHiba={urlapHiba} />
    </div>
  );
}

export function Valaszto({
  mezo,
  cimke,
  ertek,
  onChange,
  sav,
  hiba,
  urlapHiba,
  opciok,
  inputRef,
}: Omit<MezoProps, 'tipus' | 'jobbra' | 'maxHossz' | 'nagybetus'> & {
  opciok: readonly { ertek: string; cimke: string }[];
}) {
  return (
    <div>
      <label className="flabel" htmlFor={mezo}>
        {cimke}
      </label>
      <select
        id={mezo}
        ref={inputRef}
        className={`control ${savOsztaly(sav)}`}
        value={ertek}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— válassz —</option>
        {opciok.map((o) => (
          <option key={o.ertek} value={o.ertek}>
            {o.cimke}
          </option>
        ))}
      </select>
      <Jelzes hiba={hiba} urlapHiba={urlapHiba} />
    </div>
  );
}

function Jelzes({
  hiba,
  urlapHiba,
}: {
  hiba?: string | null | undefined;
  urlapHiba?: string | null | undefined;
}) {
  return (
    <>
      {/*
        A bukott ellenőrzés indoklása. A `text-red-700` nem véletlen árnyalat:
        pontosan a dizájnrendszer `--color-gyanus` értéke.
      */}
      {hiba != null && hiba !== '' && <p className="mt-1 text-xs text-red-700">{hiba}</p>}
      {urlapHiba != null && urlapHiba !== '' && <p className="fhiba">{urlapHiba}</p>}
    </>
  );
}

/**
 * A jelmagyarázat. Azért van a képernyőn, mert a szín önmagában nem mondja meg,
 * mit jelent — és mert a három állapot közti különbség (bukott ellenőrzés /
 * bizonytalan modell / nem nyilatkozott) érdemi, nem árnyalat.
 */
export function Jelmagyarazat(): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border-l-4 border-red-500 bg-red-50" />
        ellenőrzés bukott
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border-l-4 border-amber-400 bg-amber-50" />
        a modell bizonytalan
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-slate-400" />
        nem nyilatkozott róla
      </span>
    </div>
  );
}
