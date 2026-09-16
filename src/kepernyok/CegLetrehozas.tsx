import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { AuthElrendezes } from '../komponensek/Elrendezes.tsx';
import { varoMeghivo, type VaroMeghivo } from '../lib/meghivo.ts';
import { ervenyes, formaz } from '@uzleti/adoszam.ts';
import { hatralevoNap } from '@uzleti/meghivo.ts';
import { szerepCimke } from '@uzleti/enumok.ts';

/**
 * Cég létrehozása. Első belépéskor ez az egyetlen elérhető képernyő — nincs
 * félkész állapot, amiben a felhasználó eltéved.
 *
 * **Az adószám itt kötelező és érvényes magyar adószám kell legyen.** Ez nem
 * formaság: a fogyasztóvédelmi jog kógens, hiába köti ki az ÁSZF, hogy a
 * szolgáltatás csak vállalkozásoknak szól — ha a rendszer beenged egy
 * magánszemélyt, rá attól még a fogyasztói szabályok érvényesek (elállási jog,
 * békéltető testület). A gyakorlati szűrő az adószám, mert fogyasztónak nincs.
 *
 * Itt tehát **szigorúbb a mérce, mint a bizonylatokon**: ott az `Adoszam`
 * alapból megengedő, mert egy külföldi *szállító* adószáma nem magyar alakú és
 * attól még helyes — az a szabály a partnerre szól, ez pedig a saját cégünkre.
 *
 * # Miért kérdez rá a meghívóra, mielőtt bárki céget alapítana
 *
 * Mert ez a képernyő **egyirányú ajtó** volt. A `Ceggel` őr minden cég nélküli
 * fiókot ide terel — köztük azt a meghívottat is, aki a levelét elveszítette.
 * Ha ő itt céget alapít, a meghívóból **véglegesen** kizárja magát
 * (`meghivot_elfogad` 3. kapuja: egy fiók egy céget kezel), a `/fiok-torles`
 * pedig még helyőrző, tehát vissza sem tud lépni. Élesben ez meg is történt:
 * egy fiók nulla tagsággal ragadt be.
 *
 * Az űrlap ezért **nem tűnik el** a kártya mellől: van, akit meghívtak, és
 * mégis a saját cégét akarja. A választást nem vesszük el — csak láthatóvá
 * tesszük, melyik ajtó csukódik be.
 */
export function CegLetrehozas() {
  const [nev, setNev] = useState('');
  const [adoszam, setAdoszam] = useState('');
  const [hiba, setHiba] = useState<string | null>(null);
  const [kuld, setKuld] = useState(false);

  const [meghivo, setMeghivo] = useState<VaroMeghivo | null>(null);

  const { ujratolt } = useAuth();
  const navigate = useNavigate();

  // A kártya helye addig **üres**, amíg a válasz megjön: se helyőrző, se
  // villanás. Az űrlap közben végig használható — a meghívó kiegészítés, nem
  // feltétel.
  useEffect(() => {
    let el = true;

    void varoMeghivo().then((m) => {
      if (el) setMeghivo(m);
    });

    return () => {
      el = false;
    };
  }, []);

  async function letrehoz(e: FormEvent) {
    e.preventDefault();
    setHiba(null);

    if (nev.trim() === '') {
      setHiba('A cégnév kötelező.');
      return;
    }

    if (!ervenyes(adoszam)) {
      setHiba('Ez nem érvényes magyar adószám. Ellenőrizd a számjegyeket.');
      return;
    }

    setKuld(true);

    // A cég és az alapító tulajdonosi tagsága egy tranzakcióban keletkezik —
    // közvetlen beszúrással keletkezhetne olyan cég, amihez senki nem tartozik.
    const { error } = await supabase.rpc('ceg_letrehozas', {
      nev: nev.trim(),
      adoszam: formaz(adoszam) ?? adoszam.trim(),
    });

    if (error !== null) {
      setKuld(false);
      setHiba(error.message);
      return;
    }

    await ujratolt();
    setKuld(false);
    navigate('/beerkezo', { replace: true });
  }

  return (
    <AuthElrendezes>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Cég létrehozása</h1>
      <p className="mb-5 text-sm text-slate-500">Két adat, és indulhat a feltöltés.</p>

      {meghivo !== null && <VarMegHivo meghivo={meghivo} />}

      {hiba !== null && <div className="alert alert-hiba mb-4">{hiba}</div>}

      <form onSubmit={letrehoz} className="space-y-4">
        <div>
          <label className="flabel" htmlFor="nev">
            Cégnév
          </label>
          <input
            id="nev"
            type="text"
            className="control"
            required
            autoFocus
            placeholder="Példa Kereskedelmi Kft."
            value={nev}
            onChange={(e) => setNev(e.target.value)}
          />
        </div>

        <div>
          <label className="flabel" htmlFor="adoszam">
            Adószám
          </label>
          <input
            id="adoszam"
            type="text"
            className="control"
            required
            placeholder="12345678-2-42"
            value={adoszam}
            onChange={(e) => setAdoszam(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">
            Ebből tudja a rendszer, hogy egy bizonylaton te vagy a szállító vagy a vevő. A
            SzámlaFolyót vállalkozások használhatják, ezért kötelező.
          </p>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={kuld}>
          {kuld ? 'Egy pillanat…' : 'Létrehozás'}
        </button>
      </form>
    </AuthElrendezes>
  );
}

/**
 * „Vár rád egy meghívó" — a kijárat, ami eddig hiányzott.
 *
 * A gomb nem fogad el semmit, csak **odavisz**: a négy kaput továbbra is a
 * `/meghivo/:token` képernyő és mögötte az adatbázis zárja. Két helyen eldöntve
 * előbb-utóbb két választ adna.
 */
function VarMegHivo({ meghivo }: { meghivo: VaroMeghivo }) {
  const nap = hatralevoNap(meghivo.lejar);

  return (
    <div className="alert alert-info mb-5">
      <p>
        Meghívtak a(z) <strong>{meghivo.ceg_nev}</strong> SzámlaFolyó-fiókjába —{' '}
        {szerepCimke(meghivo.szerep).toLowerCase()} szerepben. A meghívó még {nap} napig
        érvényes.
      </p>

      <Link to={`/meghivo/${meghivo.jel}`} className="btn btn-primary mt-3 w-full">
        Belépek a céghez
      </Link>

      <p className="mt-3 text-xs">
        Ha most <strong>saját céget</strong> alapítasz, ezt a meghívót már nem tudod
        elfogadni: egy fiók egy céget kezel.
      </p>
    </div>
  );
}
