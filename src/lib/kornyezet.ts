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

export const kapcsolatEmail = 'info@szamlafolyo.hu';

export { szamlafolyo };
