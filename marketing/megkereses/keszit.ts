/**
 * A `SZOVEGEK.md` újragyártása a `szovegek.ts`-ből.
 *
 * Futtatás: `npx vite-node marketing/megkereses/keszit.ts`
 */
import { writeFileSync } from 'node:fs';
import { szovegMd } from './kimenet.ts';

const ITT = new URL('.', import.meta.url).pathname;

writeFileSync(`${ITT}SZOVEGEK.md`, szovegMd());
console.log('SZOVEGEK.md kész.');
