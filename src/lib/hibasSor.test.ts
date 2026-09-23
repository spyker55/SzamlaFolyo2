import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * A végleg elbukott (`hiba`) bizonylat két művelete (2026-09-23). Addig a sor
 * zsákutca volt a Beérkezőben: se újrapróbálni, se eltüntetni nem lehetett.
 */

type Hivas = { tabla: string; muvelet: string; adat?: unknown; szurok: [string, unknown][] };
const hivasok: Hivas[] = [];
let visszaad: { data: unknown; error: unknown } = { data: { id: 'd1' }, error: null };
const invoke = vi.fn(async () => ({ data: null, error: null }));

vi.mock('./supabase.ts', () => {
  function lanc(h: Hivas) {
    const l = {
      eq(oszlop: string, ertek: unknown) {
        h.szurok.push([oszlop, ertek]);
        return l;
      },
      select: () => l,
      maybeSingle: async () => visszaad,
      then: (kesz: (v: unknown) => void) => kesz({ error: visszaad.error }),
    };
    return l;
  }

  return {
    supabase: {
      from: (tabla: string) => ({
        update: (adat: unknown) => {
          const h: Hivas = { tabla, muvelet: 'update', adat, szurok: [] };
          hivasok.push(h);
          return lanc(h);
        },
        delete: () => {
          const h: Hivas = { tabla, muvelet: 'delete', szurok: [] };
          hivasok.push(h);
          return lanc(h);
        },
      }),
      functions: { invoke },
    },
  };
});

const { hibasatElvet, hibasatUjraindit } = await import('./feltoltes.ts');

beforeEach(() => {
  hivasok.length = 0;
  invoke.mockClear();
  visszaad = { data: { id: 'd1' }, error: null };
});

describe('a hibás bizonylat újraindítása', () => {
  it('visszateszi a sorba, a kísérletszámlálót nullázza, és azonnal indítja', async () => {
    expect(await hibasatUjraindit('d1')).toEqual({ ok: true });

    const [h] = hivasok;
    expect(h).toMatchObject({ tabla: 'documents', muvelet: 'update' });
    // Nullázás nélkül a cron (attempts < maxProbalkozas) sosem venné fel.
    expect(h!.adat).toEqual({ status: 'feltoltve', attempts: 0, error: null, claimed_at: null });
    expect(h!.szurok).toEqual([
      ['id', 'd1'],
      ['status', 'hiba'],
    ]);
    expect(invoke).toHaveBeenCalledWith('kiolvas', { body: { dokumentum_id: 'd1' } });
  });

  it('ha a sor közben már nem hibás, nem indít semmit', async () => {
    visszaad = { data: null, error: null };

    const eredmeny = await hibasatUjraindit('d1');

    expect(eredmeny.ok).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('a hibás bizonylat elvetése', () => {
  it('csak hibás sort töröl – egy elgépelt azonosító nem visz el valódi bizonylatot', async () => {
    expect(await hibasatElvet('d1')).toEqual({ ok: true });

    const [h] = hivasok;
    expect(h).toMatchObject({ tabla: 'documents', muvelet: 'delete' });
    expect(h!.szurok).toEqual([
      ['id', 'd1'],
      ['status', 'hiba'],
    ]);
  });
});

describe('a Beérkező felkínálja a két műveletet', () => {
  const forras = readFileSync(new URL('../kepernyok/Beerkezo.tsx', import.meta.url), 'utf8');

  it('a hibás sornál, csak szerkesztőnek', () => {
    expect(forras).toContain("{sor.status === 'hiba' && szerkeszthet && (");
    expect(forras).toContain("onClick={() => void hibasMuvelet(sor.id, 'ujra')}");
    expect(forras).toContain("onClick={() => void hibasMuvelet(sor.id, 'elvet')}");
  });

  it('az elvetés előtt rákérdez', () => {
    const muvelet = forras.slice(forras.indexOf('async function hibasMuvelet'));
    expect(muvelet.slice(0, muvelet.indexOf('setElvetes(id);'))).toContain('window.confirm(');
  });
});
