import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AFA_FAJTAK,
  FIZETESI_MODOK,
  FIZMOD_CIMKEK,
  PROGRAM_NEVEK,
  type AfaFajta,
  type FizetesiMod,
  type KontirBeallitas,
  type Program,
} from '@uzleti/export/konyvelo/beallitas.ts';
import type { Elokeszites } from '@uzleti/export/konyvelo/elokeszit.ts';
import type { BeallitasForras } from '../lib/konyveloBeallitas.ts';

/**
 * Az Export képernyő könyvelőprogramos részei: a kontír-beállítás és az
 * előellenőrzés.
 *
 * A beállítás itt él, nem a Beállítások képernyőn: a könyvelő **akkor**
 * gondol a főkönyvi számokra, amikor az első fájlt készíti, és akkor látja,
 * melyik ügyfélre szól.
 */

type Fokonyv = 'koltseg' | 'szallito' | 'elozetesAfa' | 'arbevetel' | 'vevo' | 'fizetendoAfa';

const BEJOVO_MEZOK: [Fokonyv, string][] = [
  ['koltseg', 'Költség (nettó)'],
  ['elozetesAfa', 'Előzetes ÁFA'],
  ['szallito', 'Szállítók'],
];

const KIMENO_MEZOK: [Fokonyv, string][] = [
  ['arbevetel', 'Árbevétel (nettó)'],
  ['fizetendoAfa', 'Fizetendő ÁFA'],
  ['vevo', 'Vevők'],
];

const FORRAS_SZOVEG: Record<BeallitasForras, string> = {
  ugyfel: 'Ennek az ügyfélnek saját beállítása van.',
  ceg: 'A cég alapbeállítása érvényes – ennek az ügyfélnek nincs sajátja.',
  nincs: 'Még nincs mentett beállítás. Az első fájl előtt nézd át és mentsd el.',
};

export function KontirPanel(props: {
  program: Program;
  mentett: KontirBeallitas;
  forras: BeallitasForras;
  /** A kiválasztott ügyfél címkéje, vagy `null`, ha nincs kiválasztva. */
  ugyfelCimke: string | null;
  szerkeszthet: boolean;
  hianyok: readonly string[];
  onMent: (b: KontirBeallitas, hatokor: 'ugyfel' | 'ceg') => Promise<string | null>;
  onPiszkos: (piszkos: boolean) => void;
}) {
  const { program, mentett, forras, ugyfelCimke, szerkeszthet, hianyok, onMent, onPiszkos } = props;
  const [vazlat, setVazlat] = useState<KontirBeallitas>(mentett);
  const [ment, setMent] = useState(false);
  const [uzenet, setUzenet] = useState<{ ok: boolean; szoveg: string } | null>(null);

  // Új ügyfél vagy friss mentés: a vázlat a tárolt állapotra áll vissza.
  useEffect(() => {
    setVazlat(mentett);
  }, [mentett]);

  const piszkos = JSON.stringify(vazlat) !== JSON.stringify(mentett);
  useEffect(() => onPiszkos(piszkos), [piszkos, onPiszkos]);

  function allit<K extends keyof KontirBeallitas>(mezo: K, ertek: KontirBeallitas[K]) {
    setUzenet(null);
    setVazlat((elozo) => ({ ...elozo, [mezo]: ertek }));
  }

  async function mentes(hatokor: 'ugyfel' | 'ceg') {
    setMent(true);
    const hiba = await onMent(vazlat, hatokor);
    setMent(false);
    setUzenet(hiba === null ? { ok: true, szoveg: 'Elmentve.' } : { ok: false, szoveg: hiba });
  }

  const fokonyvMezo = ([mezo, cimke]: [Fokonyv, string]) => (
    <div key={mezo}>
      <label className="flabel" htmlFor={`kontir-${mezo}`}>
        {cimke}
      </label>
      <input
        id={`kontir-${mezo}`}
        className="control"
        inputMode="numeric"
        maxLength={8}
        value={vazlat[mezo]}
        disabled={!szerkeszthet}
        onChange={(e) => allit(mezo, e.target.value.replace(/\D/g, ''))}
      />
    </div>
  );

  return (
    <details
      className="rounded-lg border border-slate-200 px-4 py-3"
      open={forras === 'nincs' || hianyok.length > 0 || piszkos}
    >
      <summary className="cursor-pointer text-sm font-medium text-slate-800">
        Főkönyvi számok (kontír)
        {ugyfelCimke !== null && <span className="font-normal text-slate-500"> – {ugyfelCimke}</span>}
      </summary>

      <p className="mt-2 text-xs text-slate-500">
        {FORRAS_SZOVEG[forras]} A számokat a te számlatükröd szerint add meg – a SzámlaFolyó
        nem kontíroz helyetted, a fájl minden tételt ezekre a számlákra visz, a
        programban átkontírozhatod.
      </p>

      <div className="mt-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Bejövő számlák</div>
      <div className="mt-1 grid gap-3 sm:grid-cols-3">{BEJOVO_MEZOK.map(fokonyvMezo)}</div>

      <div className="mt-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Kimenő számlák</div>
      <div className="mt-1 grid gap-3 sm:grid-cols-3">{KIMENO_MEZOK.map(fokonyvMezo)}</div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="flabel" htmlFor="kontir-fizmod">
            Fizetési mód, ha a bizonylatról nem derül ki
          </label>
          <select
            id="kontir-fizmod"
            className="control"
            value={vazlat.alapFizmod}
            disabled={!szerkeszthet}
            onChange={(e) => allit('alapFizmod', e.target.value as FizetesiMod)}
          >
            {FIZETESI_MODOK.map((m) => (
              <option key={m} value={m}>
                {FIZMOD_CIMKEK[m]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-start gap-2 pt-6 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={vazlat.penzforgalmi}
            disabled={!szerkeszthet}
            onChange={(e) => allit('penzforgalmi', e.target.checked)}
          />
          <span>
            Pénzforgalmi ÁFA-elszámolás
            <span className="block text-xs text-slate-500">
              Ilyenkor az ÁFA esedékessége üresen megy, a program a kiegyenlítéskor számolja el.
            </span>
          </span>
        </label>
      </div>

      {program === 'novitax' && (
        <>
          <div className="mt-3 text-xs font-medium tracking-wide text-slate-500 uppercase">
            {PROGRAM_NEVEK.novitax}
          </div>
          <div className="mt-1 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="flabel" htmlFor="kontir-naplo-be">
                Bejövő napló kódja
              </label>
              <input
                id="kontir-naplo-be"
                className="control"
                maxLength={2}
                value={vazlat.novitax.naplokodBe}
                disabled={!szerkeszthet}
                onChange={(e) => allit('novitax', { ...vazlat.novitax, naplokodBe: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="flabel" htmlFor="kontir-naplo-ki">
                Kimenő napló kódja
              </label>
              <input
                id="kontir-naplo-ki"
                className="control"
                maxLength={2}
                value={vazlat.novitax.naplokodKi}
                disabled={!szerkeszthet}
                onChange={(e) => allit('novitax', { ...vazlat.novitax, naplokodKi: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="flabel" htmlFor="kontir-mentes">
                Mentes tétel
              </label>
              <select
                id="kontir-mentes"
                className="control"
                value={vazlat.novitax.mentesTipus}
                disabled={!szerkeszthet}
                onChange={(e) =>
                  allit('novitax', { ...vazlat.novitax, mentesTipus: e.target.value as '' | 'AM' | 'TM' })
                }
              >
                <option value="">Nincs megadva</option>
                <option value="AM">Alanyi mentes (AM)</option>
                <option value="TM">Tárgyi mentes (TM)</option>
              </select>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            A naplót a feladás előtt az NTAX-ban fel kell venni, a jellemző és az ÁFA-számlaszámmal
            együtt – az ÁFA főkönyvi számát a Novitax onnan veszi.
          </p>
        </>
      )}

      {program === 'kulcs' && (
        <>
          <div className="mt-3 text-xs font-medium tracking-wide text-slate-500 uppercase">
            {PROGRAM_NEVEK.kulcs} – ÁFA-kulcsok
          </div>
          <p className="mt-1 text-xs text-slate-500">
            A kódot és a megnevezést úgy írd be, ahogy a te Kulcs-Könyvelésedben az ÁFA-kulcsoknál
            szerepel. Csak a ténylegesen használt kulcsokat kéri a fájl.
          </p>
          <div className="mt-2 space-y-2">
            {AFA_FAJTAK.map((fajta) => (
              <KulcsAfakodSor
                key={fajta}
                fajta={fajta}
                ertek={vazlat.kulcs.afakodok[fajta]}
                szerkeszthet={szerkeszthet}
                onValtozik={(uj) =>
                  allit('kulcs', { afakodok: { ...vazlat.kulcs.afakodok, [fajta]: uj } })
                }
              />
            ))}
          </div>
        </>
      )}

      {szerkeszthet ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {ugyfelCimke !== null ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={ment}
                onClick={() => void mentes('ugyfel')}
              >
                Mentés ehhez az ügyfélhez
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={ment}
                onClick={() => void mentes('ceg')}
              >
                Mentés alapként (minden ügyfélre)
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={ment}
              onClick={() => void mentes('ceg')}
            >
              Mentés
            </button>
          )}
          {piszkos && <span className="text-xs text-amber-700">Mentetlen változás.</span>}
          {uzenet !== null && (
            <span className={`text-xs ${uzenet.ok ? 'text-emerald-700' : 'text-red-700'}`}>
              {uzenet.szoveg}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Megtekintő szerepben a beállítást nem módosíthatod.</p>
      )}
    </details>
  );
}

function KulcsAfakodSor(props: {
  fajta: AfaFajta;
  ertek: { kod: string; nev: string };
  szerkeszthet: boolean;
  onValtozik: (uj: { kod: string; nev: string }) => void;
}) {
  const { fajta, ertek, szerkeszthet, onValtozik } = props;
  const cimke = fajta === 'mentes' ? 'Mentes' : `${fajta}%`;
  return (
    <div className="grid grid-cols-[4rem_5rem_1fr] items-center gap-2">
      <span className="text-sm text-slate-700">{cimke}</span>
      <input
        aria-label={`${cimke} – kód`}
        className="control"
        maxLength={3}
        placeholder="Kód"
        value={ertek.kod}
        disabled={!szerkeszthet}
        onChange={(e) => onValtozik({ ...ertek, kod: e.target.value })}
      />
      <input
        aria-label={`${cimke} – megnevezés`}
        className="control"
        maxLength={20}
        placeholder="Megnevezés"
        value={ertek.nev}
        disabled={!szerkeszthet}
        onChange={(e) => onValtozik({ ...ertek, nev: e.target.value })}
      />
    </div>
  );
}

/** „14 mehet, 2 nem" – és ami nem megy, annál az ok, linkkel. */
export function Elokeszitesi(props: { e: Elokeszites }) {
  const { mehet, elakadt, figyelmeztetesek, beallitasHiany } = props.e;

  return (
    <div className="space-y-2">
      {beallitasHiany.length > 0 && (
        <div className="alert alert-figyelem">
          <strong>A fájl a kontír nélkül nem készülhet el:</strong>
          <ul className="mt-1 list-disc pl-5">
            {beallitasHiany.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {elakadt.length > 0 && (
        <details className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <summary className="cursor-pointer text-amber-900">
            {elakadt.length} tétel nem megy a fájlba – a listán marad. Miért?
          </summary>
          <ul className="mt-2 space-y-2">
            {elakadt.map((x) => (
              <li key={x.id} className="text-xs text-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{x.cimke}</span>
                  <Link to={`/ellenorzes/${x.id}`} className="text-blue-700 underline">
                    Megnyitás
                  </Link>
                </div>
                <ul className="list-disc pl-5">
                  {x.okok.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Ezek táblázatba (Excel, CSV) továbbra is exportálhatók.
          </p>
        </details>
      )}

      {figyelmeztetesek.length > 0 && mehet.length > 0 && (
        <details className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
          <summary className="cursor-pointer text-slate-700">
            {figyelmeztetesek.length} megjegyzés a fájlba kerülő tételekhez
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
            {figyelmeztetesek.map((f) => (
              <li key={`${f.id}-${f.szoveg}`}>
                <span className="font-medium">{f.cimke}:</span> {f.szoveg}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
