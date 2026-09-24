import { describe, expect, it } from 'vitest';
import { cp1250 } from './kodolas.ts';

// A visszamérés a futtatókörnyezet **saját** dekódolójával megy, nem a mi
// táblánkkal – különben a tábla hibáját a teszt is elhinné.
const vissza = (b: Uint8Array) => new TextDecoder('windows-1250').decode(b);

describe('Windows-1250 kódolás', () => {
  it('minden magyar betű oda-vissza átmegy, egy bájton', () => {
    const betuk = 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ';
    const b = cp1250(betuk);
    expect(b.length).toBe(betuk.length);
    expect(vissza(b)).toBe(betuk);
  });

  it('a gyártói minta ismert bájtjai: ő = 0xF5, ű = 0xFB, € = 0x80', () => {
    expect([...cp1250('őű€')]).toEqual([0xf5, 0xfb, 0x80]);
  });

  it('az ASCII változatlan', () => {
    expect(vissza(cp1250('SF;2026.09.24;12345678-2-42'))).toBe('SF;2026.09.24;12345678-2-42');
  });

  it('a magyar tipográfia („ ” – …) is benne van a kódlapban', () => {
    expect(vissza(cp1250('„Példa" – Kft…'))).toBe('„Példa" – Kft…');
  });

  it('kódlapon kívüli betű ékezet nélkül megy, nem kérdőjelként', () => {
    expect(vissza(cp1250('Muñoz Łódź'))).toBe('Munoz Łódź');
  });

  it('ami semmilyen alakban nem fér el, az kérdőjel – de csak az', () => {
    expect(vissza(cp1250('Kft 漢'))).toBe('Kft ?');
  });
});
