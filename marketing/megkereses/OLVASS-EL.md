# Személyes megkeresés – kézikönyv

A szövegek a `SZOVEGEK.md`-ben vannak (gyártott fájl, forrása a `szovegek.ts`).
Ez a fájl arról szól, **kinek, hogyan és mikor** küldd őket.

## Az alapszabály: egyenként, a saját nevedben

Nem kampány, hanem beszélgetés-kezdeményezés. Egy könyvelőiroda 20–100 ügyfél
bizonylatait rögzíti, ezért 2–3 rendszeres irodai felhasználó többet ér, mint
bármelyik hirdetés. Ehhez viszont nem sok levél kell, hanem jó levél jó
embernek.

- Naponta **3–5 megkeresés**, mindegyikben egy valódi `[Személyes mondat]`.
  Például: „A honlapjukon láttam, hogy külföldi ügyfeleik is vannak.” Ha nem
  tudsz személyes mondatot írni, az a jel, hogy nem ő a legjobb címzett.
- **Egy emlékeztető**, kb. egy hét múlva, válaszként az első levélre. Utána
  vége, akkor is, ha nem válaszolt.
- Ha nemet mond vagy leiratkozik: nem keresed többet, és törlöd a
  nyilvántartásodból.

## Jogi keret röviden (nem jogi tanács)

A Grt. 6. §-a szerint reklámot **természetes személynek** e-mailben vagy más
egyéni csatornán csak az **előzetes, kifejezett hozzájárulásával** lehet
küldeni. Az egyéni vállalkozó is természetes személy. Egy szakmai
összefoglaló szerint a **nem természetes személy** (Kft., Bt.) központi, nyilvánosan
közzétett címére (pl. `iroda@…` a honlapjukon) hozzájárulás nélkül is mehet
célzott megkeresés. Ez a kivétel a természetes személyek által közzétett
címekre nem vonatkozik. A törvényszöveget innen nem tudtam ellenőrizni (a
jogszabály- és a hatósági oldalak nem elérhetők ebből a környezetből), ezért
az első éles kör előtt érdemes megkérdezni az ügyvédet.

Ebből a gyakorlat:

| Címzett | Mehet? |
|---|---|
| Kft./Bt. iroda, a honlapjukon közzétett általános címe | Igen, egyenként, a kiszállás mondatával (benne van a levélben). |
| Munkatárs személyes céges címe (pl. `kovacs.anna@iroda.hu`) | Inkább ne; kérdezd az iroda általános címén. |
| Egyéni vállalkozó könyvelő | Csak ha ő kezdeményezett, vagy személyesen ismeritek egymást (rendezvény, ajánlás). |
| LinkedIn-kapcsolatkérés | A jegyzet nem reklám, hanem kapcsolódási kérés. Az első termékes üzenet csak elfogadás után menjen. |
| Vásárolt vagy összegyűjtött címlista | **Nem.** GDPR-ügy is. |

A nyilvántartásod (kit, mikor, mit válaszolt) a **saját táblázatodban** legyen,
ne a repóban. Csak a szükséges adatot tartsd benne, és töröld, akitől nem jött
válasz, ha a kör lezárult.

## LinkedIn

- Ingyenes fiókkal havonta csak kb. **10 személyre szabott jegyzet** küldhető,
  és egy jegyzet legfeljebb **200 karakter** (prémiumnál 300). A jegyzet hosszát
  hosszú névvel számolva az őr méri, és a `SZOVEGEK.md` kiírja.
- A 10-es keret után jegyzet nélkül kérd a kapcsolatot, és elfogadás után küldd
  az „első üzenet” szövegét.
- Keresés: „könyvelő” + a város vagy a megye; előnyben az irodatulajdonosok és
  az irodavezetők.

## Facebook-csoportok

- **Előbb olvasd el a csoport szabályait.** Sok helyen tilos a reklám, máshol
  csak kijelölt napon lehet. A bejegyzések ezért hasznos tartalommal kezdenek,
  és mindegyik nyíltan kimondja: „a SzámlaFolyót én fejlesztem”. Burkolt reklám
  nem lehet, és a csoport is jobban fogadja az őszinte bemutatkozást.
- **Ugyanazt a bejegyzést ne tedd ki sok csoportba ugyanazon a napon.** A
  Facebook ezt spamnek nézheti. Egy csoport, egy hét, egy bejegyzés.
- **Válaszolj a kommentekre**, lehetőleg még aznap. Ha az árra kérdeznek, ott
  a kész válasz a `SZOVEGEK.md` végén.
- Melyiket hova: `3-export` könyvelői csoportokba, `2-email` vállalkozói
  csoportokba, az `1-xml` és a `4-ellenorzes` mindkettőbe.

## A 10 perces bemutató

A vázlat a `SZOVEGEK.md`-ben van. Két tanács hozzá:
- Az első percben kérdezz, és a 4. lépésben az ő könyvelőprogramjának exportját
  mutasd.
- Egy teszt-munkaterületen, **kitalált** mintabizonylatokkal mutasd, ne valódi
  ügyfél adataival.

## Mérés

Webes analitika nincs, a mérőműszer a „Honnan hallottál rólunk?” mező a
cégalapításnál. Ebből a körből:
- `konyvelo`: az iroda ügyfele, akinek a könyvelő ajánlotta;
- `facebook`: a csoportbejegyzésekből;
- `egyeb`: ide esik ma a LinkedIn. Ha az lesz a fő csatorna, külön kódot kap
  (a `shared/uzleti/forras.ts`, az adatbázis-kényszer és a `forras.test.ts`
  együtt változik).

## Szöveg módosítása

1. `szovegek.ts` szerkesztése.
2. `npx vite-node marketing/megkereses/keszit.ts`.
3. `npx vitest run marketing/megkereses`: méri a hosszakat, a tiltott
   ígéreteket, a config-számokat, a helyőrzőket és a linkeket.
