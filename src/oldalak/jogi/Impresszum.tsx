import { Link } from 'react-router-dom';
import { Adatsor, JogiOldal, Lista, P, Szakasz } from './JogiOldal.tsx';
import { adatfeldolgozok, bekeltetoTestulet, NINCS_SZEKHELY, szolgaltato } from './adatok.ts';

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
              <br />
              {a.szekhely ?? NINCS_SZEKHELY}
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
          tárolódnak. <strong>Több közreműködő azonban az Unión kívül dolgozza fel az adatot, vagy
          fér hozzá:</strong> a tárhelyszolgáltató szerződő fele szingapúri, és Unión kívül
          történik a gépi kiolvasás, a fizetés, a levelezés és magának a weboldalnak a
          kiszolgálása is. A teljes felsorolás — jogi személlyel, székhellyel (ahol a szerződés
          megadja), feladattal, feldolgozási országgal és a továbbítás alapjával — az{' '}
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
          lefed — önmagában a KKV-minőség azonban nem elég hozzá.
        </P>
        <P>
          <strong>Melyik testület illetékes.</strong> Főszabály szerint az a békéltető testület,
          amelynek illetékességi területén a fogyasztónak minősülő ügyfél lakóhelye vagy
          tartózkodási helye — nem természetes személy esetén a székhelye — található. Nem
          minden ügyfélre ugyanaz a testület illetékes, és ez nem a Szolgáltató székhelyétől
          függ. A <strong>Borsod-Abaúj-Zemplén, Heves és Nógrád</strong> vármegyei
          illetékességi területen a <strong>{bekeltetoTestulet.nev}</strong> jár el:
        </P>
        <Lista>
          <li>Székhely: {bekeltetoTestulet.szekhely}</li>
          <li>Levelezési cím: {bekeltetoTestulet.levelcim}</li>
          <li>Telefon: {bekeltetoTestulet.telefon}</li>
          <li>
            Weboldal:{' '}
            <a
              className="underline"
              href={`https://${bekeltetoTestulet.weboldal}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {bekeltetoTestulet.weboldal}
            </a>
          </li>
          <li>Illetékességi területe: {bekeltetoTestulet.illetekesseg}</li>
        </Lista>
        <P>
          ⚠️ A békéltető testületek 2024. január 1-je óta <strong>regionális</strong> alapon
          működnek, és az illetékesség az ügyfél lakóhelyéhez, tartózkodási helyéhez vagy
          székhelyéhez igazodik — nem a Szolgáltatóéhoz, és nem a Szolgáltató kamarai
          tagságához. Az utóbbi külön kérdés: az a fenti {szolgaltato.kamara}.
        </P>
        <P>
          Az adatvédelmi tárgyú panaszokról az{' '}
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
