import { szamlafolyo } from '@config/szamlafolyo.ts';

/**
 * A böngészőbe kerülő kapcsolók.
 *
 * Amíg az oldal fejlesztés alatt áll, a nyilvános regisztráció zárva van, és a
 * belépés előtti képernyőkön figyelmeztetés fogadja a látogatót.
 *
 * **A kollégák meghívása nem ezen múlik**: azt a Beállítások képernyőn a cég
 * tulajdonosa intézi, belépve — az nem nyilvános regisztráció.
 */
export const regisztracioNyitva = import.meta.env.VITE_REGISZTRACIO_NYITVA === 'true';
export const fejlesztesAlatt = import.meta.env.VITE_FEJLESZTES_ALATT !== 'false';

/**
 * A kapcsolati cím a configból jön, nem innen.
 *
 * A név itt marad, mert hét képernyő importálja — de a betűsor egyetlen
 * helyen születik (`config/szamlafolyo.ts`), ahonnan a jogi oldalak és a
 * levelek feladója is olvassa.
 */
export const kapcsolatEmail = szamlafolyo.kapcsolatEmail;

export { szamlafolyo };
