# SzámlaFolyó – megkeresési szövegek

> ⚙️ **Gyártott fájl, kézzel ne szerkeszd.** Forrás: `marketing/megkereses/szovegek.ts`,
> újragyártás: `npx vite-node marketing/megkereses/keszit.ts`. Használat és jogi keret:
> `OLVASS-EL.md`.

Helyőrzők, kiküldés előtt cseréld le őket: `[Név]`, `[Személyes mondat]`. A `[Személyes mondat]`
egy mondat arról, miért épp őt keresed (pl. a honlapjukon láttad, hogy külföldi ügyfeleik is vannak).

---

## Könyvelőirodák (magázó)

### LinkedIn – kapcsolatkérés jegyzete _(171/200, a névre 25 karakterrel számolva)_

```text
Jó napot, [Név]! Könyvelőirodáknak fejlesztek bizonylatfeldolgozó eszközt, és sokat tanulnék egy gyakorló könyvelő véleményéből. Szívesen kapcsolódnék.
```

### LinkedIn – első üzenet, ha elfogadta

```text
Köszönöm, hogy visszaigazolt, [Név]!

Röviden arról, amin dolgozom: a SzámlaFolyó az ügyfelektől érkező bizonylatok adatait olvassa ki, a külföldi számlákét, nyugtákét és fotózott blokkokét is. Megjelöli, amit érdemes átnézni, a jóváhagyott tételeket pedig ügyfelenként exportálja az RLB Kettős, a Novitax NTAX vagy a Kulcs-Könyvelés számára.

Egy rövid, feliratos bemutatóvideó itt látható: https://szamlafolyo.hu/konyveloknek#bemutato

Leginkább az érdekelne, hogy egy irodában mi hiányozna belőle. Ha lenne 10 perce, képernyőmegosztással szívesen megmutatom, vagy ki is próbálhatja: 14 nap, 50 dokumentum, 3 felhasználó, bankkártya nélkül.

Üdvözlettel:
Nyeste Krisztián
```

### E-mail – tárgy _(57/60)_

```text
Bizonylatok kiolvasása és export RLB, Novitax, Kulcs felé
```

### E-mail – szöveg

```text
Tisztelt [Név]!

[Személyes mondat]

Nyeste Krisztián vagyok, a SzámlaFolyó fejlesztője. Ez egy online eszköz, amely az ügyfelektől érkező bizonylatok adatait olvassa ki: a külföldi számlákét, a nyugtákét, a fotózott blokkokét és a támogatott e-számla XML-ekét is.

Az Önök irodájában így nézne ki:
• az ügyfél e-mailben továbbítja a bizonylatot a munkaterület saját beküldési címére, vagy Önök töltik fel;
• a rendszer kiolvassa az adatokat, és számítással ellenőrzi az adószám ellenőrző számjegyét, valamint a nettó, az áfa és a bruttó összefüggését;
• alapbeállítás szerint minden bizonylatot egy munkatárs hagy jóvá;
• a jóváhagyott tételek ügyfelenként exportálhatók az RLB Kettős, a Novitax NTAX és a Kulcs-Könyvelés számára, vagy XLSX, CSV és JSON formátumban.

A NAV-ból átvett számlaadatokat nem váltja ki: azok mellett a többi bizonylat feldolgozását segíti.

Egy rövid, feliratos bemutató és egy költségkalkulátor itt található: https://szamlafolyo.hu/konyveloknek

Ha érdekli, 10 percben szívesen megmutatom online, vagy ki is próbálhatják: 14 nap, 50 dokumentum, 3 felhasználó, bankkártya nélkül. Az is sokat segítene, ha megírná, mi hiányzik belőle egy irodai munkafolyamathoz.

Ha nem szeretne több levelet kapni tőlem, elég egy rövid válasz, és nem keresem többet.

Üdvözlettel:
Nyeste Krisztián
SzámlaFolyó · szamlafolyo.hu
info@szamlafolyo.hu · +36 70 604 3043
```

### Emlékeztető – kb. egy hét múlva, egyszer, válaszként az első levélre

```text
Tisztelt [Név]!

Egy héttel ezelőtt írtam a SzámlaFolyóról: az ügyfelektől érkező bizonylatok kiolvasásáról és az RLB, Novitax, Kulcs felé készülő exportról. Tudom, hogy egy könyvelőirodában ritkán van szabad perc, ezért csak most az egyszer jelentkezem újra.

Ha érdekes lehet, a rövid bemutató itt látható: https://szamlafolyo.hu/konyveloknek#bemutato

Ha nem, egy „köszönöm, nem” is teljesen rendben van, és nem keresem többet.

Üdvözlettel:
Nyeste Krisztián
```

### 10 perces bemutató – vázlat neked, nem kiküldésre

**0–1. perc – Előbb kérdezz**
- Milyen bizonylatok jönnek az ügyfelektől, és hogyan: e-mailben, papíron, fotón?
- Melyik könyvelőprogramot használják? A 4. lépésben azt mutasd.

**1–3. perc – Beküldés**
- Feltöltés a felületen: PDF, szkennelt kép, fotó, XML. Az egy fájlba összefűzött bizonylatokat különválasztja.
- A beküldési cím: bekapcsolás, a külső feladók engedélyezése, és a Legutóbbi levelek lista, ahol az elutasított levél oka is látszik.

**3–6. perc – Ellenőrzés és jóváhagyás**
- A kártya: az eredeti bizonylat és a felismert mezők egymás mellett.
- Számítással: az adószám ellenőrző számjegye, nettó + áfa = bruttó, az áfabontás sorai.
- Alapból minden bizonylat jóváhagyásra vár, az automatikus jóváhagyás külön kapcsolható.
- Mondd ki magadtól is: a neveket és a szöveges adatokat érdemes az eredetivel összevetni.

**6–8. perc – Ügyfelenkénti export**
- Szűrés az ügyfél adószáma szerint; a belföldi és a közösségi alakot összerendeli.
- Az ő programjának exportja (RLB Kettős, Novitax NTAX vagy Kulcs-Könyvelés), vagy XLSX, CSV, JSON. Az eredeti fájlok ZIP-ben.

**8–9. perc – Díjak és próba**
- Próba: 14 nap, 50 dokumentum, 3 felhasználó, bankkártya nélkül.
- Start 4 900 Ft (50 dokumentum), Flow 9 900 Ft (200), Pro 19 900 Ft (500) havonta. Végösszegek: a szolgáltató alanyi adómentes, további áfa nincs.
- A kereten felüli feldolgozás alapból ki van kapcsolva; bekapcsolva dokumentumonként 50 Ft, 40 Ft vagy 30 Ft, kötelező költési korláttal.
- A kalkulátor az ügyfélszámból és a havi bizonylatszámból becsül: https://szamlafolyo.hu/konyveloknek#kalkulator

**9–10. perc – Kérdezz vissza**
- Mi hiányzik ahhoz, hogy egy ügyfélen kipróbálják?
- Rákérdezhetsz-e egy hét múlva?

---

## Facebook-csoportok (tegező)

### 1-xml – Vállalkozói és könyvelői csoportok

```text
Tudtad, hogy az e-számlát nem kell begépelni, sőt kiolvastatni sem?

Egyre több szállító küld e-számlát XML-ben, például UBL, Factur-X vagy ZUGFeRD formátumban. Ebben az adat strukturáltan benne van: a szállító rendszere írta ki, nem egy képből kell kitalálni.

Két dolog, amit érdemes tudni:
• A Factur-X és a ZUGFeRD kívülről sima PDF, de a fájlba ágyazva ott van az XML is.
• Ha a PDF mellé külön XML is érkezik, azt is tedd el: abban géppel olvasható alakban van ugyanaz az adat.

Nyíltan jelzem: a SzámlaFolyót én fejlesztem. A támogatott XML-formátumokból közvetlenül, képfelismerés nélkül veszi át az adatokat, a fotózott és szkennelt bizonylatokat pedig mesterséges intelligencia olvassa ki. Ha kíváncsi vagy: https://szamlafolyo.hu

Te hogyan kezeled most az XML-es számlákat?
```

### 2-email – Vállalkozói csoportok

```text
Hány kattintás, mire egy e-mailben érkezett számla eljut a könyvelőhöz?

Letöltés, átnevezés, mappába húzás, feltöltés vagy továbbküldés. Egyenként nem sok, de havonta összeadódik.

Két egyszerűsítés, eszköztől függetlenül:
• Legyen külön postafiók vagy címke a bejövő számláknak, és a szállítóknak ezt add meg számlázási címként.
• A levelezőben egy szűrővel a PDF-mellékletes számlákat automatikusan felcímkézheted, így nem vesznek el a többi levél között.

Nyíltan jelzem: a SzámlaFolyót én fejlesztem. Ott a munkaterületed saját beküldési e-mail-címet kaphat: ha oda továbbítod a számlát, a melléklet a Beérkezőbe kerül, a rendszer kiolvassa az adatokat, te pedig átnézed és jóváhagyod. A beküldés alapból ki van kapcsolva, és a cím bármikor lecserélhető. https://szamlafolyo.hu

Nálad hogyan jut el a számla a könyvelőhöz?
```

### 3-export – Könyvelői csoportok

```text
Kérdés könyvelőknek: mennyi idő megy el azokra a bizonylatokra, amelyek nincsenek benne a NAV-os adatokban?

Külföldi számlák, nyugták, fotózott blokkok. A NAV-ból átvett számlaadatok sok kézi munkát megtakarítanak, ezeket viszont továbbra is valakinek rögzítenie kell.

Nyíltan jelzem: a SzámlaFolyót én fejlesztem. Pont erre készült: kiolvassa a beküldött bizonylatok adatait, megjelöli, amit érdemes átnézni, a jóváhagyott tételeket pedig ügyfelenként exportálja az RLB Kettős, a Novitax NTAX és a Kulcs-Könyvelés számára, vagy XLSX, CSV és JSON formátumban. Az eredeti fájlok ZIP-ben is letölthetők.

A NAV-adatokat nem váltja ki, azok mellett a többi bizonylatra való. A könyvelőknek szóló oldalon van egy rövid, feliratos bemutató és egy költségkalkulátor: https://szamlafolyo.hu/konyveloknek

Őszintén érdekelne: nálatok mi hiányozna belőle?
```

### 4-ellenorzes – Vállalkozói és könyvelői csoportok

```text
„És mi van, ha rosszul olvassa ki?”

Ez az első kérdés, ha gépi számlakiolvasásról van szó, és jogos. Néhány dolgot számítással is lehet ellenőrizni, akármilyen eszközt használsz:

• A magyar adószám törzsszámának 8. számjegye ellenőrző számjegy: a többiből kiszámolható, így egy elgépelés többnyire kiderül.
• A nettó és az áfa összege kiadja-e a bruttót.
• Az áfabontás sorai kiadják-e a végösszeget.

Amit viszont számítással nem lehet ellenőrizni: a neveket, címeket és más szöveges adatokat. Ezeket érdemes az eredetivel összevetni.

Nyíltan jelzem: a SzámlaFolyót én fejlesztem. Ezeket az ellenőrzéseket elvégzi, és megjelöli, ahol eltérést talál. Alapbeállítás szerint minden bizonylat a te jóváhagyásodra vár, és csak a jóváhagyott tétel kerül exportba. https://szamlafolyo.hu

Te mit nézel meg elsőként egy beérkezett számlán?
```

### Kész válasz, ha az árra kérdeznek

```text
Havi 4 900 Ft-tól: Start 50 dokumentum 4 900 Ft, Flow 200 dokumentum 9 900 Ft, Pro 500 dokumentum 19 900 Ft havonta. Ezek végösszegek: a szolgáltató alanyi adómentes, az árakra nem kerül további áfa. Előtte 14 napos ingyenes próba, 50 dokumentumig, bankkártya nélkül. Könyvelőirodáknak kalkulátor is van: https://szamlafolyo.hu/konyveloknek#kalkulator
```
