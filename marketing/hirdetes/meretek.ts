/**
 * A képméretek, platformonként. Külön fájl, mert a képgyártó (`keszit.ts`) és
 * az őr (`hirdetes.test.ts`) is innen olvas – a teszt így azt nézi, amit a
 * gyártó tényleg előállít.
 */
export type Meret = { id: string; sz: number; ma: number; hol: string };

/*
 * Meta: a 4:5 az elsődleges – mobilon a Feed ezt adja ki a legnagyobb
 * területen. A 9:16-nál a felső kb. 250 és az alsó kb. 340 képpontot a Meta
 * saját felülete takarja, ezért ott a tartalom középre húzott.
 */
export const META_MERETEK: readonly Meret[] = [
  { id: '4x5', sz: 1080, ma: 1350, hol: 'Feed (elsődleges)' },
  { id: '1x1', sz: 1080, ma: 1080, hol: 'Feed, Marketplace, jobb oldali sáv' },
  { id: '9x16', sz: 1080, ma: 1920, hol: 'Stories és Reels' },
  { id: '1.91x1', sz: 1200, ma: 628, hol: 'Link, Audience Network' },
];

/*
 * Google Performance Max és reszponzív display: fekvő (1,91:1), négyzetes
 * (1:1) és álló (4:5). A Google a kevés szöveget ajánlja a képen, ezért ezek
 * a Meta-képeknél szellősebbek: nincs jelvény, alcím és gomb.
 */
export const GOOGLE_MERETEK: readonly Meret[] = [
  { id: '1.91x1', sz: 1200, ma: 628, hol: 'Fekvő kép' },
  { id: '1x1', sz: 1200, ma: 1200, hol: 'Négyzetes kép' },
  { id: '4x5', sz: 960, ma: 1200, hol: 'Álló kép' },
];

export const GOOGLE_LOGOK: readonly Meret[] = [
  { id: 'logo_1x1', sz: 1200, ma: 1200, hol: 'Négyzetes logó' },
  { id: 'logo_4x1', sz: 1200, ma: 300, hol: 'Fekvő logó' },
];
