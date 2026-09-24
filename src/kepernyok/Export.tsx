import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppElrendezes } from '../komponensek/Elrendezes.tsx';
import { useAuth, useSzerkeszthet } from '../lib/auth.tsx';
import {
  eredetikMerete,
  eredetikZip,
  exportalhatok,
  keszit,
  letolt,
  osszefoglalo,
  probaFajl,
  programE,
  selejtezestBefejez,
  ugyfelLista,
  ugyfelre,
  type Formatum,
  type Szurok,
  type Tetel,
} from '../lib/export.ts';
import { DOKUMENTUM_TIPUSOK, opciok, tipusCimke } from '@uzleti/enumok.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { torzsszam } from '@uzleti/adoszam.ts';
import { alapBeallitas, PROGRAM_NEVEK, type KontirBeallitas, type Program } from '@uzleti/export/konyvelo/beallitas.ts';
import { elokeszit } from '@uzleti/export/konyvelo/elokeszit.ts';
import { beallitasBetolt, beallitasMent, type BeallitasForras } from '../lib/konyveloBeallitas.ts';
import { Elokeszitesi, KontirPanel } from '../komponensek/KonyveloProgram.tsx';

/**
 * Az export képernyő.
 *
 * A sorrend a régi Blade-ből jön, és indokolt volt: **előbb látod, mi megy ki,
 * aztán letöltheted az eredetiket, és csak azután készül el az export** — mert
 * az elkészültével a bizonylatok fájljai törlődnek a szerverről.
 */

const FORMATUMOK: { ertek: Formatum; cimke: string }[] = [
  { ertek: 'xlsx', cimke: 'Excel (xlsx)' },
  { ertek: 'csv', cimke: 'CSV' },
  { ertek: 'json', cimke: 'JSON' },
];

/**
 * A könyvelőprogramok – **béta**: a gyártói leírás és minta szerint
 * készülnek, valódi programban még nincsenek kimérve.
 */
const PROGRAM_FORMATUMOK: { ertek: Program; cimke: string }[] = [
  { ertek: 'rlb', cimke: PROGRAM_NEVEK.rlb },
  { ertek: 'novitax', cimke: PROGRAM_NEVEK.novitax },
  { ertek: 'kulcs', cimke: PROGRAM_NEVEK.kulcs },
];

const TIPUS_OPCIOK = opciok(DOKUMENTUM_TIPUSOK, tipusCimke);

export function Export() {
  const { ceg } = useAuth();
  const szerkeszthet = useSzerkeszthet();
  const navigate = useNavigate();

  const [szurok, setSzurok] = useState<Szurok>(() => ({
    tol: honapElseje(),
    ig: honapUtolsoja(),
    tipus: '',
    ugyfel: '',
  }));

  /** Az időszak sorai — **ügyfélszűrő nélkül**. Ebből áll össze az ügyféllista. */
  const [idoszak, setIdoszak] = useState<Tetel[]>([]);
  const [betolt, setBetolt] = useState(true);
  const [formatum, setFormatum] = useState<Formatum>('xlsx');
  const [dolgozik, setDolgozik] = useState<'export' | 'zip' | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);
  const [eredetikLetoltve, setEredetikLetoltve] = useState(false);
  const [kontir, setKontir] = useState<{ beallitas: KontirBeallitas; forras: BeallitasForras }>(
    () => ({ beallitas: alapBeallitas(), forras: 'nincs' }),
  );
  const [kontirBetoltve, setKontirBetoltve] = useState(false);
  const [kontirPiszkos, setKontirPiszkos] = useState(false);

  const program = programE(formatum) ? formatum : null;
  const programos = program !== null;

  useEffect(() => {
    let elo = true;

    void (async () => {
      setBetolt(true);
      const lista = await exportalhatok(szurok);
      if (elo) {
        setIdoszak(lista);
        setBetolt(false);
      }
    })();

    return () => {
      elo = false;
    };
    // Az ügyfélszűrő szándékosan nincs a függőségek között: azt memóriában
    // végezzük, hogy az ügyféllista teljes maradjon (lásd `exportalhatok`).
  }, [szurok.tol, szurok.ig, szurok.tipus]);

  // Amit egy megszakadt előző kör jelölt, de nem törölt, azt itt fejezzük be.
  // Csendben: a felhasználó felé már akkor is az volt az igazság, hogy a kép
  // nincs meg.
  useEffect(() => {
    void selejtezestBefejez();
  }, []);

  const tetelek = useMemo(() => ugyfelre(idoszak, szurok.ugyfel), [idoszak, szurok.ugyfel]);
  const ugyfelek = useMemo(() => ugyfelLista(idoszak), [idoszak]);
  const { darab, osszesites } = useMemo(() => osszefoglalo(tetelek), [tetelek]);
  const eredetiMeret = useMemo(() => eredetikMerete(tetelek), [tetelek]);

  // Az irány annak a cégnek a szemszögéből, akinek a könyveléséről szó van:
  // a kiválasztott ügyfélé, különben a fióké.
  const sajatTorzsszam = szurok.ugyfel !== '' ? szurok.ugyfel : (torzsszam(ceg?.tax_number) ?? '');
  const ugyfelCimke = ugyfelek.find((u) => u.torzsszam === szurok.ugyfel)?.cimke ?? null;

  useEffect(() => {
    if (!programos || ceg === null) return;
    let elo = true;
    setKontirBetoltve(false);
    void (async () => {
      const b = await beallitasBetolt(ceg.id, szurok.ugyfel === '' ? null : szurok.ugyfel);
      if (elo) {
        setKontir(b);
        setKontirBetoltve(true);
      }
    })();
    return () => {
      elo = false;
    };
  }, [programos, ceg, szurok.ugyfel]);

  const elokeszites = useMemo(
    () => (program === null ? null : elokeszit(tetelek, program, sajatTorzsszam, kontir.beallitas)),
    [program, tetelek, sajatTorzsszam, kontir.beallitas],
  );

  /**
   * A programfájl akkor készülhet el, ha a kontír **mentett** (nem az
   * alapérték, és nincs mentetlen változás), hiánytalan, és van mit kiírni.
   */
  const programKesz =
    elokeszites !== null &&
    kontirBetoltve &&
    kontir.forras !== 'nincs' &&
    !kontirPiszkos &&
    elokeszites.beallitasHiany.length === 0 &&
    elokeszites.mehet.length > 0;

  const programNev = ugyfelCimke ?? ceg?.name ?? 'export';

  async function kontirMentes(b: KontirBeallitas, hatokor: 'ugyfel' | 'ceg'): Promise<string | null> {
    if (ceg === null) return 'Nincs cég.';
    const ugyfel = hatokor === 'ugyfel' && szurok.ugyfel !== '' ? szurok.ugyfel : null;
    const eredmeny = await beallitasMent(ugyfel, b);
    if (!eredmeny.ok) return eredmeny.hiba ?? 'A mentés nem sikerült.';
    setKontir(await beallitasBetolt(ceg.id, szurok.ugyfel === '' ? null : szurok.ugyfel));
    return null;
  }

  async function probaLetoltes() {
    if (program === null || elokeszites === null) return;
    setHiba(null);
    const eredmeny = await probaFajl(program, {
      bizonylatok: elokeszites.mehet,
      beallitas: kontir.beallitas,
      nev: programNev,
    });
    if ('hiba' in eredmeny) {
      setHiba(eredmeny.hiba);
      return;
    }
    letolt(eredmeny.blob, eredmeny.fajlnev);
  }

  /**
   * A Novitax- és a Kulcs-fájlhoz iktatószám kell, azt pedig csak szerkesztő
   * adhat ki (állapotváltozás). Az RLB-próbafájl olvasás: bárki letöltheti.
   */
  const probaEngedett = program === 'rlb' || szerkeszthet;

  const allit = useCallback((mezo: keyof Szurok, ertek: string) => {
    setHiba(null);
    setSzurok((elozo) => ({ ...elozo, [mezo]: ertek }));
  }, []);

  async function zipLetoltes() {
    setHiba(null);
    setDolgozik('zip');

    const blob = await eredetikZip(tetelek);

    setDolgozik(null);

    if (blob === null) {
      setHiba('Ezekhez a tételekhez már nincs meg az eredeti fájl.');
      return;
    }

    letolt(blob, `eredeti-bizonylatok-${szurok.tol}.zip`);
    setEredetikLetoltve(true);
  }

  async function exportal() {
    if (ceg === null) return;
    if (programos && (elokeszites === null || !programKesz)) return;

    const torles =
      ceg.file_retention_days === 0 ? ' Az eredeti fájlok ezután törlődnek.' : '';
    const kerdes =
      programos && elokeszites !== null
        ? `Elkészítjük a(z) ${PROGRAM_NEVEK[program as Program]} fájlt ${elokeszites.mehet.length} tétellel` +
          (elokeszites.elakadt.length > 0
            ? `; ${elokeszites.elakadt.length} tétel a listán marad.`
            : '.') +
          `${torles} Folytatod?`
        : `Elkészítjük az exportot.${torles} Folytatod?`;

    if (!window.confirm(kerdes)) {
      return;
    }

    setHiba(null);
    setDolgozik('export');

    const eredmeny =
      programos && elokeszites !== null
        ? await keszit(
            tetelek.filter((t) => elokeszites.mehet.some((b) => b.id === t.id)),
            formatum,
            szurok,
            ceg,
            { bizonylatok: elokeszites.mehet, beallitas: kontir.beallitas, nev: programNev },
          )
        : await keszit(tetelek, formatum, szurok, ceg);

    setDolgozik(null);

    if (!eredmeny.ok || eredmeny.blob === undefined) {
      setHiba(eredmeny.hiba ?? 'Az export nem készült el.');
      // A lista elavulhatott — ha közben változott, a felhasználó lássa a
      // jelenlegi állást, ne a régit.
      setIdoszak(await exportalhatok(szurok));
      return;
    }

    // A kész fájl azonnal a felhasználóé. Az Archívumból is újraletölthető, de
    // ne kelljen érte odamenni.
    letolt(eredmeny.blob, eredmeny.fajlnev ?? 'export');
    navigate('/archivum');
  }

  return (
    <AppElrendezes>
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold text-slate-900">Export</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          A jóváhagyott, még nem exportált tételekből készül. Ami kimegy, az az Archívumba kerül.
        </p>

        <div className="card card-pad space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="flabel" htmlFor="tol">
                Beérkezés – tól
              </label>
              <input
                id="tol"
                type="date"
                className="control"
                value={szurok.tol}
                onChange={(e) => allit('tol', e.target.value)}
              />
            </div>
            <div>
              <label className="flabel" htmlFor="ig">
                Beérkezés – ig
              </label>
              <input
                id="ig"
                type="date"
                className="control"
                value={szurok.ig}
                onChange={(e) => allit('ig', e.target.value)}
              />
            </div>
            <div>
              <label className="flabel" htmlFor="tipus">
                Típus
              </label>
              <select
                id="tipus"
                className="control"
                value={szurok.tipus}
                onChange={(e) => allit('tipus', e.target.value)}
              >
                <option value="">Mind</option>
                {TIPUS_OPCIOK.map((o) => (
                  <option key={o.ertek} value={o.ertek}>
                    {o.cimke}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/*
            Ügyfelenkénti export. Aki több cégnek könyvel, itt választja szét,
            amit egyébként cégenkénti fiókokkal kellene — adószám alapján, mert
            a cégnév írásmódja bizonylatonként változik.
          */}
          <div>
            <label className="flabel" htmlFor="ugyfel">
              Ügyfél
            </label>
            <select
              id="ugyfel"
              className="control"
              value={szurok.ugyfel}
              onChange={(e) => allit('ugyfel', e.target.value)}
            >
              <option value="">Mind</option>
              {ugyfelek.map((u) => (
                <option key={u.torzsszam} value={u.torzsszam}>
                  {u.cimke}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Adószám alapján, a törzsszám (első nyolc jegy) szerint – így az sem gond, ha
              ugyanaz a cég más alakban szerepel a bizonylatokon. A kiválasztott ügyfél{' '}
              <strong>bejövő és kimenő</strong> bizonylatai is bekerülnek.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <div className="text-sm font-medium text-slate-800">
              {betolt
                ? 'Egy pillanat…'
                : elokeszites !== null
                  ? `${elokeszites.mehet.length} tétel megy a fájlba, ${elokeszites.elakadt.length} a listán marad`
                  : `${darab} tétel kerül exportba`}
            </div>
            {Object.entries(osszesites)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([penznem, ossz]) => (
                <div key={penznem} className="mt-1 text-xs text-slate-600">
                  {penznem} – nettó {formaz(ossz.netto)} · ÁFA {formaz(ossz.afa)} · bruttó{' '}
                  {formaz(ossz.brutto)}{' '}
                  <span className="text-slate-400">({ossz.darab} könyvelendő)</span>
                </div>
              ))}
          </div>

          <div>
            <span className="flabel">Formátum</span>
            <div className="text-xs text-slate-500">Táblázat</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {FORMATUMOK.map((f) => (
                <FormatumGomb key={f.ertek} f={f} valasztott={formatum} onValaszt={setFormatum} />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              Könyvelőprogram <span className="badge badge-varakozo">béta</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {PROGRAM_FORMATUMOK.map((f) => (
                <FormatumGomb key={f.ertek} f={f} valasztott={formatum} onValaszt={setFormatum} />
              ))}
            </div>
          </div>

          {program !== null && (
            <div className="space-y-3">
              <div className="alert alert-info">
                <strong>Béta:</strong> a(z) {PROGRAM_NEVEK[program]} fájl a gyártó leírása és
                mintája szerint készül, valódi programban még nincs kipróbálva. Először tölts le
                <strong> próbafájlt</strong>, és egy próbacégbe töltsd be – az nem jelöli át a
                tételeket.
              </div>

              {szurok.ugyfel === '' && (
                <p className="text-xs text-slate-500">
                  A programfájl egy cég könyvelése. Könyvelőirodaként válaszd ki fent az
                  ügyfelet – most a saját céged adószáma dönti el, mi bejövő és mi kimenő.
                </p>
              )}

              {kontirBetoltve && (
                <KontirPanel
                  program={program}
                  mentett={kontir.beallitas}
                  forras={kontir.forras}
                  ugyfelCimke={ugyfelCimke}
                  szerkeszthet={szerkeszthet}
                  hianyok={elokeszites?.beallitasHiany ?? []}
                  onMent={kontirMentes}
                  onPiszkos={setKontirPiszkos}
                />
              )}

              {elokeszites !== null && <Elokeszitesi e={elokeszites} />}
            </div>
          )}

          {ceg !== null && ceg.file_retention_days === 0 ? (
            <div className="alert alert-figyelem">
              <strong>
                Az export után az eredeti PDF-ek és képek törlődnek a szerverről.
              </strong>{' '}
              Az adatok az Archívumban maradnak, de a bizonylat képe nem hívható vissza. Töltsd
              le őket most, ha meg akarod őrizni – a megőrzési kötelezettség a tiéd.
            </div>
          ) : (
            <div className="alert alert-info">
              Az eredeti fájlok az export után még {ceg?.file_retention_days} napig elérhetők
              maradnak.
            </div>
          )}

          {hiba !== null && <div className="alert alert-hiba">{hiba}</div>}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            {/*
              Az eredetik letöltése olvasás: ugyanaz az adat, amit a megtekintő
              egyesével amúgy is megnyithat. Az export viszont megváltoztatja a
              tételeket és törli az eredeti fájlokat.
            */}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={darab === 0 || dolgozik !== null}
              onClick={() => void zipLetoltes()}
            >
              {dolgozik === 'zip'
                ? 'Csomagolás…'
                : `Eredeti bizonylatok letöltése (ZIP${meretCimke(eredetiMeret)})`}
            </button>

            {programos && probaEngedett && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!programKesz || dolgozik !== null}
                onClick={() => void probaLetoltes()}
              >
                Próbafájl letöltése
              </button>
            )}

            {szerkeszthet && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={darab === 0 || dolgozik !== null || (programos && !programKesz)}
                onClick={() => void exportal()}
              >
                {dolgozik === 'export' ? 'Készül…' : 'Export elkészítése'}
              </button>
            )}

            {eredetikLetoltve && (
              <span className="text-xs text-emerald-700">Az eredetik letöltve.</span>
            )}
          </div>

          {!szerkeszthet && (
            <p className="text-xs text-slate-500">
              Megtekintő szerepben az eredetiket le tudod tölteni, exportot viszont nem
              készíthetsz – az átjelöli a tételeket és törli az eredeti fájlokat.
            </p>
          )}
        </div>
      </div>
    </AppElrendezes>
  );
}

function FormatumGomb(props: {
  f: { ertek: Formatum; cimke: string };
  valasztott: Formatum;
  onValaszt: (f: Formatum) => void;
}) {
  const { f, valasztott, onValaszt } = props;
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        valasztott === f.ertek ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-300 bg-white'
      }`}
    >
      <input
        type="radio"
        name="formatum"
        value={f.ertek}
        checked={valasztott === f.ertek}
        onChange={() => onValaszt(f.ertek)}
        className="sr-only"
      />
      {f.cimke}
    </label>
  );
}

/** A ZIP a böngésző memóriájában áll össze — a méret tudása döntés előtt kell. */
function meretCimke(bajt: number): string {
  if (bajt <= 0) {
    return '';
  }

  const mb = bajt / (1024 * 1024);

  return mb < 0.1 ? ', <0,1 MB' : `, ${mb.toFixed(1).replace('.', ',')} MB`;
}

function honapElseje(): string {
  const most = new Date();
  return `${most.getFullYear()}-${ketJegy(most.getMonth() + 1)}-01`;
}

function honapUtolsoja(): string {
  const most = new Date();
  const utolso = new Date(most.getFullYear(), most.getMonth() + 1, 0);
  return `${utolso.getFullYear()}-${ketJegy(utolso.getMonth() + 1)}-${ketJegy(utolso.getDate())}`;
}

function ketJegy(n: number): string {
  return String(n).padStart(2, '0');
}
