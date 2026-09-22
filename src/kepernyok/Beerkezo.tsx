import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { useAuth, useSzerkeszthet } from '../lib/auth.tsx';
import { duplikatumotElvet, feltolt } from '../lib/feltoltes.ts';
import { AppElrendezes } from '../komponensek/Elrendezes.tsx';
import { keret as keretetKer, type Keret } from '../lib/keret.ts';
import { keretMondat } from '@uzleti/keret.ts';
import { allapotCimke, tipusCimke, type DokumentumAllapot } from '@uzleti/enumok.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { datumIdo } from '@uzleti/ido.ts';
import { oldalak } from '@uzleti/export/oszlopok.ts';
import { kiolvasoForras } from '@uzleti/kiolvasoForras.ts';

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
  /** Csak a kötegből szétszedett bizonylaton van érték. */
  oldal_tol: number | null;
  oldal_ig: number | null;
  files: { original_filename: string | null; source: string } | null;
  /**
   * A bizonylat kiolvasás-sorai — ebből a **legutolsó** `model`-je mondja meg,
   * a saját értelmezőnk vagy a modell olvasta-e ki.
   *
   * ⚠️ Egynél több sor több okból lehet: újrapróbálás után, és a kötegszétszedő
   * futás is ide köt (`document_id` = a szülő bizonylat, `credits: 0`). A
   * legfrissebb a valódi kiolvasás — a szétszedés mindig megelőzi.
   */
  // Hiányozhat: a tartalék lekérdezés (lásd `lista()`) nem kéri le.
  document_extractions?: { model: string | null; created_at: string }[] | null;
};

/** A listához kért oszlopok — a kiolvasás-beágyazás nélkül. */
const OSZLOPOK =
  'id, status, doc_type, supplier_name, doc_number, gross_amount, currency, error, ' +
  'created_at, oldal_tol, oldal_ig, files(original_filename, source)';

const ALLAPOTOK = ['feltoltve', 'feldolgozas_alatt', 'ellenorzesre_var', 'hiba', 'duplikatum'];

/**
 * A Beérkező listája — **a kiolvasás-jelzés soha nem viheti el a listát.**
 *
 * A `document_extractions` beágyazása egy kényelmi jel forrása (ki olvasta ki
 * a bizonylatot); a lista maga viszont ennek a képernyőnek a lényege. Ha a
 * beágyazás bármiért elutasításra kerülne, a `data` `null` lenne, és a
 * felhasználó **üres Beérkezőt** látna — nem hibát, hanem azt, hogy „nincs
 * bizonylatod". Ez a lehető legrosszabb kimenetel, és pontosan az a hibaosztály,
 * ami miatt a duplikátumsor „eredetire ugró linkje" annak idején kimaradt: egy
 * második lekérdezés hibája nem viheti a teljes listát.
 *
 * ⚠️ A beágyazás feloldása **nem mérhető ebből a környezetből** (a proxy tiltja
 * a `*.supabase.co`-t). Amit mérni lehetett: a `document_extractions`-ből
 * pontosan **egy** idegen kulcs mutat a `documents`-re (a `company_id` a
 * `companies`-re, a `file_id` a `files`-ra megy), tehát a kapcsolat
 * egyértelmű — a PostgREST ebből oldja fel a beágyazást. A tartalék ág attól
 * még itt van: a mérés hiányát nem feltételezéssel pótoljuk.
 */
async function lista() {
  const bovitett = await supabase
    .from('documents')
    .select(`${OSZLOPOK}, document_extractions(model, created_at)`)
    .in('status', ALLAPOTOK)
    .order('created_at', { ascending: false });

  if (bovitett.error === null) {
    return bovitett;
  }

  console.error('kiolvasas-beagyazas', bovitett.error.message);

  return await supabase
    .from('documents')
    .select(OSZLOPOK)
    .in('status', ALLAPOTOK)
    .order('created_at', { ascending: false });
}

/**
 * Ki olvasta ki: a saját XML-értelmezőnk vagy a modell.
 *
 * ⚠️ **Mindkét ág ki van írva**, nem csak az egyik: egy jelzés, ami csak az
 * egyik esetben jelenik meg, a hiányával állít — és ebben a projektben pont az
 * ilyen néma állítás dőlt el rosszul a legtöbbször. Listában ez az a nézet,
 * amiből kiderül, hogy egy szállító e-számlái rendre a modellhez esnek: vagyis
 * strukturált adat van a kézben, és mégis olvasat lesz belőle.
 *
 * Kiolvasás-sor nélkül (feltöltve, feldolgozás alatt, duplikátum) nincs mit
 * mondani — a jelzés ilyenkor egyszerűen nincs ott.
 */
function ForrasJelzes({ sor }: { sor: Sor }) {
  const sorok = [...(sor.document_extractions ?? [])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  const jel = kiolvasoForras(sorok[0]?.model ?? null);

  if (jel.forras === 'ismeretlen') {
    return null;
  }

  return <> · {jel.rovid}</>;
}

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

/**
 * A sor frissítésének üteme.
 *
 * Egy valódi PDF feldolgozása mérve **~10 másodperc** (9,0 s a lánc, ebből
 * jórészt a modellhívás, plusz ~1 s a függvény saját köre). Eddig 3
 * másodpercenként kérdeztünk, és ezzel az utolsó, akár 3 másodperc **tiszta
 * várakozás** volt: a bizonylat rég elkészült, csak a böngésző nem tudott róla.
 * Ez az a másodperc, amit a felhasználó a legjobban érez, mert pont akkor nézi
 * a képernyőt.
 *
 * ⚠️ A visszalassulás viszont nem óvatoskodás. A `dolgozikMeg` akkor is igaz
 * marad, ha egy bizonylat **beragad** — elfogyott keretnél a sor `feltoltve`
 * állapotban marad, és a cron sem viszi tovább. Egy nyitva felejtett fül
 * ilyenkor másodpercenként kérdezné az adatbázist, zárásig. A sűrű ütem ezért
 * csak addig tart, ameddig egy feldolgozás reálisan tart.
 */
const SURU_POLL_MS = 1000;
const RITKA_POLL_MS = 5000;
const SURU_ABLAK_MS = 30_000;

export function Beerkezo() {
  const { ceg } = useAuth();
  const szerkeszthet = useSzerkeszthet();

  const [sorok, setSorok] = useState<Sor[]>([]);
  const [betolt, setBetolt] = useState(true);
  const [hibak, setHibak] = useState<string[]>([]);
  const [feltoltFolyik, setFeltoltFolyik] = useState(false);
  const [huzas, setHuzas] = useState(false);
  const [keret, setKeret] = useState<Keret | null>(null);
  // Melyik duplikátumsor elvetése fut éppen — a gomb addig nem nyomható újra.
  const [elvetes, setElvetes] = useState<string | null>(null);
  const bemenetRef = useRef<HTMLInputElement>(null);

  const betoltes = useCallback(async () => {
    const { data } = await lista();

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

    const kezdet = Date.now();
    let el = true;
    let idozito = 0;

    function utemez() {
      const suru = Date.now() - kezdet < SURU_ABLAK_MS;

      idozito = window.setTimeout(() => {
        // A `catch` nem kozmetika: egy elutasított betöltés (pillanatnyi
        // hálózati hiba) enélkül **némán megállítaná** a frissítést, és a sor
        // örökre „feldolgozás alatt" maradna a képernyőn. Egy frissítő
        // ciklusnak túl kell élnie egy rossz körutat.
        void betoltes()
          .catch(() => undefined)
          .then(() => {
            if (el) utemez();
          });
      }, suru ? SURU_POLL_MS : RITKA_POLL_MS);
    }

    utemez();

    return () => {
      el = false;
      window.clearTimeout(idozito);
    };
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

  async function elvet(id: string) {
    setElvetes(id);

    const eredmeny = await duplikatumotElvet(id);

    if (!eredmeny.ok) {
      setHibak([eredmeny.hiba ?? 'A sort nem sikerült elvetni.']);
    }

    setElvetes(null);
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
        <div className="empty">
            Itt jelennek meg a bizonylatok — akár feltöltöd, akár a cég beküldő címére küldöd
            őket.
          </div>
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
                        A `source` a cég beküldő címén át érkezett bizonylatokat
                        jelöli (`20260915000200` migráció). Ez a sor a régi
                        rendszerből maradt itt, akkor még kimondottan a
                        *megszűnt* beküldésre utalva — mostantól élő út, és a
                        megkülönböztetés számít: egy e-mailben érkezett
                        bizonylatot nem egy ember választott ki.
                      */}
                      {sor.files?.source === 'email' ? 'E-mailben érkezett' : 'Feltöltve'} ·{' '}
                      {datumIdo(sor.created_at)}
                      {/*
                        Egy szétszedett kötegnél ez az egyetlen jel, ami
                        megkülönbözteti a sorokat egymástól: ugyanaz a fájlnév
                        áll mindegyiken, amíg a bizonylatszám ki nem olvasódik.
                      */}
                      {oldalak(sor.oldal_tol, sor.oldal_ig) !== null && (
                        <> · {oldalak(sor.oldal_tol, sor.oldal_ig)}. oldal</>
                      )}
                      <ForrasJelzes sor={sor} />
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
                    {/*
                      A duplikátum eddig zsákutca volt: ott állt a listában, és
                      semmit nem lehetett vele csinálni. Megtekintőnek most sem
                      kínáljuk fel — az RLS `szerkeszthet` politikája úgyis
                      visszautasítaná, felajánlani pedig félrevezető.
                    */}
                    {sor.status === 'duplikatum' && szerkeszthet && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={elvetes !== null}
                        onClick={() => void elvet(sor.id)}
                      >
                        {elvetes === sor.id ? 'Elvetés…' : 'Elvetem'}
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
