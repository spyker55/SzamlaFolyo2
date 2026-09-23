/**
 * A Supabase hitelesítési hibái magyarul.
 *
 * # Miért van erre szükség
 *
 * A `supabase.auth.*` hívások hibaüzenete **angol platformszöveg**, és a
 * `Regisztracio.tsx` eddig nyersen kiírta. Egy magyar termék nyilvános
 * regisztrációján így jelent meg például a *„Password is known to be weak and
 * easy to guess"* mondat.
 *
 * Ez ugyanaz a hibaosztály, amit a `signup_disabled`-nél már egyszer
 * megfogtunk: nem hiba keletkezik, hanem **egy idegen hangon megszólaló
 * termék**. A javítás iránya is ugyanaz — a platform üzenete ne érjen földet a
 * felhasználónál.
 *
 * # Miért `null` az ismeretlen hibára
 *
 * Mert a jó fallback **képernyőnként más**. A `JelszoBeallitas`-on a hibák
 * túlnyomó része tényleg lejárt link, ott az a mondat a helyes tartalék; a
 * regisztráción egy általános mondat. Ha ez a modul találna ki egy közös
 * mondatot, az egyik helyen biztosan félrevezetne — és pont ez volt a
 * `JelszoBeallitas` eddigi baja, fordítva: **minden** hibát „lejárt a link"-nek
 * mondott, a gyenge jelszót is.
 *
 * # Kódra mérünk, nem szövegre
 *
 * A `code` stabil, az üzenet szövege bármikor változhat a szolgáltatónál. A
 * szövegre illesztés csak **tartalék** azokra a régebbi kiadásokra, amelyek
 * még nem küldenek kódot — ugyanaz a rétegezés, mint a
 * `regisztracioTiltott()`-ban.
 *
 * ⚠️ A `signup_disabled` szándékosan **nincs** itt. Azt a `Regisztracio.tsx`
 * előbb fogja el, és nem hibasávot mutat, hanem a zárt képernyőt — egy
 * mondattá fokozva a felhasználó rosszabbul járna.
 */

/** Amit egy Supabase-hibából olvasunk. A `reasons` az `AuthWeakPasswordError`-é. */
export type AuthHibaAlak = {
  code?: string | undefined;
  status?: number | undefined;
  message: string;
  reasons?: readonly string[] | undefined;
};

const SZIVARGAS =
  'Ez a jelszó szerepel egy nyilvános adatszivárgásban, ezért nem fogadjuk el. Válassz másikat.';

/** ⚠️ Szám nélkül: a szerver küszöbét a böngésző nem ismeri (lásd a fejlécet). */
const ROVID = 'A jelszó túl rövid. Válassz hosszabbat.';

const GYENGE = 'Ez a jelszó túl gyenge. Válassz olyat, amit más nem találna ki.';

const KORLAT = 'Túl sok kérés érkezett rövid idő alatt. Próbáld újra néhány perc múlva.';

const LEJART = 'A link lejárt, vagy már felhasználták. Kérj újat.';

/**
 * ⚠️ Feltételes fogalmazás, szándékosan. A Supabase nem árulja el, hogy egy cím
 * regisztrált-e (cím-kitalálás elleni védelem). Ha ez a mondat kimondaná, hogy
 * „ezzel a címmel már van fiók", azt a védelmet mi gyengítenénk el.
 */
const FOGLALT =
  'Ha ezzel a címmel már van fiókod, lépj be – vagy kérj új jelszót a bejelentkezésnél.';

/** A `weak_password` hiba oka dönti el a mondatot. */
function jelszoUzenet(hiba: AuthHibaAlak): string {
  const okok = hiba.reasons ?? [];

  // A szivárgás erősebb hír a hossznál: ha mindkettő igaz, azt mondjuk ki.
  if (okok.includes('pwned')) return SZIVARGAS;
  if (okok.includes('length')) return ROVID;

  return GYENGE;
}

/** Magyar mondat a hibához, vagy `null`, ha nem ismerjük fel. */
export function magyarAuthHiba(hiba: AuthHibaAlak): string | null {
  switch (hiba.code) {
    case 'weak_password':
      return jelszoUzenet(hiba);

    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return KORLAT;

    case 'otp_expired':
    case 'session_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'bad_jwt':
      return LEJART;

    case 'email_exists':
    case 'user_already_exists':
      return FOGLALT;

    case 'email_not_confirmed':
      return 'Előbb erősítsd meg az e-mail-címedet: a levelet a regisztrációkor küldtük ki.';

    case 'email_address_invalid':
      return 'Ez az e-mail cím nem tűnik érvényesnek. Nézd meg, nem gépelted-e el.';

    case 'same_password':
      return 'Ez ugyanaz a jelszó, ami eddig volt. Adj meg egy másikat.';

    default:
      break;
  }

  // Tartalék a kód nélküli, régebbi kiadásokra. Csak a jelszóra illesztünk:
  // ott a legnagyobb a kár, ha angol mondat ér földet, és ott a legszűkebb a
  // szöveg, amire biztonságosan lehet illeszteni.
  if (/data breach|pwned|known to be weak/i.test(hiba.message)) return SZIVARGAS;
  if (/password.*(at least|too short)/i.test(hiba.message)) return ROVID;

  return null;
}
