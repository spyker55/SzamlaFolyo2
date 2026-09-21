# Migrációk — olvasd el, mielőtt `db push`-t írnál

Ebben a projektben a migrációk **nem a Supabase CLI-n át mentek ki**, az Edge
Functionök viszont igen. Ugyanaz az eszköz, két különböző út — és ez a lap
azért van, hogy ez ne egy éles adatbázison derüljön ki.

## A tény, amiből minden következik

A migrációkat az MCP `apply_migration` hívása alkalmazta, ami **saját
időbélyeget** ad nekik. Ezért:

| | Mérve (2026-09-21) |
|---|---|
| migrációs fájl a repóban | **25** |
| sor a `supabase_migrations.schema_migrations` táblában | **26** |
| ebből olyan, aminek a verziószáma egy repóbeli fájllal egyezik | **0** |

Nulla. A CLI szemszögéből tehát a repó **mind a 25 migrációja „még nem futott
le"** — miközben a valóságban mindegyik tartalma ott van az adatbázisban.

*(A 26 és a 25 különbsége nem hiány: a `keret` migráció két lépésben ment ki,
tehát két sort hagyott a nyilvántartásban.)*

## Mi történne egy `supabase db push`-sal

Megpróbálná alkalmazni mind a 25-öt az élesre, és **az elsőnél elhasalna**: az
`20260912000100_alap.sql` kilenc `create table` utasítást tartalmaz, és
egyiken sincs `if not exists` (mérve). A meglévő tábla miatt hibát dob, és
megáll.

Vagyis a valószínű kimenetel egy zajos leállás, nem adatvesztés — de erre
nem támaszkodunk, mert a védelem itt véletlen, nem szándék. Egy jövőbeli
migráció, ami `create or replace`-szel kezdődik, ezt a féket csendben
kiütné.

> A lánc adatot módosító utasításai szűkítettek (a `20260915000100`
> `update`-je például `where auto_jovahagyas_be`-vel), tehát egy visszajátszás
> a mai adatokon nem írna felül élő beállítást. Ez megnyugtató, de nem érv:
> egy fizető ügyfél adatán nem futtatunk olyat, aminek a biztonsága egy
> `where` záradék véletlenén múlik.

**A szabály tehát:** migráció az MCP-n vagy az SQL-szerkesztőn át megy ki.
A CLI ebben a projektben az Edge Functionöké (`supabase functions deploy`,
`config.toml`) — és **csak azoké**.

## Akkor mire jó a verziószám?

Egyetlen dologra, és az nem kevés: ez a **visszajátszás sorrendje** egy friss
adatbázison — `supabase db reset`, egy új branch, vagy egy katasztrófa utáni
újraépítés. Az élő adatbázis állapota erről **semmit nem mond**, ezért ez a
fajta hiba csendes: évekig nem jelez, aztán pont a legrosszabb pillanatban.

A fájlnevek sorrendje ezért a **tényleges alkalmazási sorrendet** követi, nem
azt, hogy melyik fájl mikor született.

## A két őr

Mindkettő a migrációs fájlokból olvas, nem kézzel karbantartott listából:

| Fájl | Mit mér |
|---|---|
| `politikanevek.test.ts` | a lánc *tartalma* lejátszható-e — minden nevesített `drop policy` létező politikára mutat |
| `verziok.test.ts` | a lánc *sorba rendezhető-e* — minden verziószám egyedi és a várt alakú |

A második 2026-09-21-én született, és **pirosan indult**: két fájlpár ugyanazt
a verziószámot viselte (`20260920000100` és `20260921000100`). A CLI a
számelőtagra kulcsol, tehát az egyik fájl lefutása a másikat is „lefutottnak"
jelenthette volna — és a kimaradt migráció némán hiányzott volna a friss
adatbázisból.

## Ha valaha össze akarjuk hangolni a kettőt

Lehetséges: a repó verziószámait be lehet írni a
`supabase_migrations.schema_migrations` táblába, és onnantól a `db push`
használható lenne. **Ez külön kör**, és nem melléktermék — a nyilvántartás
átírása pont az a művelet, ami elrontva egy teljes újrajátszást enged rá az
élesre. Addig az itt leírt szabály él.
