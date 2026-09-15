import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AppElrendezes } from '../komponensek/Elrendezes.tsx';
import { useAuth } from '../lib/auth.tsx';
import { keret as keretetKer, type Keret } from '../lib/keret.ts';
import {
  autoJovahagyastMent,
  beerkezettLevelek,
  bekuldesBarkitolMent,
  bekuldestMent,
  megorzesCimke,
  megorzesiNapok,
  megorzestMent,
  nevetMent,
  plafontMent,
  szerepetMent,
  tagok as tagokatKer,
  tagotTorol,
  tokentCserel,
  tulhasznalatotMent,
  type BeerkezettLevel,
  type Tag,
} from '../lib/beallitasok.ts';
import { szamlafolyo } from '@config/szamlafolyo.ts';
import { szabaly } from '@uzleti/kredit.ts';
import { keretMondat } from '@uzleti/keret.ts';
import { SZEREPEK, szerepCimke, type Szerep } from '@uzleti/enumok.ts';
import { datum } from '@uzleti/ido.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { bekuldesiCim } from '@uzleti/bekuldes.ts';
import { allapotCimke, ferMegTag, kikuldesCimke, meghivoLink } from '@uzleti/meghivo.ts';
import {
  allapota as meghivoAllapota,
  meghivok as meghivokatKer,
  meghivotKuld,
  meghivotLetrehoz,
  meghivotVisszavon,
  type Meghivo,
} from '../lib/meghivo.ts';

/**
 * Beállítások.
 *
 * Négy dolog van itt, és mind a négy **következménnyel jár** — ezért mindegyik
 * mellett ott áll, hogy mi történik. Egy beállítás, aminek a hatását el kell
 * képzelni, rosszabb, mint ha nem is lenne ott.
 *
 * Ezért lett a két kétállású beállításból **választás két gombbal**, nem
 * jelölőnégyzet: egy kérdésre („Mi történjen, ha elfogy a kereted?") a válasz
 * ne egyetlen négyzet legyen, amiből a másik ágat ki kell találni. Az
 * indoklás a `Valasztas`-nál áll.
 *
 * A mentés **azonnali**, nincs „Mentés" gomb. Ez négy független beállításnál a
 * helyes minta: egy gomb azt ígérné, hogy a négy változtatás összetartozik.
 *
 * Aki nem tulajdonos, az mindent **lát**, de nem állít. Azért lát, mert a
 * megőrzési idő és az automatikus jóváhagyás a saját munkáját is meghatározza —
 * elrejtve azt hinné, hogy a rendszer kiszámíthatatlan.
 */
export function Beallitasok() {
  const { ceg, szerep, user, ujratolt } = useAuth();
  const admin = szerep === 'tulajdonos';

  const [keret, setKeret] = useState<Keret | null>(null);
  const [tagLista, setTagLista] = useState<Tag[]>([]);
  const [levelek, setLevelek] = useState<BeerkezettLevel[]>([]);
  const [meghivoLista, setMeghivoLista] = useState<Meghivo[]>([]);
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);

  const betoltes = useCallback(async () => {
    setKeret(await keretetKer());

    if (ceg !== null) {
      setTagLista(await tagokatKer(ceg.id));
      setLevelek(await beerkezettLevelek(ceg.id));
      // A meghívókat csak a tulajdonos látja (RLS). Aki nem az, üres listát
      // kap — nem hibát, tehát nem kell külön ágra tenni.
      setMeghivoLista(await meghivokatKer(ceg.id));
    }
  }, [ceg]);

  useEffect(() => {
    void betoltes();
  }, [betoltes]);

  if (ceg === null) {
    return null;
  }

  /** Minden mentés ezen megy át: egy hely, ahol a visszajelzés eldől. */
  async function ment(
    mit: () => Promise<{ ok: boolean; hiba?: string }>,
    sikerSzoveg: string,
  ) {
    setHiba(null);
    setUzenet(null);

    const eredmeny = await mit();

    if (!eredmeny.ok) {
      setHiba(eredmeny.hiba ?? 'A mentés nem sikerült.');
      return;
    }

    setUzenet(sikerSzoveg);
    await ujratolt();
    await betoltes();
  }

  return (
    <AppElrendezes>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Beállítások</h1>
        <p className="mt-1 text-sm text-slate-500">
          {admin
            ? 'Amit itt átállítasz, az az egész cégre érvényes.'
            : 'Ezeket a cég tulajdonosa állítja. Azért látod, mert a te munkádat is meghatározzák.'}
        </p>
      </div>

      {uzenet !== null && <div className="alert alert-siker mb-4">{uzenet}</div>}
      {hiba !== null && <div className="alert alert-hiba mb-4">{hiba}</div>}

      <div className="space-y-4">
        <KeretKartya keret={keret} />

        <Kartya cim="A cég" leiras="Ami a bizonylatok fejlécén és az exporton szerepel.">
          <label className="flabel" htmlFor="cegnev">
            Név
          </label>
          <input
            id="cegnev"
            type="text"
            className="control max-w-sm"
            defaultValue={ceg.name}
            disabled={!admin}
            onBlur={(e) => {
              if (e.target.value.trim() !== ceg.name) {
                void ment(() => nevetMent(ceg.id, e.target.value), 'A cég neve módosítva.');
              }
            }}
          />

          <div className="mt-4">
            <label className="flabel" htmlFor="adoszam">
              Adószám
            </label>
            <input
              id="adoszam"
              type="text"
              className="control max-w-sm bg-slate-50"
              value={ceg.tax_number}
              readOnly
              disabled
            />
            {/*
              Az adószám szándékosan nem szerkeszthető, és ez nem elmaradt
              funkció: az export ügyfélszűrője és az automatikus jóváhagyás
              „eltér-e a cég szokásaitól" kapuja is ebből dolgozik. Egy csendes
              átírás visszamenőleg sorolná át, melyik bizonylat kié. Az
              adatbázis szintjén is tiltva van, nem csak itt.
            */}
            <p className="mt-2 text-sm text-slate-600">
              Az adószám nem módosítható: az export ügyfélszűrője és az ellenőrzések is ebből
              dolgoznak, egy átírás visszamenőleg sorolná át a bizonylataidat. Ha elgépelted,
              szólj — ellenőrzött úton javítjuk.
            </p>
          </div>
        </Kartya>

        <Kartya
          cim="E-mailes beküldés"
          leiras="A cégnek saját beküldő címe van. Amit oda küldesz, az úgy kerül a Beérkezőbe, mintha feltöltötted volna."
        >
          <Valasztas
            nev="bekuldes"
            be={ceg.bekuldes_be}
            tiltva={!admin}
            ki_opcio={{
              cimke: 'Kikapcsolva',
              leiras: 'A cím nem fogad el semmit. Bizonylat csak feltöltéssel kerül be.',
            }}
            be_opcio={{
              cimke: 'Fogadjon leveleket',
              leiras: 'A mellékletekből bizonylat lesz, ugyanúgy kreditért, mint feltöltéskor.',
            }}
            onValt={(be) =>
              void ment(
                () => bekuldestMent(ceg.id, be),
                be ? 'Az e-mailes beküldés bekapcsolva.' : 'Az e-mailes beküldés kikapcsolva.',
              )
            }
          />

          {ceg.bekuldes_be && (
            <>
              <div className="mt-4">
                <label className="flabel" htmlFor="bekuldo-cim">
                  A cég beküldő címe
                </label>
                <CimSor id="bekuldo-cim" cim={bekuldesiCim(ceg.bekuldes_token)} />

                {/*
                  Ez nem figyelmeztetés a figyelmeztetés kedvéért: a cím
                  **bemutatóra szóló kulcs**. Aki ismeri, a cég keretéből költ —
                  és ezt a felhasználónak tudnia kell, mielőtt kiteszi egy
                  aláírásba vagy egy weboldalra.
                */}
                <p className="mt-2 text-sm text-slate-500">
                  Ez a cím <strong>titok</strong>: aki ismeri, a ti keretetekből költ. Ne tedd
                  ki nyilvános helyre. Ha kiszivárgott, cseréld le — a régi cím azonnal
                  érvénytelen lesz.
                </p>
              </div>

              <div className="mt-4">
                <Valasztas
                  nev="bekuldes-barkitol"
                  be={ceg.bekuldes_barkitol}
                  tiltva={!admin}
                  ki_opcio={{
                    cimke: 'Csak a cég tagjaitól',
                    leiras:
                      'A saját postafiókodból továbbküldött levelek jönnek át. Idegen feladót elutasítunk, és itt lent meg is mutatjuk.',
                  }}
                  be_opcio={{
                    cimke: 'Bárkitől, aki ismeri a címet',
                    leiras:
                      'A szállítóid közvetlenül is küldhetnek ide. Cserébe minden odaérkező levél mellékletét feldolgozzuk.',
                  }}
                  onValt={(be) =>
                    void ment(
                      () => bekuldesBarkitolMent(ceg.id, be),
                      be
                        ? 'Mostantól bárkitől fogadunk levelet erre a címre.'
                        : 'Mostantól csak a cég tagjaitól fogadunk levelet.',
                    )
                  }
                />
              </div>

              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>
                  • <strong>PDF, kép és e-számla XML</strong> mellékleteket dolgozunk fel. Ha a
                  levélben van PDF vagy XML, a képekhez hozzá sem nyúlunk — így az aláírásban
                  ülő céglogóból nem lesz bizonylat.
                </li>
                <li>
                  • Egy levélből legfeljebb{' '}
                  <strong>{szamlafolyo.bekuldes.maxMelleklet}</strong> mellékletet dolgozunk fel.
                </li>
                <li>
                  • A feladónak <strong>nem küldünk választ</strong>. Hogy mi lett a leveleddel,
                  itt lent látod.
                </li>
              </ul>

              {admin && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mt-4"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Lecseréled a beküldő címet? A régi cím azonnal érvénytelen lesz, és az oda küldött levelek elvesznek.',
                      )
                    ) {
                      void ment(
                        () => tokentCserel(ceg.id),
                        'Új beküldő cím. A régi mostantól érvénytelen.',
                      );
                    }
                  }}
                >
                  Új címet kérek
                </button>
              )}

              <LevelLista levelek={levelek} />
            </>
          )}
        </Kartya>

        <Kartya
          cim="Automatikus jóváhagyás"
          leiras="Alapból ki van kapcsolva: minden bizonylat rád vár. Bekapcsolva az megy át magától, amelyik minden ellenőrzésen átment."
        >
          <Valasztas
            nev="auto-jovahagyas"
            be={ceg.auto_jovahagyas_be}
            tiltva={!admin}
            ki_opcio={{
              cimke: 'Minden bizonylatot én nézek át',
              leiras: 'Semmi nem megy át magától, akkor sem, ha hibátlan.',
            }}
            be_opcio={{
              cimke: 'Csak azt kapjam kézhez, amivel dolgom van',
              leiras:
                'Ami minden ellenőrzésen átment, magától jóváhagyásra kerül — jelvénnyel és indokkal.',
            }}
            onValt={(be) =>
              void ment(
                () => autoJovahagyastMent(ceg.id, be),
                be
                  ? 'Az automatikus jóváhagyás bekapcsolva.'
                  : 'Mostantól minden bizonylat ellenőrzésre vár.',
              )
            }
          />

          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            <li>
              • Az első <strong>{szamlafolyo.automatikusJovahagyas.bemelegitesDarab}</strong>{' '}
              bizonylat akkor is hozzád kerül — előzmények nélkül a rendszernek nincs mihez
              mérnie, és neked is látnod kell egyszer, mit csinál.
            </li>
            <li>
              • Utána is minden{' '}
              <strong>{szamlafolyo.automatikusJovahagyas.mintavetelMinden}.</strong> bizonylat
              emberhez megy. Ettől marad kalibrálva az ellenőrzés — és csak így mérhető, hogy
              az automatika mennyit téved.
            </li>
            <li>
              • Ami automatikusan ment át, az <strong>jelvényt kap</strong>, és exportig
              visszahívható javításra. Soha nem írjuk ki, hogy „ellenőrizve", ha senki nem
              nézte meg.
            </li>
          </ul>
        </Kartya>

        <Kartya
          cim="Eredeti fájlok megőrzése"
          leiras="A kiolvasás után az eredeti fájl már nem kell semmihez: az adat az adatbázisban van, a könyvelő az exportot kapja."
        >
          <label className="flabel" htmlFor="megorzes">
            Mikor törlődjön
          </label>
          <select
            id="megorzes"
            className="control max-w-sm"
            value={ceg.file_retention_days}
            disabled={!admin}
            onChange={(e) =>
              void ment(
                () => megorzestMent(ceg.id, Number(e.target.value)),
                'A megőrzési idő módosítva.',
              )
            }
          >
            {megorzesiNapok().map((nap) => (
              <option key={nap} value={nap}>
                {megorzesCimke(nap)}
              </option>
            ))}
          </select>

          <p className="mt-3 text-sm text-slate-600">
            Amíg a fájl megvan, addig idegen cégek számláit tároljuk.{' '}
            <strong>Ami nincs meg, azt nem is lehet kiszivárogtatni.</strong> Hosszabb megőrzés
            akkor indokolt, ha időnként vissza kell nézned az eredetibe — a kiolvasott adat és
            az export ettől függetlenül megmarad.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            „Azonnal" esetén a törlés az exporttal egy lépésben történik. Türelmi idő mellett a
            napi selejtezés viszi el. Ha egy tételt visszahívsz az Archívumból és újra
            exportálsz, a türelmi idő <strong>az újabb exporttól</strong> ketyeg.
          </p>
        </Kartya>

        <Kartya
          cim="Túlhasználat"
          leiras="Mi történjen, ha egy hónapban elfogy a kereted."
        >
          <Valasztas
            nev="tulhasznalat"
            be={ceg.overage_enabled}
            tiltva={!admin}
            ki_opcio={{
              cimke: 'A keret állítson meg',
              leiras:
                'A hónap hátralévő részében nem dolgozunk fel több bizonylatot. A számlán nem ér meglepetés.',
            }}
            be_opcio={{
              cimke: 'Menjen tovább, a plafonig',
              leiras:
                'A keret fölött is feldolgozunk, a lent megadott forintösszegig. Afölött megállunk.',
            }}
            onValt={(be) =>
              void ment(
                () => tulhasznalatotMent(ceg.id, be, ceg.overage_limit_ft),
                be
                  ? `Túlhasználat engedélyezve, ${formaz(ceg.overage_limit_ft ?? szamlafolyo.tulhasznalat.alapPlafonFt, 'Ft')}-os plafonnal.`
                  : 'Túlhasználat kikapcsolva. A keret ezentúl megállít.',
              )
            }
          />

          {ceg.overage_enabled && (
            <div className="mt-4">
              <label className="flabel" htmlFor="plafon">
                Felső határ forintban
              </label>
              <div className="flex max-w-sm items-center gap-2">
                <input
                  id="plafon"
                  type="number"
                  min={1}
                  step={1000}
                  className="control"
                  defaultValue={ceg.overage_limit_ft ?? szamlafolyo.tulhasznalat.alapPlafonFt}
                  disabled={!admin}
                  onBlur={(e) => {
                    const ertek = Number(e.target.value);

                    if (ertek !== ceg.overage_limit_ft) {
                      void ment(
                        () => plafontMent(ceg.id, ertek),
                        'A túlhasználati plafon módosítva.',
                      );
                    }
                  }}
                />
                <span className="text-sm text-slate-500">Ft</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                A plafon <strong>nem opcionális</strong>: a nyitott végű engedély váratlan
                számlát jelentene. Forintban mér, nem bizonylatban, mert a darabár csomagonként
                más.
              </p>
            </div>
          )}
        </Kartya>

        <Kartya cim="Tagok" leiras="Ki fér hozzá a cég bizonylataihoz.">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="th">Tag</th>
                  <th className="th">Szerep</th>
                  <th className="th">Állapot</th>
                  {admin && <th className="th" />}
                </tr>
              </thead>
              <tbody>
                {tagLista.map((tag) => {
                  const en = tag.user_id === user?.id;

                  return (
                    <tr key={tag.id} className="trow">
                      <td className="td font-medium text-slate-900">
                        {en ? `${user?.email ?? 'Te'} (te)` : (tag.email ?? rovidAzonosito(tag.user_id))}
                      </td>
                      <td className="td">
                        {admin && !en ? (
                          <select
                            className="control py-1 text-sm"
                            value={tag.role}
                            onChange={(e) =>
                              void ment(
                                () => szerepetMent(tag.id, e.target.value as Szerep),
                                'A szerep módosítva.',
                              )
                            }
                          >
                            {SZEREPEK.map((sz) => (
                              <option key={sz} value={sz}>
                                {szerepCimke(sz)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          szerepCimke(tag.role)
                        )}
                      </td>
                      <td className="td">
                        {tag.accepted_at === null ? (
                          <span className="badge badge-varakozo">Meghívva</span>
                        ) : (
                          <span className="text-sm text-slate-500">
                            {datum(tag.created_at)} óta
                          </span>
                        )}
                      </td>
                      {admin && (
                        <td className="td text-right">
                          {!en && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() =>
                                void ment(() => tagotTorol(tag.id), 'A tag eltávolítva.')
                              }
                            >
                              Eltávolítom
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {admin && (
            <Meghivas
              cegId={ceg.id}
              lista={meghivoLista}
              tagokSzama={tagLista.length}
              keret={keret}
              frissit={betoltes}
            />
          )}
        </Kartya>
      </div>
    </AppElrendezes>
  );
}

/** A keret állapota. Nem beállítás, de itt keresi az ember. */
function KeretKartya({ keret }: { keret: Keret | null }) {
  if (keret === null) {
    return (
      <div className="card card-pad">
        <h2 className="text-base font-semibold text-slate-900">Kereted</h2>
        <p className="mt-2 text-sm text-slate-500">Egy pillanat…</p>
      </div>
    );
  }

  const arany = keret.keret === 0 ? 0 : Math.min(100, (keret.felhasznalt / keret.keret) * 100);
  const fogy = arany >= 80;

  return (
    <div className="card card-pad">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-base font-semibold text-slate-900">Kereted</h2>
        {keret.allapot === 'proba' && <span className="badge badge-semleges">Próbaidő</span>}
        {keret.allapot === 'lejart' && <span className="badge badge-hiba">Lejárt</span>}
        {keret.csomag !== null && <span className="badge badge-kesz">{keret.csomag}</span>}
      </div>

      <p className="mt-2 text-sm text-slate-700">{keretMondat(keret)}</p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${fogy ? 'bg-amber-500' : 'bg-slate-400'}`}
          style={{ width: `${arany}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {keret.felhasznalt} / {keret.keret} bizonylat
        {keret.idoszakVege !== null && ` · eddig: ${datum(keret.idoszakVege)}`}
      </p>

      {/*
        A fair-use szabály ugyanabból a függvényből jön, mint a nyitólapon és a
        keretszámolásban. Egy szabály, egy megfogalmazás.
      */}
      <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">{szabaly()}</p>
    </div>
  );
}

function Kartya({
  cim,
  leiras,
  children,
}: {
  cim: string;
  leiras: string;
  children: ReactNode;
}) {
  return (
    <div className="card card-pad">
      <h2 className="text-base font-semibold text-slate-900">{cim}</h2>
      <p className="mt-1 mb-4 text-sm text-slate-500">{leiras}</p>
      {children}
    </div>
  );
}

type Opcio = { cimke: string; leiras: string };

/**
 * Kétállású beállítás két választógombbal.
 *
 * # Miért nem jelölőnégyzet
 *
 * Mert az itt **önellentmondó** volt. A négyzet felirata az állapotot mondta
 * („Kikapcsolva — a keret megállít"), tehát a bekapcsoláshoz egy „Kikapcsolva"
 * feliratú dologra kellett kattintani. A kártyák fejléce ráadásul kérdést tesz
 * fel („Mi történjen, ha elfogy a kereted?"), amire egy négyzet egyszerre csak
 * az egyik választ mutatja — a másikat ki kellett találni.
 *
 * Két gombbal **mindkét kimenet látszik, a következményével együtt**, és a
 * kiválasztott mindig megmondja, hol tartasz. Pénzt érintő döntésnél ez nem
 * kozmetika.
 *
 * # A sorrend szabálya
 *
 * Elöl mindig az **óvatosabb** válasz áll (a rendszer kevesebbet tesz magától),
 * mindkét kártyán ugyanúgy. Nem azért, mert az a jó válasz — hanem mert egy
 * képernyőn belül a sorrendnek nem szabad kártyánként fordulnia.
 *
 * Új CSS nincs: az `app.css` `@layer components` blokkja szó szerint a régi
 * rendszerből jött, és nem bővítjük egy űrlapelemért.
 */
function Valasztas({
  nev,
  be,
  tiltva,
  ki_opcio,
  be_opcio,
  onValt,
}: {
  /** A rádiócsoport neve — csoportonként egyedi, különben összeragadnak. */
  nev: string;
  be: boolean;
  tiltva: boolean;
  ki_opcio: Opcio;
  be_opcio: Opcio;
  onValt: (be: boolean) => void;
}) {
  const valaszok = [
    { ertek: false, ...ki_opcio },
    { ertek: true, ...be_opcio },
  ];

  // A `fieldset disabled` az összes belső mezőt letiltja — nem kell minden
  // gombra külön kiírni.
  return (
    <fieldset className="space-y-3" disabled={tiltva}>
      {valaszok.map((valasz) => (
        <label
          key={valasz.cimke}
          className={`flex items-start gap-3 ${tiltva ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <input
            type="radio"
            name={nev}
            className="mt-1 h-4 w-4 accent-slate-700"
            checked={be === valasz.ertek}
            onChange={() => onValt(valasz.ertek)}
          />
          <span>
            <span className="block text-sm font-medium text-slate-800">{valasz.cimke}</span>
            <span className="block text-sm text-slate-500">{valasz.leiras}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * A beküldő cím, másolható alakban.
 *
 * `readOnly` input, nem sima szöveg: egy hosszú, véletlen karaktersort a
 * felhasználó jelölni és másolni akar, nem újragépelni. A `select()` a
 * kattintásra kijelöli az egészet — a vágólap-API-ra pedig nem támaszkodunk
 * egyedül, mert az nem HTTPS alatt (és néhány böngészőben) egyszerűen nincs.
 */
function CimSor({ cim, id }: { cim: string; id?: string }) {
  const [masolva, setMasolva] = useState(false);

  return (
    <div className="flex gap-2">
      <input
        id={id}
        className="control font-mono text-sm"
        value={cim}
        readOnly
        onFocus={(e) => e.target.select()}
        onClick={(e) => e.currentTarget.select()}
      />
      <button
        type="button"
        className="btn btn-secondary shrink-0"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(cim)
            .then(() => {
              setMasolva(true);
              window.setTimeout(() => setMasolva(false), 2000);
            })
            .catch(() => undefined);
        }}
      >
        {masolva ? 'Másolva' : 'Másolom'}
      </button>
    </div>
  );
}

/**
 * A legutóbbi beérkezett levelek.
 *
 * Azért van itt, mert **a csendben eldobott levél a legrosszabb fajta hiba**:
 * nem történik semmi, és senki nem tudja, hogy nem történt semmi. Ha egy
 * szállítói számla azért nem jött át, mert a feladó nincs engedélyezve, annak
 * látszania kell — méghozzá ott, ahol a kapcsoló is van, amivel orvosolható.
 */
function LevelLista({ levelek }: { levelek: BeerkezettLevel[] }) {
  if (levelek.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        Erre a címre még nem érkezett levél.
      </p>
    );
  }

  const jelvenye: Record<BeerkezettLevel['status'], { cimke: string; osztaly: string }> = {
    feldolgozva: { cimke: 'Feldolgozva', osztaly: 'badge-kesz' },
    ures: { cimke: 'Nem lett belőle bizonylat', osztaly: 'badge-semleges' },
    elutasitva: { cimke: 'Elutasítva', osztaly: 'badge-hiba' },
  };

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-slate-800">Legutóbbi levelek</h3>
      <ul className="space-y-2">
        {levelek.map((level) => {
          const jelveny = jelvenye[level.status];

          return (
            <li key={level.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${jelveny.osztaly}`}>{jelveny.cimke}</span>
                <span className="text-sm font-medium text-slate-800">
                  {level.subject ?? '(tárgy nélkül)'}
                </span>
                {level.accepted_count > 0 && (
                  <span className="text-sm text-slate-500">
                    · {level.accepted_count} bizonylat
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {level.from_address ?? 'ismeretlen feladó'} · {datum(level.created_at)}
              </p>
              {level.reason !== null && (
                <p className="mt-1 text-sm text-slate-600">{level.reason}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Egy tag azonosítója, ha a címét nem tudjuk.
 *
 * Az `auth.users` tábla a kliens elől zárva van — és ez így helyes. A cím ezért
 * a **tagsági soron** áll (`20260915000300` migráció): belépéskor másolódik oda,
 * abban a pillanatban, amikor amúgy is hozzáférünk. Ez a tartalék alak így már
 * csak egy esetben látszik: ha a fiók időközben megszűnt, és a sor árván maradt.
 */
function rovidAzonosito(id: string): string {
  return `Tag · ${id.slice(0, 8)}`;
}

/**
 * Meghívás és a meghívók listája.
 *
 * # Miért két lépés egy gombnyomás mögött
 *
 * Mert két dolog romolhat el külön. A meghívót az adatbázis hozza létre, a
 * levelet a `meghivo-kuld` függvény küldi — és ha a **második** akad el, az
 * első akkor is megvan. Ilyenkor nem azt mondjuk, hogy „nem sikerült", hanem
 * azt, hogy a meghívó létrejött, csak a levél nem ment ki, és itt a link.
 * A régi rendszer legrosszabb hibaosztálya épp ez volt: a felület sikert
 * jelentett, a másik fél meg nem kapott semmit.
 *
 * # A link látszik, és ez szándékos
 *
 * A tulajdonos kimásolhatja és átadhatja máshogy — chaten, telefonban. Ettől a
 * meghívó nem lesz gyengébb: elfogadni továbbra is **csak** a megcímzett
 * e-mail címmel belépve lehet, akárhogy jut el a link a másik félhez.
 */
function Meghivas({
  cegId,
  lista,
  tagokSzama,
  keret,
  frissit,
}: {
  cegId: string;
  lista: Meghivo[];
  tagokSzama: number;
  keret: Keret | null;
  frissit: () => Promise<void>;
}) {
  const [cim, setCim] = useState('');
  const [szerep, setSzerep] = useState<Szerep>('szerkeszto');
  const [dolgozik, setDolgozik] = useState(false);

  /*
   * A visszajelzés **helyben** áll, nem a lap tetején.
   *
   * ⚠️ Ez is élesből jött: a Beállítások hosszú, a Tagok kártya legalul van, a
   * lap tetejére kiírt hibaüzenet pedig a képernyőn kívülre esett. A tulajdonos
   * annyit látott, hogy a meghívó megjelent — azt nem, hogy a levél elakadt.
   * Egy hibaüzenet, amiért görgetni kell, nem hibaüzenet.
   */
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);

  const uzen = (szoveg: string | null) => { setUzenet(szoveg); setHiba(null); };
  const hibaz = (szoveg: string | null) => { setHiba(szoveg); setUzenet(null); };

  async function meghiv(e: FormEvent) {
    e.preventDefault();
    uzen(null);
    hibaz(null);
    setDolgozik(true);

    const letrejott = await meghivotLetrehoz(cegId, cim, szerep);

    if (!letrejott.ok || letrejott.id === undefined) {
      setDolgozik(false);
      hibaz(letrejott.hiba ?? 'A meghívót nem sikerült létrehozni.');
      return;
    }

    const kuldes = await meghivotKuld(letrejott.id);

    setDolgozik(false);
    setCim('');
    await frissit();

    if (!kuldes.ok) {
      hibaz(
        `A meghívó létrejött, de a levél nem ment ki (${kuldes.hiba ?? 'ismeretlen ok'}). ` +
          'A linket a lenti listából kimásolhatod, vagy nyomj a „Küldd újra" gombra.',
      );
      return;
    }

    uzen('A meghívó elment.');
  }

  async function ujra(m: Meghivo) {
    uzen(null);
    hibaz(null);

    const eredmeny = await meghivotKuld(m.id);

    // Frissítünk akkor is, ha hiba volt: a `sent_at` így a valóságot mutatja, ne
    // a legutóbbi gombnyomás hangulatát.
    await frissit();

    if (eredmeny.ok) {
      uzen(`A meghívó újra elment: ${m.email}`);
      return;
    }

    hibaz(`${eredmeny.hiba ?? 'A levél nem ment ki.'} A linket alább kimásolhatod.`);
  }

  async function visszavon(m: Meghivo) {
    uzen(null);
    hibaz(null);

    const eredmeny = await meghivotVisszavon(m.id);

    if (!eredmeny.ok) {
      hibaz(eredmeny.hiba ?? 'A visszavonás nem sikerült.');
      return;
    }

    await frissit();
    uzen('A meghívó visszavonva, a link érvénytelen.');
  }

  const fuggo = lista.filter((m) => meghivoAllapota(m) === 'ervenyes');
  const lezart = lista.filter((m) => meghivoAllapota(m) !== 'ervenyes').slice(0, 5);

  // Amíg a keret nem töltődött be, nem tiltunk: egy hiányzó adat ne látsszon
  // korlátnak. A meghívás akkor is átmegy — a felület ilyenkor nem tud
  // többet, mint az adatbázis.
  const hely = keret === null ? { fer: true } : ferMegTag(keret, tagokSzama, fuggo.length);

  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <h3 className="text-sm font-semibold text-slate-900">Kolléga meghívása</h3>
      <p className="mt-1 text-sm text-slate-500">
        Kap egy levelet a meghívó linkjével. Elfogadni <strong>csak ezzel az e-mail címmel</strong>{' '}
        belépve tud — a link nem adható át másnak.
      </p>

      {uzenet !== null && <div className="alert alert-siker mt-3">{uzenet}</div>}
      {hiba !== null && <div className="alert alert-hiba mt-3">{hiba}</div>}

      {!hely.fer && <div className="alert alert-figyelem mt-3">{hely.indok}</div>}

      <form onSubmit={meghiv} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          className="control"
          placeholder="kollega@pelda.hu"
          required
          value={cim}
          onChange={(e) => setCim(e.target.value)}
        />
        <select
          className="control sm:w-44"
          value={szerep}
          onChange={(e) => setSzerep(e.target.value as Szerep)}
        >
          {SZEREPEK.map((sz) => (
            <option key={sz} value={sz}>
              {szerepCimke(sz)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="btn btn-primary shrink-0"
          disabled={dolgozik || !hely.fer}
        >
          {dolgozik ? 'Küldés…' : 'Meghívom'}
        </button>
      </form>

      {fuggo.length > 0 && (
        <ul className="mt-4 space-y-3">
          {fuggo.map((m) => (
            <li key={m.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-medium text-slate-900">{m.email}</span>
                  <span className="ml-2 text-xs text-slate-500">{szerepCimke(m.role)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${kikuldesCimke(m.sent_at).rendben ? 'badge-kesz' : 'badge-hiba'}`}
                  >
                    {kikuldesCimke(m.sent_at).cimke}
                  </span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => void ujra(m)}>
                    Küldd újra
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void visszavon(m)}>
                    Visszavonom
                  </button>
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-400">{datum(m.expires_at)}-ig érvényes</p>

              <div className="mt-2">
                <CimSor cim={meghivoLink(m.token)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {lezart.length > 0 && (
        <ul className="mt-4 space-y-1">
          {lezart.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-sm text-slate-500">
              <span>{m.email}</span>
              <span className="badge badge-semleges">{allapotCimke(meghivoAllapota(m))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
