import { Link } from 'react-router-dom';
import { LogoSor } from '../komponensek/Logo.tsx';
import { FejlesztesAlattSav } from '../komponensek/FejlesztesAlatt.tsx';
import { regisztracioNyitva } from '../lib/kornyezet.ts';

/**
 * A nyitólap — egyelőre a **belépő**, nem a termék arca.
 *
 * # Miért van külön fájlban egy ilyen rövid oldal
 *
 * Mert a helyére a 2. mérföldkőben a valódi nyitólap kerül, a jogi oldalakkal
 * együtt. Akkor **ezt az egy fájlt** kell leváltani, nem az útvonaltáblából
 * kibontani egy helyőrzőt.
 *
 * # Amit az elődje rosszul csinált
 *
 * Az `App.tsx`-ben ülő `Vazlat` helyőrző azt írta ki, hogy „ez az oldal még nem
 * készült el" — és **egyetlen linket sem** adott. Ez nem hiányos oldal volt,
 * hanem zsákutca: a látogató a főoldalról nem jutott el a bejelentkezésig.
 * Egy helyőrzőnek is van egy kötelessége: mondja meg, merre van tovább.
 *
 * A mondat szándékosan ugyanaz, ami az `index.html` `<meta name="description">`
 * sorában áll. Egy ígéret ne létezzen két, lassan széttartó változatban.
 */
export function Nyitolap() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <LogoSor jel="h-10 w-10" szoveg="text-3xl" className="mb-6" />

      <FejlesztesAlattSav />

      <div className="card card-pad">
        <h1 className="text-lg font-semibold text-slate-900">
          A legrövidebb út a bizonylattól a könyvelésig
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Töltsd fel a számlát, a SzámlaFolyó kiolvassa, te pedig csak azt ellenőrzöd, amiben nem
          biztos.
        </p>

        <div className="mt-5">
          <Link to="/bejelentkezes" className="btn btn-primary w-full">
            Bejelentkezés
          </Link>
        </div>

        {/*
          Ugyanaz a szabály, ami a `Bejelentkezes.tsx`-ben: amíg a nyilvános
          regisztráció zárva, nem kínálunk föl egy ajtót, ami mögött a
          „nem lehet fiókot nyitni" üzenet vár. Egy viselkedés, két helyen.
        */}
        {regisztracioNyitva && (
          <p className="mt-4 text-center text-sm text-slate-500">
            Még nincs fiókod?{' '}
            <Link to="/regisztracio" className="font-medium text-blue-700 hover:underline">
              Regisztrálok
            </Link>
          </p>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        <Link to="/aszf" className="hover:underline">
          ÁSZF
        </Link>
        {' · '}
        <Link to="/adatkezeles" className="hover:underline">
          Adatkezelés
        </Link>
        {' · '}
        <Link to="/impresszum" className="hover:underline">
          Impresszum
        </Link>
      </p>
    </div>
  );
}
