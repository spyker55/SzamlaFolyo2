import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppElrendezes } from '../komponensek/Elrendezes.tsx';
import { supabase } from '../lib/supabase.ts';
import { visszakuld } from '../lib/ellenorzes.ts';
import { useSzerkeszthet } from '../lib/auth.tsx';
import { tipusCimke } from '@uzleti/enumok.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { datum } from '@uzleti/ido.ts';

type Tetel = {
  id: string;
  doc_type: string | null;
  supplier_name: string | null;
  doc_number: string | null;
  issue_date: string | null;
  gross_amount: string | null;
  currency: string | null;
  auto_jovahagyva: boolean;
  auto_indok: string | null;
};

/**
 * A jóváhagyott, exportra váró bizonylatok.
 *
 * Két dolog miatt van itt már most, a teljes lista előtt:
 *
 * 1. **Az automatikusan jóváhagyott bizonylat itt látszik**, jelvénnyel és
 *    indokkal. Enélkül a mintavétel mérhetetlen lenne, és a felhasználó nem
 *    tudná, mit engedett át a gép a nevében.
 * 2. **Innen még vissza lehet küldeni javításra** — az export után már nem.
 */
export function Tetelek() {
  const szerkeszthet = useSzerkeszthet();
  const [tetelek, setTetelek] = useState<Tetel[]>([]);
  const [betolt, setBetolt] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);

  const betoltes = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select(
        'id, doc_type, supplier_name, doc_number, issue_date, gross_amount, currency, auto_jovahagyva, auto_indok',
      )
      .eq('status', 'jovahagyva')
      .is('export_id', null)
      .order('issue_date', { ascending: false, nullsFirst: false });

    setTetelek((data ?? []) as Tetel[]);
    setBetolt(false);
  }, []);

  useEffect(() => {
    void betoltes();
  }, [betoltes]);

  async function vissza(id: string) {
    setHiba(null);
    const eredmeny = await visszakuld(id);

    if (!eredmeny.ok) {
      setHiba(eredmeny.hiba ?? 'A visszaküldés nem sikerült.');
      return;
    }

    await betoltes();
  }

  const automatikus = tetelek.filter((t) => t.auto_jovahagyva).length;

  return (
    <AppElrendezes>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Tételek</h1>
        <p className="mt-1 text-sm text-slate-500">
          Jóváhagyott bizonylatok, exportra várva. Innen még vissza lehet küldeni javításra —
          az export után már nem.
        </p>
        {tetelek.length > 0 && szerkeszthet && (
          <Link to="/export" className="mt-2 inline-block text-sm text-blue-700 hover:underline">
            Export készítése →
          </Link>
        )}
      </div>

      {automatikus > 0 && (
        <p className="mb-4 text-xs text-slate-500">
          Ebből <strong>{automatikus}</strong> ment át automatikusan, ember nélkül. Érdemes
          néha belenézni: ez mutatja meg, jól vannak-e beállítva a küszöbök.
        </p>
      )}

      {hiba !== null && <div className="alert alert-hiba mb-4">{hiba}</div>}

      {betolt ? (
        <div className="empty">Egy pillanat…</div>
      ) : tetelek.length === 0 ? (
        <div className="empty">
          Még nincs jóváhagyott tétel. Ami a Beérkezőben ellenőrzésre vár, az ide kerül.
        </div>
      ) : (
        <div className="card overflow-x-auto">
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
                  <td className="td">
                    <div className="font-medium text-slate-900">{tetel.doc_number ?? '—'}</div>
                    {tetel.auto_jovahagyva && (
                      <div className="mt-1">
                        <span className="badge badge-semleges">automatikusan jóváhagyva</span>
                        {/*
                          Az indok a jelvény mellett. Soha ne írjuk ki, hogy
                          „ellenőrizve", ha senki nem nézte meg — a felület
                          mondja meg őszintén, mi történt.
                        */}
                        {tetel.auto_indok !== null && (
                          <div className="mt-0.5 text-xs text-slate-400">{tetel.auto_indok}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="td">{tipusCimke(tetel.doc_type)}</td>
                  <td className="td">{tetel.supplier_name ?? '—'}</td>
                  <td className="td whitespace-nowrap">{datum(tetel.issue_date)}</td>
                  <td className="td whitespace-nowrap">
                    {formaz(tetel.gross_amount, tetel.currency)}
                  </td>
                  <td className="td text-right whitespace-nowrap">
                    <Link to={`/ellenorzes/${tetel.id}`} className="btn btn-ghost btn-sm">
                      Megnézem
                    </Link>
                    {szerkeszthet && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm ml-1"
                        onClick={() => void vissza(tetel.id)}
                      >
                        Javításra
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppElrendezes>
  );
}
