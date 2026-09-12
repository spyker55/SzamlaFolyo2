import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { AuthElrendezes } from '../komponensek/Elrendezes.tsx';
import { ervenyes, formaz } from '@uzleti/adoszam.ts';

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
 */
export function CegLetrehozas() {
  const [nev, setNev] = useState('');
  const [adoszam, setAdoszam] = useState('');
  const [hiba, setHiba] = useState<string | null>(null);
  const [kuld, setKuld] = useState(false);

  const { ujratolt } = useAuth();
  const navigate = useNavigate();

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
