import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppElrendezes } from '../komponensek/Elrendezes.tsx';
import { useAuth } from '../lib/auth.tsx';
import { keret as keretetKer, type Keret } from '../lib/keret.ts';
import {
  autoJovahagyastMent,
  megorzesCimke,
  megorzesiNapok,
  megorzestMent,
  nevetMent,
  plafontMent,
  szerepetMent,
  tagok as tagokatKer,
  tagotTorol,
  tulhasznalatotMent,
  type Tag,
} from '../lib/beallitasok.ts';
import { szamlafolyo } from '@config/szamlafolyo.ts';
import { szabaly } from '@uzleti/kredit.ts';
import { keretMondat } from '@uzleti/keret.ts';
import { SZEREPEK, szerepCimke, type Szerep } from '@uzleti/enumok.ts';
import { datum } from '@uzleti/ido.ts';

/**
 * Beállítások.
 *
 * Négy dolog van itt, és mind a négy **következménnyel jár** — ezért mindegyik
 * mellett ott áll, hogy mi történik, ha átbillented. Egy kapcsoló, aminek a
 * hatását el kell képzelni, rosszabb, mint ha nem is lenne ott.
 *
 * A mentés **azonnali**, nincs „Mentés" gomb. Ez négy független kapcsolónál a
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
  const [uzenet, setUzenet] = useState<string | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);

  const betoltes = useCallback(async () => {
    setKeret(await keretetKer());

    if (ceg !== null) {
      setTagLista(await tagokatKer(ceg.id));
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
          cim="Automatikus jóváhagyás"
          leiras="Ha egy bizonylat minden ellenőrzésen átmegy, ne várjon rád fölöslegesen."
        >
          <Kapcsolo
            be={ceg.auto_jovahagyas_be}
            tiltva={!admin}
            cimke={ceg.auto_jovahagyas_be ? 'Bekapcsolva' : 'Kikapcsolva'}
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
        </Kartya>

        <Kartya
          cim="Túlhasználat"
          leiras="Mi történjen, ha egy hónapban elfogy a kereted."
        >
          <Kapcsolo
            be={ceg.overage_enabled}
            tiltva={!admin}
            cimke={
              ceg.overage_enabled
                ? 'Engedélyezve — a keret fölött is feldolgozunk'
                : 'Kikapcsolva — a keret megállít'
            }
            onValt={(be) =>
              void ment(
                () => tulhasznalatotMent(ceg.id, be, ceg.overage_limit_ft),
                be
                  ? `Túlhasználat engedélyezve, ${(ceg.overage_limit_ft ?? szamlafolyo.tulhasznalat.alapPlafonFt).toLocaleString('hu-HU')} Ft-os plafonnal.`
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
                        {en ? `${user?.email ?? 'Te'} (te)` : rovidAzonosito(tag.user_id)}
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

          {/*
            A meghívás e-mailt igényel, az SMTP pedig még nincs beállítva. Egy
            gomb, ami némán nem küld levelet, rosszabb a hiányánál: a tulajdonos
            azt hinné, hogy a kollégája megkapta.
          */}
          <div className="alert alert-figyelem mt-4">
            <strong>A meghívás még nem elérhető.</strong> Ahhoz levélküldés kell, és az a
            jelszó-emlékeztetővel együtt jön a következő körben. Addig a tagok felvétele
            kézi művelet.
          </div>
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

function Kapcsolo({
  be,
  cimke,
  tiltva,
  onValt,
}: {
  be: boolean;
  cimke: string;
  tiltva: boolean;
  onValt: (be: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        className="h-4 w-4 accent-slate-700"
        checked={be}
        disabled={tiltva}
        onChange={(e) => onValt(e.target.checked)}
      />
      <span className="text-sm font-medium text-slate-800">{cimke}</span>
    </label>
  );
}

/**
 * Egy tag azonosítója, ha a nevét nem tudjuk.
 *
 * Az `auth.users` tábla a kliens elől zárva van — és ez így helyes. A többi tag
 * e-mail címét ezért ma nem tudjuk kiírni; a meghívás körében fog megjelenni,
 * amikor a `company_members` a meghívott címét is hordozza.
 */
function rovidAzonosito(id: string): string {
  return `Tag · ${id.slice(0, 8)}`;
}
