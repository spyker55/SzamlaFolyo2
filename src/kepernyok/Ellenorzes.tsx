import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppElrendezes } from '../komponensek/Elrendezes.tsx';
import { Jelmagyarazat, Mezo, Valaszto } from '../komponensek/Mezo.tsx';
import { AfaBontasSzerkeszto } from '../komponensek/AfaBontasSzerkeszto.tsx';
import { useAuth, useSzerkeszthet } from '../lib/auth.tsx';
import { betolt, jovahagy, kovetkezoId, type Betoltott } from '../lib/ellenorzes.ts';
import { DATUM_RACS } from '../lib/datumRacs.ts';
import { bukottak } from '@uzleti/validatorok.ts';
import { sav as savBol, type Sav } from '@uzleti/konfidencia.ts';
import { CIMKEK, type Mezo as MezoNev } from '@uzleti/sema.ts';
import { DOKUMENTUM_TIPUSOK, tipusCimke } from '@uzleti/enumok.ts';
import { oldalak } from '@uzleti/export/oszlopok.ts';
import { kiolvasoForras } from '@uzleti/kiolvasoForras.ts';
import {
  bontastUrlapra,
  ellenorzottMezok,
  parseoltBontas,
  urlapraTolt,
  uresUrlap,
  type UrlapBontasSor,
  type UrlapMezok,
} from '@uzleti/urlap.ts';

/**
 * Az ellenőrző képernyő.
 *
 * **Ez dönti el, hogy a termék gyors-e**: itt ül a felhasználó, és itt telik el
 * az ideje.
 *
 * A legfontosabb döntés: **a jelzés arról szól, ami a képernyőn van**, nem a
 * kiolvasáskor tárolt verdiktről. Az a *gépi* értékekről szól, és amint az ember
 * átír egy számot, elavul — a javított mező pirosan maradna, a frissen elrontott
 * meg tisztán. A validátorok tiszta függvények, ezért itt egyszerűen
 * származtatott állapot: minden billentyűleütésre újraszámolnak.
 *
 * A tárolt gépi verdikt ettől érintetlen marad: **az az audit-nyom**, abból
 * derül ki utólag, mit hibázott a modell.
 */
export function Ellenorzes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const szerkeszthet = useSzerkeszthet();

  const [adat, setAdat] = useState<Betoltott | null>(null);
  const [betoltodik, setBetoltodik] = useState(true);
  const [urlap, setUrlap] = useState<UrlapMezok>(uresUrlap);
  const [bontas, setBontas] = useState<UrlapBontasSor[]>([]);
  const [megjegyzes, setMegjegyzes] = useState('');
  const [urlapHibak, setUrlapHibak] = useState<Partial<Record<MezoNev, string>>>({});
  const [ment, setMent] = useState(false);
  const [mentesiHiba, setMentesiHiba] = useState<string | null>(null);

  const elsoJeloltRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const fokuszaltRef = useRef(false);

  useEffect(() => {
    if (id === undefined) return;

    let elo = true;
    fokuszaltRef.current = false;
    setBetoltodik(true);

    void betolt(id).then((eredmeny) => {
      if (!elo) return;

      setAdat(eredmeny);

      if (eredmeny !== null) {
        setUrlap(urlapraTolt(eredmeny.bizonylat as unknown as Record<MezoNev, unknown>));
        setBontas(bontastUrlapra(eredmeny.bizonylat.afa_bontas));
        setMegjegyzes(eredmeny.bizonylat.note ?? '');
      }

      setBetoltodik(false);
    });

    return () => {
      elo = false;
    };
  }, [id]);

  // A bontás értelmezése: **ugyanaz a függvény szolgálja a képernyőt és a
  // mentést**, hogy a jelzés ne másról szóljon, mint ami mentődni fog.
  const ertelmezettBontas = useMemo(() => parseoltBontas(bontas), [bontas]);

  // A bukott ellenőrzések — a képernyőn lévő értékekre, minden változásra újra.
  const validatorHibak = useMemo(
    () => bukottak(urlap, ertelmezettBontas.sorok),
    [urlap, ertelmezettBontas.sorok],
  );

  const konfidencia = adat?.kiolvasas?.confidence ?? {};

  /**
   * Az összeg-mezőkre vonatkozó indokok, **ismétlés nélkül**.
   *
   * Egy szabály több mezőt is megjelölhet (a `nettó + ÁFA = bruttó` mind a
   * hármat), de az üzenete egy. A pénznem külön szabály, ezért az is ide
   * tartozik, ha megszólal.
   */
  const osszegIndokok = useMemo(() => {
    const mezok = ['net_amount', 'vat_amount', 'gross_amount', 'fizetendo', 'currency'];
    const indokok = mezok
      .map((m) => validatorHibak[m])
      .filter((i): i is string => i !== undefined);

    return [...new Set(indokok)];
  }, [validatorHibak]);

  /**
   * A mező sávja.
   *
   * A **bukott ellenőrzés önmagában elég a pirosításhoz**, a modell
   * magabiztosságától függetlenül. Ez nem kerülőút a konfidencián át: a
   * determinisztikus jel a megbízhatóbb a kettő közül, és nem függhet attól,
   * nyilatkozott-e róla a modell.
   */
  const sav = useCallback(
    (mezo: string): Sav => {
      if (validatorHibak[mezo] !== undefined) return 'gyanus';
      return savBol(konfidencia[mezo] ?? null);
    },
    [validatorHibak, konfidencia],
  );

  // A fókusz az **első megjelölt mezőre** ugrik — arra, amivel dolga van. Ha
  // nincs ilyen, marad, ahol van: egy indokolatlan fókuszugrás elveszi a
  // görgetés helyét.
  useEffect(() => {
    if (betoltodik || fokuszaltRef.current) return;

    fokuszaltRef.current = true;
    elsoJeloltRef.current?.focus();
  }, [betoltodik]);

  const jeloltMar = useRef(false);
  jeloltMar.current = false;

  /** Az első megjelölt mező kapja a ref-et — a többi nem. */
  function jeloltRef(mezo: string) {
    const megjelolt = sav(mezo) === 'gyanus' || sav(mezo) === 'bizonytalan';

    if (!megjelolt || jeloltMar.current) return undefined;

    jeloltMar.current = true;
    return (elem: HTMLInputElement | HTMLSelectElement | null) => {
      elsoJeloltRef.current = elem;
    };
  }

  async function kuldes() {
    if (!szerkeszthet || adat === null || ment) return;

    setMentesiHiba(null);
    const ellenorzott = ellenorzottMezok(urlap);

    // A bontás hibái ugyanúgy megállítanak, mint a mezőké: csendben nullát
    // menteni rosszabb, mint visszakérdezni. A **bukott validátor** viszont nem
    // állít meg — a papír az emberé, nem a miénk.
    if (!ellenorzott.ok || Object.keys(ertelmezettBontas.hibak).length > 0) {
      setUrlapHibak(ellenorzott.ok ? {} : ellenorzott.hibak);
      return;
    }

    setUrlapHibak({});
    setMent(true);

    const kovetkezo = await kovetkezoId(adat.bizonylat.id);

    const eredmeny = await jovahagy({
      bizonylat: adat.bizonylat,
      kiolvasas: adat.kiolvasas,
      mezok: ellenorzott.mezok,
      bontas: ertelmezettBontas.sorok,
      megjegyzes,
      felhasznaloId: user?.id ?? null,
    });

    setMent(false);

    if (!eredmeny.ok) {
      setMentesiHiba(eredmeny.hiba ?? 'A mentés nem sikerült.');
      return;
    }

    navigate(kovetkezo === null ? '/tetelek' : `/ellenorzes/${kovetkezo}`, { replace: true });
  }

  if (betoltodik) {
    return (
      <AppElrendezes>
        <div className="empty">Egy pillanat…</div>
      </AppElrendezes>
    );
  }

  if (adat === null) {
    return (
      <AppElrendezes>
        <div className="alert alert-hiba">Ez a bizonylat nem található.</div>
        <Link to="/beerkezo" className="btn btn-secondary mt-4">
          Vissza a Beérkezőbe
        </Link>
      </AppElrendezes>
    );
  }

  const { bizonylat, fajl, fajlUrl, hatravan, kiolvasas } = adat;
  const kepE = (fajl?.mime_type ?? '').startsWith('image/');

  // Tartomány csak akkor van, ha a fájlt szétszedtük — egyetlen bizonylat
  // esetén a bizonylat maga az egész fájl, és nincs mit kiírni.
  const oldaltartomany = oldalak(bizonylat.oldal_tol, bizonylat.oldal_ig);

  return (
    <AppElrendezes varakozo={hatravan}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Ellenőrzés</h1>
          <p className="mt-1 text-sm text-slate-500">
            {fajl?.original_filename ?? 'Bizonylat'}
            {hatravan > 1 && ` · még ${hatravan - 1} irat vár utána`}
          </p>
        </div>
        <Link to="/beerkezo" className="btn btn-ghost btn-sm">
          Vissza a Beérkezőbe
        </Link>
      </div>

      <KiolvasoSav model={kiolvasas?.model ?? null} />

      {/*
        Az automatikusan jóváhagyott bizonylat. A jelvény mellett ott az indok
        is — **soha ne írjuk ki, hogy „ellenőrizve", ha senki nem nézte meg.**
      */}
      {bizonylat.auto_jovahagyva && (
        <div className="alert alert-info mb-4">
          <span className="badge badge-kesz mr-2">automatikusan jóváhagyva</span>
          {bizonylat.auto_indok ?? 'Minden ellenőrzés rendben.'}
          <p className="mt-1 text-xs">
            Ezt a bizonylatot a rendszer engedte át, ember eddig nem nézte meg. Ha most
            javítasz rajta, azt külön rögzítjük – ebből derül ki, hogy jól vannak-e beállítva
            a küszöbök.
          </p>
        </div>
      )}

      {/*
        A bizonylat egészére szóló figyelmeztetés. Nem egy mezőt jelöl meg, mert
        nem tudjuk, melyik a rossz — azt mondja ki, hogy itt egyikért sem tudunk
        jótállni.
      */}
      {bizonylat.nehezen_olvashato && (
        <div className="alert alert-figyelem mb-4">
          <strong>Kézzel írott vagy nehezen olvasható bizonylat.</strong> Az ilyen iraton a
          gépi kiolvasás megbízhatatlan, és a hibája nem hagy nyomot, amit ellenőrizni
          tudnánk – <strong>minden mezőt vess össze a papírral</strong>, a jelöletlen mezőket
          is. Különösen a neveket: azok az egyetlen adatok, amikhez semmilyen ellenőrzésünk
          nincs.
        </div>
      )}

      {/*
        Két különböző helyzet, két különböző mondat — és eddig csak a második
        létezett.

        Ha a bizonylathoz **oldaltartomány** tartozik, a fájlt a rendszer
        szétszedte: ez a sor a köteg egy darabja, a többi darab külön sorként
        áll a Beérkezőben. Ilyenkor a „töltsd fel külön" tanács kifejezetten
        rossz — a munka már meg van csinálva.

        Tartomány nélküli `tobb_irat_gyanu` viszont pontosan azt jelenti, amit
        eddig: több iratot **sejtünk**, de nem szedtük szét (mert a határok nem
        voltak egyértelműek, vagy mert nem PDF). Ott marad a régi mondat.
      */}
      {oldaltartomany !== null ? (
        <div className="alert alert-info mb-4">
          Ebben a fájlban <strong>több bizonylat</strong> volt, ezért szétszedtük. Ez a
          bizonylat a fájl <strong>{oldaltartomany}.</strong> oldalán áll; a többi külön sorként
          került a Beérkezőbe, és külön jóváhagyást kér.
        </div>
      ) : (
        bizonylat.tobb_irat_gyanu && (
          <div className="alert alert-figyelem mb-4">
            Úgy tűnik, ebben a fájlban <strong>több különálló bizonylat</strong> van, de a
            határaikat nem tudtuk biztosan megállapítani – ezért <strong>nem</strong> szedtük
            szét. Az alábbi adatok az elsőre vonatkoznak; a többit külön érdemes feltölteni.
          </div>
        )
      )}

      {mentesiHiba !== null && <div className="alert alert-hiba mb-4">{mentesiHiba}</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Bal oldal: az eredeti */}
        <div className="card overflow-hidden lg:sticky lg:top-20 lg:self-start">
          {fajlUrl === null ? (
            <div className="empty m-4">
              Ehhez az irathoz már nincs fájl – az export után törlődött.
            </div>
          ) : kepE ? (
            <img
              src={fajlUrl}
              alt={fajl?.original_filename ?? 'Bizonylat'}
              className="max-h-[75vh] w-full bg-slate-100 object-contain"
            />
          ) : (
            /*
              A fájlt **nem vágjuk szét**: ha a bizonylathoz oldaltartomány
              tartozik (mert a fájlban több bizonylat van), az előnézet ugrik a
              helyére. Ez elkerül egy csomó szenvedést, és nem kell hozzá
              PDF-író könyvtár.
            */
            <iframe
              src={`${fajlUrl}#page=${bizonylat.oldal_tol ?? 1}&view=FitH`}
              title={fajl?.original_filename ?? 'Bizonylat'}
              className="h-[75vh] w-full bg-slate-100"
            />
          )}
        </div>

        {/* Jobb oldal: a kiolvasott mezők */}
        <form
          className="card card-pad space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void kuldes();
          }}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter jóváhagy. Csak ott él, ahol a jóváhagyás
            // egyébként is megy.
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              void kuldes();
            }
          }}
        >
          <Jelmagyarazat />

          <Valaszto
            mezo="doc_type"
            cimke={CIMKEK['doc_type']!}
            ertek={urlap.doc_type}
            onChange={(v) => setUrlap({ ...urlap, doc_type: v })}
            sav={sav('doc_type')}
            hiba={validatorHibak['doc_type']}
            urlapHiba={urlapHibak.doc_type}
            opciok={DOKUMENTUM_TIPUSOK.map((t) => ({ ertek: t, cimke: tipusCimke(t) }))}
            inputRef={jeloltRef('doc_type')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                'supplier_name',
                'supplier_tax_number',
                'customer_name',
                'customer_tax_number',
              ] as const
            ).map((mezo) => (
              <Mezo
                key={mezo}
                mezo={mezo}
                cimke={CIMKEK[mezo]!}
                ertek={urlap[mezo]}
                onChange={(v) => setUrlap({ ...urlap, [mezo]: v })}
                sav={sav(mezo)}
                hiba={validatorHibak[mezo]}
                urlapHiba={urlapHibak[mezo]}
                inputRef={jeloltRef(mezo)}
              />
            ))}
          </div>

          <Mezo
            mezo="doc_number"
            cimke={CIMKEK['doc_number']!}
            ertek={urlap.doc_number}
            onChange={(v) => setUrlap({ ...urlap, doc_number: v })}
            sav={sav('doc_number')}
            hiba={validatorHibak['doc_number']}
            urlapHiba={urlapHibak.doc_number}
            inputRef={jeloltRef('doc_number')}
          />

          {/* A dátumok nem fix három oszlopban: fél kártyában levágódtak (`datumRacs.ts`). */}
          <div className={DATUM_RACS}>
            {(['issue_date', 'fulfillment_date', 'due_date'] as const).map((mezo) => (
              <Mezo
                key={mezo}
                mezo={mezo}
                cimke={CIMKEK[mezo]!}
                ertek={urlap[mezo]}
                onChange={(v) => setUrlap({ ...urlap, [mezo]: v })}
                sav={sav(mezo)}
                hiba={validatorHibak[mezo]}
                urlapHiba={urlapHibak[mezo]}
                tipus="date"
                inputRef={jeloltRef(mezo)}
              />
            ))}
          </div>

          {/*
            Az összegek három oszlopban: öt egymás mellett a féloldalas
            kártyában annyira elkeskenyedett, hogy a számok levágódtak — egy
            ellenőrző képernyőn pedig a szám az, amit el kell tudni olvasni.
          */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(['net_amount', 'vat_amount', 'gross_amount', 'fizetendo'] as const).map((mezo) => (
              <Mezo
                key={mezo}
                mezo={mezo}
                cimke={CIMKEK[mezo]!}
                ertek={urlap[mezo]}
                onChange={(v) => setUrlap({ ...urlap, [mezo]: v })}
                sav={sav(mezo)}
                // Az indoklás a blokk alatt áll, egyszer — lásd lentebb.
                hiba={null}
                urlapHiba={urlapHibak[mezo]}
                jobbra
                inputRef={jeloltRef(mezo)}
              />
            ))}
            <Mezo
              mezo="currency"
              cimke={CIMKEK['currency']!}
              ertek={urlap.currency}
              onChange={(v) => setUrlap({ ...urlap, currency: v })}
              sav={sav('currency')}
              hiba={null}
              urlapHiba={urlapHibak.currency}
              maxHossz={3}
              nagybetus
              inputRef={jeloltRef('currency')}
            />
          </div>

          {/*
            Az összegek indoklása **egyszer**, nem mezőnként.
            A `nettó + ÁFA = bruttó` mind a három mezőt megjelöli, mert nem
            tudjuk, melyik a rossz — a keret ezért mindháromnál piros marad. Az
            indokot viszont háromszor egymás mellé írni keskeny hasábokban nem
            segít, csak zajt csinál: ugyanaz a mondat, háromszor.
          */}
          {osszegIndokok.length > 0 && (
            <div className="-mt-2">
              {osszegIndokok.map((indok) => (
                <p key={indok} className="text-xs text-red-700">
                  {indok}
                </p>
              ))}
            </div>
          )}

          <div>
            <AfaBontasSzerkeszto
              sorok={bontas}
              onChange={setBontas}
              hibak={ertelmezettBontas.hibak}
              csakOlvashato={!szerkeszthet}
            />
            {validatorHibak['afa_bontas'] !== undefined && (
              <p className="mt-1 text-xs text-red-700">{validatorHibak['afa_bontas']}</p>
            )}
          </div>

          <Mezo
            mezo="payment_method"
            cimke={CIMKEK['payment_method']!}
            ertek={urlap.payment_method}
            onChange={(v) => setUrlap({ ...urlap, payment_method: v })}
            sav={sav('payment_method')}
            hiba={validatorHibak['payment_method']}
            urlapHiba={urlapHibak.payment_method}
            inputRef={jeloltRef('payment_method')}
          />

          <div>
            <label className="flabel" htmlFor="megjegyzes">
              Megjegyzés
            </label>
            <textarea
              id="megjegyzes"
              rows={2}
              className="control"
              value={megjegyzes}
              onChange={(e) => setMegjegyzes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">Jóváhagyás után a tétel az exportra vár.</p>
            {szerkeszthet ? (
              <button type="submit" className="btn btn-primary" disabled={ment}>
                {ment ? 'Mentés…' : 'Jóváhagyás'}
                {!ment && hatravan > 1 && <span className="text-blue-200">és következő</span>}
              </button>
            ) : (
              /*
                A megtekintő elolvashatja az iratot, de nem hagyja jóvá. A mezők
                látszanak, csak a mentés nem megy — ezt inkább mondjuk ki, mint
                hogy egy néma hibába fusson bele.
              */
              <span className="text-xs text-slate-500">Megtekintőként nem tudod jóváhagyni.</span>
            )}
          </div>
        </form>
      </div>
    </AppElrendezes>
  );
}

/**
 * „Ki olvasta ki ezt a bizonylatot?"
 *
 * # Miért nem riasztás, és miért nem hagyható el
 *
 * Egyik ág sem baj: a strukturált átvétel jó hír, a modellolvasat a normál
 * működés. Ezért **semleges** sáv, nem `alert` — a figyelmeztető színeket a
 * `nehezen_olvashato` és a szétszedetlen köteg viszi, azoknak ott is kell
 * maradniuk.
 *
 * ⚠️ De **mindkét ágon látszik**, nem csak az egyiken. Egy olyan jelzés, ami
 * csak az egyik esetben jelenik meg, a hiányával állít — és ebben a projektben
 * pont az ilyen néma állítás dőlt el rosszul a legtöbbször. Az ellenőrzőnek a
 * modellágon is tudnia kell, hogy olvasatot néz, nem átvételt.
 *
 * Kiolvasás-sor nélkül (`ismeretlen`) a sáv **nem jelenik meg**: nincs mit
 * mondani, és egy „nem tudjuk" doboz az ellenőrzés tetején csak zaj volna.
 * Ide egy `ellenorzesre_var` bizonylat úgysem jut el sor nélkül.
 */
function KiolvasoSav({ model }: { model: string | null }) {
  const jel = kiolvasoForras(model);

  if (jel.forras === 'ismeretlen') {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="badge badge-semleges mr-2">{jel.rovid}</span>
      <span className="text-xs text-slate-500">{jel.mondat}</span>
    </div>
  );
}
