# `meghivo-fiok` — fiók nyitása meghívóra

A kolléga fiókja akkor is elkészüljön, ha a **nyilvános regisztráció zárva van**.

## Miért létezik

A `VITE_REGISZTRACIO_NYITVA=false` csak a képernyőt zárja. A publikálható kulcs
benne van a böngészőbe letöltött JS-ben, tehát nyitott `signup` mellett bárki
fiókot nyithat közvetlenül az API-n. A valódi zár a Supabase
**„Allow new users to sign up"** kapcsolója.

Csakhogy az nem tesz különbséget meghívott és idegen között: bekapcsolva a
meghívott `supabase.auth.signUp()` hívását is elutasítja. A kettő így kizárta
egymást — vagy nyitva a kapu mindenkinek, vagy a meghívás sem működik.

Ez a függvény bontja szét a kettőt.

## A lánc

```
Meghivo.tsx „Fiókot készítek"
  → meghivosFiok(jel, jelszo)            src/lib/meghivo.ts
    → POST /functions/v1/meghivo-fiok
      → company_invites olvasás (service_role, a jel alapján)
      → él-e a meghívó?  (visszavont / elfogadott / lejárt → 409)
      → auth.admin.createUser(cím a MEGHÍVÓBÓL, email_confirm: true)
    → supabase.auth.signInWithPassword()
  → onAuthStateChange → a képernyő az elfogadó gombra vált
  → meghivot_elfogad()                   ← a négy kaput TOVÁBBRA IS ez zárja
```

## Mi hitelesíti, ha nincs JWT

`verify_jwt = false`, kényszerből: a meghívottnak ebben a pillanatban még nincs
fiókja, tehát tokenje sem. A hitelesítés maga a **meghívó jele** — 24 karakter a
félreolvashatatlan ábécéből (`belso.veletlen_jel`), ~119 bit.

Amit a jel birtokosa elérhet, az szűk:

| | |
|---|---|
| a fiók címe | **a meghívóból**, nem a kérésből — a hívó nem választhatja meg |
| hány fiók | egy; a második próbálkozás `email_exists` |
| meglévő fiók | **nem írható felül**, a hibát kiadjuk |
| a meghívó elfogadása | **nem itt** történik, hanem a `meghivot_elfogad()`-ban |

## Miért `email_confirm: true`

Mert a cím ellenőrzése már megtörtént: a jel ehhez a postafiókhoz ment ki (a
`sent_at` és a szolgáltató kézbesítési naplója is ezt mondja), vagy a tulajdonos
adta át kézzel a linket — mindkét esetben **ő nevezte meg a címet**.

Egy második megerősítő kör ezen a ponton nem mérne semmi újat, viszont egy egész
levélváltással hosszabbítaná az utat. Pont az a lépés, ami élesben egyszer már
elnyelt egy meghívót: a megerősítő link visszahozott a nyitólapra, a token
elveszett, és a fiók nulla tagsággal ragadt be.

## Telepítés

```bash
npx supabase functions deploy meghivo-fiok --project-ref mwveyzyxupgccqdnbpwe
```

⚠️ **Ez a telepítés feltétele a `disable_signup` bekapcsolásának.** Fordított
sorrendben a meghívás némán megáll, és a felületen csak annyi látszik, hogy nem
sikerült fiókot nyitni.

## A telepítés utáni mérés

Nem a `status: ACTIVE` mezőt hisszük el. Olcsó és kockázatmentes próba: egy
**ismeretlen jelre** küldött POST **404**-et kell adjon, `access-control-allow-origin`
fejléccel. Ha 404 jön, a függvény bootolt *és* a kapu áll; ha időtúllépés vagy
5xx, azonnal látszik, és nulla fiók sérül.

A CORS-fejléc külön is nézendő: a `meghivo-kuld` első verziójából pont ez
hiányzott, és attól a böngésző a POST-ot **el sem küldte**. Mockolt hálózatú
böngészőpróba ezt nem fogja meg — ott nincs CORS.

## Amit nyitva hagy

- **Nincs sebességkorlát.** A végpont nyitott, de csak élő jelre ad fiókot, és
  jelenként egyet; a jel kitalálása nem járható út. Ha valaha mégis kell,
  a jel szerinti korlátozás a helyes forma, nem az IP szerinti.
- **A jelszó alsó határa két helyen áll** (a felületen és itt, 8 karakter).
  Szándékosan: a felületi ellenőrzés a hálózatot spórolja, a függvényé a valódi.
