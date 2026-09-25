import { Link } from 'react-router-dom';
import { Adatsor, JogiOldal, P, Szakasz } from './JogiOldal.tsx';
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
 *
 * # 2026. szeptember 25. — rövidebb, tárgyszerűbb (2026-09-25-3)
 *
 * A tulajdonos kérése: a látogató gyorsan találja meg, ki működteti a
 * szolgáltatást, hogyan éri el, és hová fordulhat. A bírálat négy pontja:
 *
 * - **Békéltető testület:** a régi +36 46 501-090 helyett két szám (új ügy:
 *   501-091, folyamatban lévő ügy: 501-871) és a bekeltetes@bokik.hu.
 * - **Tárhelyszolgáltatók:** látható adatvédelmi e-mail-cím a link mellett
 *   (Ektv. 4. §), a szolgáltatók saját DPA-jából (`adatvedelmiEmail`).
 * - **Békéltetés feltételesen:** a KKV csak meghatározott ügyekben minősül
 *   fogyasztónak (Fgytv. 2. § 10.), egy előfizetési vitára ez nem automatikus.
 *   A regionális rendszer ismételt magyarázata és a ⚠️ kikerült.
 * - **Szerzői jog:** a külső elemek licencei és a törvény által megengedett
 *   felhasználás is ki van mondva.
 *
 * A „könyvelésre alkalmas formában" fordulat is kikerült: az ÁSZF 3. pontja
 * 2026-09-25 óta „ellenőrzésre előkészített" adatról beszél.
 */
export function Impresszum() {
  const tarhely = adatfeldolgozok.filter((a) => a.ki.startsWith('Supabase') || a.ki.startsWith('Vercel'));
  const t = bekeltetoTestulet;
  const alcim = 'pt-2 text-base font-semibold text-slate-800';

  return (
    <JogiOldal cim="Impresszum" datummal={false}>
      <Szakasz cim="A szolgáltató adatai">
        <P>A SzámlaFolyó weboldal és az online szolgáltatás üzemeltetője:</P>
        <dl>
          <Adatsor cimke="Név">{szolgaltato.nev}</Adatsor>
          <Adatsor cimke="Székhely">{szolgaltato.szekhely}</Adatsor>
          <Adatsor cimke="Nyilvántartásba vevő hatóság">{szolgaltato.hatosag}</Adatsor>
          <Adatsor cimke="Nyilvántartási szám">{szolgaltato.nyilvantartasiSzam}</Adatsor>
          <Adatsor cimke="Adószám">{szolgaltato.adoszam}</Adatsor>
          <Adatsor cimke="Kamarai regisztráció">{szolgaltato.kamara}</Adatsor>
          <Adatsor cimke="Kamara címe">{szolgaltato.kamaraCim}</Adatsor>
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
          <Adatsor cimke="Weboldal">
            <a className="underline" href={`https://${szolgaltato.weboldal}/`}>
              {szolgaltato.weboldal}
            </a>
          </Adatsor>
        </dl>
      </Szakasz>

      <Szakasz cim="A szolgáltatásról">
        <P>
          A SzámlaFolyó vállalkozásoknak és könyvelőknek készült online számlafeldolgozó
          szolgáltatás. Kiolvassa a beküldött számlák és bizonylatok adatait, lehetőséget ad
          azok ellenőrzésére, majd a támogatott formátumokban exportot készít a könyvelési
          munkához.
        </P>
        <P>
          A szolgáltatást kizárólag vállalkozások vehetik igénybe, üzleti tevékenységükhöz
          kapcsolódóan.
        </P>
        <P>
          A használat részletes feltételeit az{' '}
          <Link to="/aszf" className="underline">
            Általános szerződési feltételek
          </Link>
          , a személyes adatok kezelésére vonatkozó információkat az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató
          </Link>{' '}
          tartalmazza.
        </P>
      </Szakasz>

      <Szakasz cim="Tárhely és technikai üzemeltetés">
        <P>A weboldal működését és az adatok tárolását az alábbi szolgáltatók biztosítják.</P>
        {tarhely.map((a) => (
          <div key={a.ki}>
            <h3 className={alcim}>{a.ki}</h3>
            <dl>
              <Adatsor cimke="Szolgáltató">{a.jogiSzemely ?? a.ki}</Adatsor>
              <Adatsor cimke="Cím">{a.szekhely ?? NINCS_SZEKHELY}</Adatsor>
              <Adatsor cimke="Feladat">{a.mit}</Adatsor>
              {a.tarolasiRegio !== undefined && (
                <Adatsor cimke="Adattárolási régió">{a.tarolasiRegio}</Adatsor>
              )}
              {a.adatvedelmiEmail !== undefined && (
                <Adatsor cimke="Adatvédelmi kapcsolattartás">
                  <a className="underline" href={`mailto:${a.adatvedelmiEmail}`}>
                    {a.adatvedelmiEmail}
                  </a>
                </Adatsor>
              )}
              <Adatsor cimke="További információ">
                <a
                  className="underline"
                  href={a.garanciaUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {a.ki} adatfeldolgozási feltételek
                </a>
              </Adatsor>
            </dl>
          </div>
        ))}
        <P>
          Az adatbázis és a bizonylatfájlok tárolása Frankfurtban történik. Ez nem jelenti
          azt, hogy a szolgáltatás minden adatfeldolgozási művelete az Európai Unión belül
          zajlik: egyes közreműködők az Unión kívül is feldolgoznak adatokat, vagy
          hozzáférhetnek azokhoz.
        </P>
        <P>
          A további szolgáltatókat, feladataikat és az adattovábbítás feltételeit az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató 5. pontja
          </Link>{' '}
          ismerteti.
        </P>
      </Szakasz>

      <Szakasz cim="Kapcsolat és panaszkezelés">
        <P>
          Ha kérdésed vagy panaszod van a szolgáltatással kapcsolatban, írj az{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címre.
        </P>
        <P>
          A gyorsabb ügyintézéshez add meg a vállalkozásod nevét, a fiókodhoz tartozó
          e-mail-címet és a probléma rövid leírását. Jelszót vagy teljes bankkártyaadatot ne
          küldj.
        </P>
        <P>
          A panaszokat megvizsgáljuk, és a beérkezéstől számított legfeljebb{' '}
          <strong>30 napon belül írásban válaszolunk</strong>.
        </P>
        <P>
          A szolgáltatást üzleti célból igénybe vevő vállalkozások szerződéseire a fogyasztói
          szerződésekhez kapcsolódó, indokolás nélküli elállási jog nem alkalmazandó. Az
          előfizetés lemondásának és a szerződés megszüntetésének feltételeit az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF
          </Link>{' '}
          tartalmazza.
        </P>

        <h3 className={alcim}>Békéltető testületi eljárás</h3>
        <P>
          Ha az adott jogvitában teljesülnek a békéltető testületi eljárás jogszabályi
          feltételei, az ügyfél az illetékes testülethez fordulhat. A kis- vagy
          középvállalkozási minőség önmagában nem tesz minden szerződéses vitát békéltető
          testület előtt rendezhetővé.
        </P>
        <P>
          Az illetékességet főszabály szerint az ügyfél lakóhelye, tartózkodási helye, illetve
          az alkalmazandó szabályok szerinti székhelye határozza meg.
        </P>
        <P>
          {t.illetekesseg} területén a <strong>{t.nev}</strong> jár el.
        </P>
        <dl>
          <Adatsor cimke="Székhely">{t.szekhely}</Adatsor>
          <Adatsor cimke="Levelezési cím">{t.levelcim}</Adatsor>
          <Adatsor cimke="Telefon – új ügyek">
            <a className="underline" href={`tel:${t.telefonUjUgy.replace(/[\s-]/g, '')}`}>
              {t.telefonUjUgy}
            </a>
          </Adatsor>
          <Adatsor cimke="Telefon – folyamatban lévő ügyek">
            <a className="underline" href={`tel:${t.telefonFolyamatban.replace(/[\s-]/g, '')}`}>
              {t.telefonFolyamatban}
            </a>
          </Adatsor>
          <Adatsor cimke="E-mail">
            <a className="underline" href={`mailto:${t.email}`}>
              {t.email}
            </a>
          </Adatsor>
          <Adatsor cimke="Weboldal">
            <a
              className="underline"
              href={`https://${t.weboldal}/`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t.weboldal}
            </a>
          </Adatsor>
        </dl>
        <P>
          Az adatvédelmi panaszokról és jogorvoslati lehetőségekről az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató 8. pontjában
          </Link>{' '}
          olvashatsz. A szerződéses jogvitákra egyebekben az ÁSZF és az alkalmazandó
          jogszabályok rendelkezései irányadók.
        </P>
      </Szakasz>

      <Szakasz cim="Szellemi tulajdon">
        <P>
          A weboldalon található, jogi védelem alatt álló tartalmakhoz, a SzámlaFolyó
          megjelöléshez, a logóhoz és a szolgáltatást működtető szoftverhez kapcsolódó jogok a
          szolgáltatót vagy az adott jogosultat illetik meg.
        </P>
        <P>
          Az ÁSZF, az alkalmazandó licencek vagy a jogszabályok által megengedett
          felhasználáson túl ezek felhasználásához a jogosult előzetes írásbeli engedélye
          szükséges.
        </P>
      </Szakasz>
    </JogiOldal>
  );
}
