# Törlés a Szolgáltató kezéből — és a helyreállítás utáni újratörlés

Ez a mappa két olyan kötelezettséghez való, amit a jogi szövegek vállalnak, de
**nem a felhasználó indít el**, ezért nincs mögötte gomb:

1. **A cég adatainak törlése, amikor a szerződés nem a felhasználó törlésével szűnik
   meg** — a Szolgáltató felmondásakor (ÁSZF 9.) vagy egy szolgáltatóváltás végén
   (ÁSZF 16.). ÁSZF 10.: „a Szolgáltató … törli".
2. **A mentésből való helyreállítás után a már törölt adatok újbóli törlése.**
   Adatkezelési tájékoztató 4. és ÁSZF 10.: a mentést csak teljes helyreállításra
   használjuk, és „a mentés óta törölt ügyféladatok törlését a rendszer újbóli
   megnyitása előtt megismételjük".

Egy ígéret, amihez nincs leírt eljárás, az a hibaosztály, amit ez a projekt végig
irtott. Ez a lap az eljárás.

---

## 1. Cég törlése a Szolgáltató kezéből

A felületi törlést a `fiok-torles` Edge Function végzi — de a **bejelentkezett
felhasználó nevében**, tehát a Szolgáltató nem tudja elindítani helyette. Kézzel
ugyanazt a sorrendet kell követni, és a sorrend nem ízlés dolga:

| # | Lépés | Hol | Miért ebben a sorrendben |
|---|---|---|---|
| 1 | **Azonosítsd a céget.** `select id, name, tax_number, stripe_subscription_id from public.companies where …;` | Supabase SQL Editor | Egy elgépelt azonosító egy másik ügyfél adatait vinné el. Kétszer olvasd el. |
| 2 | **Mondd le az előfizetést**, ha van (`stripe_subscription_id` nem `null`): azonnali lemondás, arányosítás nélkül. | Stripe dashboard → Customers | Előbb a pénz: ha a törlés utána félbemaradna, egy törölt cég ne fizessen tovább. |
| 3 | **Ürítsd a cég két mappáját** a `bizonylatok` és az `exportok` bucketben: `<cég-azonosító>/`. | Supabase dashboard → Storage | ⚠️ SQL-lel **nem megy**: a `storage.objects` táblán `protect_objects_delete` trigger áll (mérve, 2026-09-23). A fájl a mappa kiürítésével tűnik el. |
| 4 | **Töröld a cégsort:** `delete from public.companies where id = '<cég-azonosító>';` | SQL Editor | A cégfüggő táblák kaszkáddal mennek. Az **ÁSZF-elfogadás bizonyítéka marad** (`terms_acceptances`, a cég nevével és adószámával), öt évig — ez szándékos, lásd a `20260923000400` migrációt. |
| 5 | **A tagok fiókja** cég nélkül marad. Nem kell kézzel törölni: a napi takarítás 180 nap belépés nélkül törli. Ha valamelyik tag kéri, a felületről maga is törölheti. | — | A fiók a felhasználóé, nem a cégé. |
| 6 | **Jegyezd fel** a cég azonosítóját és a törlés napját a „Helyreállítás" listához (lent). | saját jegyzet | A kézi törlésről a `fiok-torles` naplója nem tud. |

---

## 2. Helyreállítás mentésből — és ami utána kötelező

A Pro csomagon a Supabase **napi mentést** készít, és **hét napig** őrzi (PITR nincs
bekapcsolva). A helyreállítás a **teljes adatbázist** a mentés állapotára állítja vissza —
vagyis minden, ami a mentés óta törlődött, **újra megjelenik**: törölt cégek, törölt
fiókok.

⚠️ **Ezt az adatbázisból nem lehet kideríteni**, mert az adatbázis maga áll vissza a
mentés állapotára, vele minden benne tárolt nyom. A törlések egyetlen, az adatbázison
kívüli nyoma a `fiok-torles` függvény naplója:

```json
{"esemeny":"ceg_torolve","ceg":"<uuid>"}
{"esemeny":"fiok_torolve","felhasznalo":"<uuid>"}
```

Csak azonosító, személyes adat nélkül (2026-09-23 óta).

### Az eljárás

1. **Mielőtt bármit visszaállítasz**, mentsd ki a listát: a Supabase dashboard →
   Edge Functions → `fiok-torles` → Logs, szűrés: `ceg_torolve` és `fiok_torolve`,
   időablak: a választott mentés időpontjától máig. ⚠️ **A napló is hét napig
   él** a Pro csomagon — ugyanannyi ideig, mint a legrégebbi mentés. Ha a lista
   kimentése a helyreállítás utánra marad, a legrégebbi törlések kieshetnek belőle.
2. Egészítsd ki a listát az 1. szakasz 6. lépésében feljegyzett kézi törlésekkel.
3. **Állítsd vissza** a mentést.
4. **A felhasználói hozzáférés visszanyitása előtt** ismételd meg a törléseket:
   - minden `ceg_torolve` azonosítóra az 1. szakasz 2–4. lépését (a Storage-ot a
     helyreállítás nem hozza vissza, azt tehát csak ellenőrizni kell, hogy üres);
   - minden `fiok_torolve` azonosítóra: Supabase dashboard → Authentication →
     Users → a felhasználó törlése.
5. **A napi takarítás** (`belso.adattakaritas()`) a saját törléseit — inaktív fiókok,
   lejárt meghívók, levélnapló, nyers modellválasz, lejárt ÁSZF-bizonyítékok —
   **magától megismétli** a következő futáskor, mert ugyanazok a feltételek állnak.
   Ha nem akarsz hajnalig várni, futtasd kézzel: `select * from belso.adattakaritas();`

### Amit ez az eljárás nem old meg

A közreműködőknél (Resend, Stripe) keletkezett nyomokat a helyreállítás nem érinti —
azok nem a mi adatbázisunkban vannak.
