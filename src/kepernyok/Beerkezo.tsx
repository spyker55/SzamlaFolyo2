import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { useAuth, useSzerkeszthet } from '../lib/auth.tsx';
import { feltolt } from '../lib/feltoltes.ts';
import { AppElrendezes } from '../komponensek/Elrendezes.tsx';
import { keret as keretetKer, type Keret } from '../lib/keret.ts';
import { keretMondat } from '@uzleti/keret.ts';
import { allapotCimke, tipusCimke, type DokumentumAllapot } from '@uzleti/enumok.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { datumIdo } from '@uzleti/ido.ts';

type Sor = {
  id: string;
  status: DokumentumAllapot;
  doc_type: string | null;
  supplier_name: string | null;
  doc_number: string | null;
  gross_amount: string | null;
  currency: string | null;
  error: string | null;
  created_at: string;
  files: { original_filename: string | null; source: string } | null;
};

/** Az állapotjelvény stílusa. A kiemelés a bajt jelöli, nem a rendben lévőt. */
function jelvenyStilus(allapot: DokumentumAllapot): string {
  switch (allapot) {
    case 'ellenorzesre_var':
      return 'badge-varakozo';
    case 'hiba':
      return 'badge-hiba';
    case 'jovahagyva':
    case 'exportalva':
      return 'badge-kesz';
    default:
      return 'badge-semleges';
  }
}

export function Beerkezo() {
  const { ceg } = useAuth();
  const szerkeszthet = useSzerkeszthet();

  const [sorok, setSorok] = useState<Sor[]>([]);
  const [betolt, setBetolt] = useState(true);
  const [hibak, setHibak] = useState<string[]>([]);
  const [feltoltFolyik, setFeltoltFolyik] = useState(false);
  const [huzas, setHuzas] = useState(false);
  const [keret, setKeret] = useState<Keret | null>(null);
  const bemenetRef = useRef<HTMLInputElement>(null);

  const betoltes = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select(
        'id, status, doc_type, supplier_name, doc_number, gross_amount, currency, error, created_at, files(original_filename, source)',
      )
      .in('status', ['feltoltve', 'feldolgozas_alatt', 'ellenorzesre_var', 'hiba', 'duplikatum'])
      .order('created_at', { ascending: false });

    // A beágyazott `files` sok-az-egyhez kapcsolat: a PostgREST objektumot ad
    // vissza, a supabase-js generált típusok nélkül tömböt tippel. Mindkettőt
    // elviseljük.
    const normalizalt = (data ?? []).map((sor) => {
      const nyers = sor as unknown as Omit<Sor, 'files'> & { files: Sor['files'] | Sor['files'][] };
      return {
        ...nyers,
        files: Array.isArray(nyers.files) ? (nyers.files[0] ?? null) : nyers.files,
      } as Sor;
    });

    setSorok(normalizalt);
    setBetolt(false);
  }, []);

  useEffect(() => {
    void betoltes();
  }, [betoltes]);

  // A keret a sorral együtt frissül: ami most futott le, az már fogyasztott.
  useEffect(() => {
    void keretetKer().then(setKeret);
  }, [sorok.length]);

  // Amíg van feldolgozandó, frissítünk. A sort már nem a böngésző hajtja — azt
  // az Edge Function és a pg_cron intézi —, de a felhasználónak látnia kell,
  // ahogy halad.
  const dolgozikMeg = sorok.some((s) => s.status === 'feltoltve' || s.status === 'feldolgozas_alatt');

  useEffect(() => {
    if (!dolgozikMeg) return;

    const idozito = setInterval(() => void betoltes(), 3000);
    return () => clearInterval(idozito);
  }, [dolgozikMeg, betoltes]);

  async function fajlokat(lista: FileList | null) {
    if (lista === null || lista.length === 0 || ceg === null) return;

    setHibak([]);
    setFeltoltFolyik(true);

    const ujHibak: string[] = [];

    for (const fajl of Array.from(lista)) {
      const eredmeny = await feltolt(fajl, ceg.id);

      if (eredmeny.allapot === 'hiba') {
        ujHibak.push(eredmeny.hiba);
      }
    }

    setHibak(ujHibak);
    setFeltoltFolyik(false);
    if (bemenetRef.current !== null) bemenetRef.current.value = '';
    await betoltes();
  }

  const varakozo = sorok.filter((s) => s.status === 'ellenorzesre_var').length;

  return (
    <AppElrendezes varakozo={varakozo}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Beérkező</h1>
        <p className="mt-1 text-sm text-slate-500">
          Húzd ide a bizonylatokat, vagy válaszd ki őket a gombbal.
        </p>
      </div>

      {/*
        A keret állapota **a feltöltő fölött** áll, nem a Beállítások mélyén:
        itt dől el, hogy érdemes-e nekikezdeni. Amit itt írunk ki, az
        udvariasság — a valódi fék a `kiolvas`-ban van, mert a költség ott
        keletkezik, és ezt a képernyőt meg lehet kerülni egy API-hívással.
      */}
      {keret !== null && !keret.mehet && (
        <div className="alert alert-figyelem mb-4">
          <strong>{keretMondat(keret)}</strong>{' '}
          <Link to="/beallitasok" className="font-medium underline">
            Beállítások
          </Link>
        </div>
      )}

      {keret !== null && keret.mehet && keret.maradek <= 10 && (
        <div className="alert alert-figyelem mb-4">{keretMondat(keret)}</div>
      )}

      {/*
        Megtekintőnek nincs itt dolga: a szerver úgyis visszautasítaná (az RLS
        `szerkeszthet` politikája), felkínálni pedig félrevezető.
      */}
      {szerkeszthet && (
        <label
          htmlFor="fajlok"
          onDragOver={(e) => {
            e.preventDefault();
            setHuzas(true);
          }}
          onDragLeave={() => setHuzas(false)}
          onDrop={(e) => {
            e.preventDefault();
            setHuzas(false);
            void fajlokat(e.dataTransfer.files);
          }}
          className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
            huzas ? 'border-blue-400 bg-blue-50/40' : 'border-slate-300 bg-white/70 hover:border-blue-400 hover:bg-blue-50/40'
          }`}
        >
          <input
            id="fajlok"
            ref={bemenetRef}
            type="file"
            multiple
            className="sr-only"
            accept="application/pdf,image/jpeg,image/png,image/webp,text/xml,application/xml"
            onChange={(e) => void fajlokat(e.target.files)}
          />
          <span className="text-sm font-medium text-slate-700">Bizonylatok feltöltése</span>
          <span className="mt-1 text-xs text-slate-500">
            PDF, JPG, PNG, WEBP vagy e-számla XML — legfeljebb 20 MB darabonként
          </span>
          {feltoltFolyik && <span className="mt-2 text-xs text-blue-700">Feltöltés folyamatban…</span>}
        </label>
      )}

      {hibak.length > 0 && (
        <div className="alert alert-hiba mb-4">
          <ul className="list-inside list-disc space-y-1">
            {hibak.map((hiba) => (
              <li key={hiba}>{hiba}</li>
            ))}
          </ul>
        </div>
      )}

      {betolt ? (
        <div className="empty">Egy pillanat…</div>
      ) : sorok.length === 0 ? (
        <div className="empty">Itt jelennek meg a feltöltött bizonylatok.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="th">Bizonylat</th>
                <th className="th">Típus</th>
                <th className="th">Partner</th>
                <th className="th">Összeg</th>
                <th className="th">Állapot</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {sorok.map((sor) => (
                <tr key={sor.id} className="trow">
                  <td className="td">
                    <div className="font-medium text-slate-900">
                      {sor.doc_number ?? sor.files?.original_filename ?? 'Bizonylat'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {/*
                        A `source` oszlop megmarad: a megszüntetett e-mailes
                        beküldés előtt érkezett sorok tényleg e-mailben jöttek,
                        és egy megtörtént dolgot nem írunk át utólag.
                      */}
                      {sor.files?.source === 'email' ? 'E-mailben érkezett' : 'Feltöltve'} ·{' '}
                      {datumIdo(sor.created_at)}
                    </div>
                  </td>
                  <td className="td">{tipusCimke(sor.doc_type)}</td>
                  <td className="td">{sor.supplier_name ?? '—'}</td>
                  <td className="td whitespace-nowrap">{formaz(sor.gross_amount, sor.currency)}</td>
                  <td className="td">
                    <span className={`badge ${jelvenyStilus(sor.status)}`}>
                      {allapotCimke(sor.status)}
                    </span>
                    {sor.error !== null && (
                      <div className="mt-1 max-w-xs text-xs text-red-700">{sor.error}</div>
                    )}
                    {sor.status === 'duplikatum' && (
                      <div className="mt-1 text-xs text-slate-400">Ez a fájl már bent van.</div>
                    )}
                  </td>
                  <td className="td text-right whitespace-nowrap">
                    {sor.status === 'ellenorzesre_var' && (
                      <Link to={`/ellenorzes/${sor.id}`} className="btn btn-primary btn-sm">
                        Ellenőrzés
                      </Link>
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
