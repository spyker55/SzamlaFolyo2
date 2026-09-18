import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppElrendezes } from '../komponensek/Elrendezes.tsx';
import { useSzerkeszthet } from '../lib/auth.tsx';
import {
  exportok,
  exportTetelei,
  exportUrl,
  visszahiv,
  type ExportSor,
  type Tetel,
} from '../lib/export.ts';
import { tipusCimke } from '@uzleti/enumok.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { datumIdo, datum } from '@uzleti/ido.ts';
import { szamlafolyo } from '@config/szamlafolyo.ts';

/**
 * Az archívum: ami már kiment.
 *
 * Két dolgot tud, és mindkettő visszafordítható:
 *
 * - az export fájl **újraletölthető** (aláírt URL, a bucket privát),
 * - egy tétel **visszahívható** a Tételek közé, ha elrontottuk.
 *
 * A végleges törlés (tétel vagy egész export) szándékosan **nincs itt**: az
 * visszafordíthatatlan, és a többi ilyen művelettel egy helyen, egyszerre
 * átgondolva a helye.
 *
 * # A fájl 30 nap után elmegy — a sor nem
 *
 * Az export fájl ugyanazokat az adatokat viszi, amikért az eredetire hét napos
 * plafont tettünk, ezért az is lejár (`20260918000100`). A **sor megmarad**:
 * továbbra is látszik, mi, mikor és hány tétellel ment ki, és a tételek
 * megnyithatók — csak a letöltés tűnik el.
 *
 * ⚠️ Ez a képernyő ezt **ki is mondja**, mielőtt a felhasználó rákattint. Egy
 * ott hagyott „Letöltés" gomb, ami hibaüzenetbe fut, pontosan az a
 * *majdnem-működés*, amit ebben a projektben nem hagyunk. A `letoltes()`
 * hibaága megmarad, de onnantól az a valódi versenyhelyzet ellen véd (a lap
 * betöltése után, a kattintás előtt lejárt fájl), nem a mindennapos eset.
 */
/**
 * Lejárt-e az export fájlja.
 *
 * **Két feltétel, vagy kapcsolattal**, és ez nem túlbiztosítás: a selejtezés
 * előbb jelöl (`file_deleted_at`), és csak utána üríti a `file_path`-t. A
 * kettő között a sornak még van útvonala, de a bájtjai már mennek — egy csak
 * `file_path`-ra épülő vizsgálat ilyenkor gombot mutatna egy halott fájlhoz.
 */
function lejart(sor: ExportSor): boolean {
  return sor.file_path === null || sor.file_deleted_at !== null;
}

export function Archivum() {
  const szerkeszthet = useSzerkeszthet();
  const [sorok, setSorok] = useState<ExportSor[]>([]);
  const [betolt, setBetolt] = useState(true);
  const [nyitott, setNyitott] = useState<string | null>(null);
  const [tetelek, setTetelek] = useState<Tetel[]>([]);
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);

  const betoltes = useCallback(async () => {
    setSorok(await exportok());
    setBetolt(false);
  }, []);

  useEffect(() => {
    void betoltes();
  }, [betoltes]);

  async function nyit(id: string) {
    if (nyitott === id) {
      setNyitott(null);
      setTetelek([]);
      return;
    }

    setNyitott(id);
    setTetelek(await exportTetelei(id));
  }

  async function vissza(tetelId: string) {
    setHiba(null);
    setUzenet(null);

    const eredmeny = await visszahiv(tetelId);

    if (!eredmeny.ok) {
      setHiba(eredmeny.hiba ?? 'A visszahívás nem sikerült.');
      return;
    }

    setUzenet('A tétel visszakerült a Tételek közé, és újra exportálható.');
    setTetelek(await exportTetelei(nyitott ?? ''));
    await betoltes();
  }

  async function letoltes(sor: ExportSor) {
    setHiba(null);

    const url = await exportUrl(sor.file_path);

    if (url === null) {
      setHiba('Ez az export fájl már nem érhető el.');
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  return (
    <AppElrendezes>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Archívum</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ami már kiment. Az export fájl {szamlafolyo.megorzes.exportNap} napig újra letölthető,
          és egy tétel vissza is hívható a Tételek közé.
        </p>
      </div>

      {uzenet !== null && <div className="alert alert-siker mb-4">{uzenet}</div>}
      {hiba !== null && <div className="alert alert-hiba mb-4">{hiba}</div>}

      {betolt ? (
        <div className="empty">Egy pillanat…</div>
      ) : sorok.length === 0 ? (
        <div className="empty">
          Még nincs export. Amit a Tételek közül kiviszel, az ide kerül.
        </div>
      ) : (
        <div className="space-y-3">
          {sorok.map((sor) => (
            <div key={sor.id} className="card card-pad">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-medium text-slate-900">{sor.file_name}</span>
                <span className="badge badge-semleges">{sor.format.toUpperCase()}</span>
                <span className="text-xs text-slate-500">{datumIdo(sor.created_at)}</span>
                <span className="text-xs text-slate-400">{meret(sor.file_bytes)}</span>

                <span
                  className="ml-auto text-xs text-slate-500"
                  title={
                    sor.jelenlegi === sor.item_count
                      ? undefined
                      : `Az exportba ${sor.item_count} tétel került; azóta ${sor.item_count - sor.jelenlegi} visszakerült a Tételek közé.`
                  }
                >
                  {/*
                    Az `item_count` azt rögzíti, mi került bele — ez utólag is
                    igaz marad. A visszahívott tétel viszont már nincs benne,
                    ezért a jelenlegi darabszám külön áll.
                  */}
                  {sor.jelenlegi === sor.item_count
                    ? `${sor.item_count} tétel`
                    : `${sor.jelenlegi} / ${sor.item_count} tétel`}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {lejart(sor) ? (
                  <span className="text-xs text-slate-500">
                    A fájl a {szamlafolyo.megorzes.exportNap} napos megőrzési idő lejártával
                    törlődött{sor.file_deleted_at === null ? '' : ` (${datum(sor.file_deleted_at)})`}.
                    A tételek megvannak — a Tételek közül újra exportálhatók.
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void letoltes(sor)}
                  >
                    Letöltés
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void nyit(sor.id)}
                >
                  {nyitott === sor.id ? 'Tételek elrejtése' : 'Tételek'}
                </button>
              </div>

              {nyitott === sor.id && (
                <div className="mt-3 overflow-x-auto border-t border-slate-100 pt-3">
                  {tetelek.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Ebben az exportban már nincs tétel — mindet visszahívták.
                    </p>
                  ) : (
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th className="th">Bizonylat</th>
                          <th className="th">Típus</th>
                          <th className="th">Szállító</th>
                          <th className="th">Kelt</th>
                          <th className="th">Összeg</th>
                          <th className="th" />
                        </tr>
                      </thead>
                      <tbody>
                        {tetelek.map((tetel) => (
                          <tr key={tetel.id} className="trow">
                            <td className="td font-medium text-slate-900">
                              {tetel.doc_number ?? '—'}
                            </td>
                            <td className="td">{tipusCimke(tetel.doc_type)}</td>
                            <td className="td">{tetel.supplier_name ?? '—'}</td>
                            <td className="td whitespace-nowrap">{datum(tetel.issue_date)}</td>
                            <td className="td whitespace-nowrap">
                              {formaz(tetel.gross_amount as string | null, tetel.currency)}
                            </td>
                            <td className="td text-right whitespace-nowrap">
                              <Link
                                to={`/ellenorzes/${tetel.id}`}
                                className="btn btn-ghost btn-sm"
                              >
                                Megnézem
                              </Link>
                              {szerkeszthet && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm ml-1"
                                  onClick={() => void vissza(tetel.id)}
                                >
                                  Visszahívom
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppElrendezes>
  );
}

/** Fájlméret emberi alakban. Egy export néhány kilobájt — ha nem az, az hír. */
function meret(bajt: number): string {
  if (bajt < 1024) return `${bajt} B`;
  if (bajt < 1024 * 1024) return `${Math.round(bajt / 1024)} kB`;
  return `${(bajt / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
