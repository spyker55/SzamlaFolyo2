import { Link } from 'react-router-dom';
import { Adatsor, JogiOldal, P, Szakasz } from './JogiOldal.tsx';
import { adatfeldolgozok, szolgaltato } from './adatok.ts';

/**
 * Impresszum.
 *
 * A régi szöveghez képest **egy érdemi változás** van, és az nem stiláris: a
 * „Tárhelyszolgáltató" szakaszból kiesett a Nethely Kft., és vele az a mondat,
 * hogy „a szolgáltatás kiszolgálói és adatbázisa Magyarországon üzemelnek".
 * A tárhely 2026 szeptemberétől a Supabase (Frankfurt) és a Vercel — ezt az
 * elektronikus kereskedelmi törvény szerint meg kell nevezni, és a régi mondat
 * ma egyszerűen nem igaz.
 */
export function Impresszum() {
  const tarhely = adatfeldolgozok.filter((a) => a.ki.startsWith('Supabase') || a.ki.startsWith('Vercel'));

  return (
    <JogiOldal cim="Impresszum" datummal={false}>
      <Szakasz cim="A szolgáltató">
        <dl>
          <Adatsor cimke="Név">{szolgaltato.nev}</Adatsor>
          <Adatsor cimke="Székhely">{szolgaltato.szekhely}</Adatsor>
          <Adatsor cimke="Nyilvántartásba vevő hatóság">{szolgaltato.hatosag}</Adatsor>
          <Adatsor cimke="Nyilvántartási szám">{szolgaltato.nyilvantartasiSzam}</Adatsor>
          <Adatsor cimke="Adószám">{szolgaltato.adoszam}</Adatsor>
          <Adatsor cimke="Kamarai regisztráció">
            {szolgaltato.kamara}
            <br />
            {szolgaltato.kamaraCim}
          </Adatsor>
          <Adatsor cimke="E-mail">
            <a className="underline" href={`mailto:${szolgaltato.email}`}>
              {szolgaltato.email}
            </a>
          </Adatsor>
          <Adatsor cimke="Telefon">
            <a className="underline" href={`tel:${szolgaltato.telefonHivas}`}>
              {szolgaltato.telefon}
            </a>
          </Adatsor>
          <Adatsor cimke="Weboldal">{szolgaltato.weboldal}</Adatsor>
        </dl>
      </Szakasz>

      <Szakasz cim="A szolgáltatás">
        <P>
          A SzámlaFolyó a {szolgaltato.weboldal} címen elérhető online szolgáltatás: bejövő
          számlákat és bizonylatokat olvas ki gépi úton, és könyvelésre alkalmas formában ad
          tovább.
        </P>
        <P>
          A szolgáltatást kizárólag vállalkozások vehetik igénybe. A használat feltételeit az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF
          </Link>
          , a személyes adatok kezelését az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató
          </Link>{' '}
          tartalmazza.
        </P>
      </Szakasz>

      <Szakasz cim="Tárhely és üzemeltetés">
        <P>
          A Szolgáltatás kiszolgálását és adattárolását az alábbi szolgáltatók végzik. Az
          elérhetőségük a saját oldalukon megadott adatvédelmi és kapcsolattartási címük.
        </P>
        <dl>
          {tarhely.map((a) => (
            <Adatsor key={a.ki} cimke={a.ki}>
              {a.jogiSzemely ?? a.ki}
              {a.szekhely !== null && (
                <>
                  <br />
                  {a.szekhely}
                </>
              )}
              <br />
              {a.mit} — {a.hol}
              <br />
              <a
                className="underline"
                href={a.garanciaUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                adatvédelmi feltételek és kapcsolat
              </a>
            </Adatsor>
          ))}
        </dl>
        <P>
          Az adatbázis és a bizonylatok fájljai az Európai Unión belül, frankfurti kiszolgálón
          tárolódnak. A gépi kiolvasás és a fizetés viszont Unión kívüli közreműködőkkel jár; a
          teljes felsorolás — székhellyel, feladattal és feldolgozási országgal — az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató 5. pontjában
          </Link>{' '}
          található.
        </P>
      </Szakasz>

      <Szakasz cim="Panasz és vitarendezés">
        <P>
          Panaszt a fenti e-mail címen lehet bejelenteni. A panaszt megvizsgáljuk, és legkésőbb
          harminc napon belül írásban válaszolunk.
        </P>
        <P>
          A Szolgáltatást kizárólag vállalkozások vehetik igénybe, ezért a fogyasztókat megillető
          elállási jog nem alkalmazandó.{' '}
          <strong>
            A békéltető testületi eljárást azonban nem zárjuk ki pusztán arra hivatkozva, hogy az
            ügyfél vállalkozás
          </strong>
          : a fogyasztóvédelmi törvény fogyasztó-fogalma bizonyos kis- és középvállalkozásokat is
          lefed. Ha az Előfizető e körbe tartozik, az illetékes békéltető testület a Szolgáltató
          székhelye szerinti kereskedelmi és iparkamara mellett működik —{' '}
          {szolgaltato.kamara}, {szolgaltato.kamaraCim}. Az adatvédelmi tárgyú panaszokról az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató 8. pontja
          </Link>{' '}
          szól. Egyebekben a vitákra az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF
          </Link>{' '}
          rendelkezései irányadók.
        </P>
      </Szakasz>

      <Szakasz cim="Szerzői jog">
        <P>
          A {szolgaltato.weboldal} oldalon megjelenő tartalom, a SzámlaFolyó név, a logó és a
          szolgáltatást működtető szoftver a szolgáltató szellemi tulajdona. Felhasználásukhoz
          előzetes írásbeli engedély szükséges.
        </P>
      </Szakasz>
    </JogiOldal>
  );
}
