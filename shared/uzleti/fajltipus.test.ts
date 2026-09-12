import { describe, expect, test } from 'vitest';
import { ellenoriz, felismer } from './fajltipus.ts';

function bajtok(...reszek: (string | number[])[]): Uint8Array {
  const tomb: number[] = [];
  for (const resz of reszek) {
    if (typeof resz === 'string') {
      tomb.push(...[...resz].map((k) => k.charCodeAt(0)));
    } else {
      tomb.push(...resz);
    }
  }
  return new Uint8Array(tomb);
}

describe('felismer — a tartalom dönt, nem a kliens állítása', () => {
  test('PDF', () => {
    expect(felismer(bajtok('%PDF-1.7\n'))).toEqual({ mime: 'application/pdf', kiterjesztes: 'pdf' });
  });

  test('JPEG', () => {
    expect(felismer(bajtok([0xff, 0xd8, 0xff, 0xe0]))).toEqual({
      mime: 'image/jpeg',
      kiterjesztes: 'jpg',
    });
  });

  test('PNG', () => {
    expect(felismer(bajtok([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({
      mime: 'image/png',
      kiterjesztes: 'png',
    });
  });

  test('WebP — a második jel a 8. bájttól', () => {
    expect(felismer(bajtok('RIFF', [0, 0, 0, 0], 'WEBP'))).toEqual({
      mime: 'image/webp',
      kiterjesztes: 'webp',
    });
    // RIFF, de nem WebP (pl. egy WAV) — nem fogadjuk el.
    expect(felismer(bajtok('RIFF', [0, 0, 0, 0], 'WAVE'))).toBeNull();
  });

  /**
   * Az XML-t **soha nem szolgáljuk ki XML típussal**: a `text/plain` itt nem
   * pongyolaság, hanem védelem.
   */
  test('XML deklarációval', () => {
    expect(felismer(bajtok('<?xml version="1.0"?><Invoice/>'))).toEqual({
      mime: 'text/xml',
      kiterjesztes: 'xml',
    });
  });

  test('XML BOM-mal és bevezető whitespace-szel', () => {
    expect(felismer(bajtok([0xef, 0xbb, 0xbf], '\n  <?xml version="1.0"?>'))).not.toBeNull();
    expect(felismer(bajtok('\r\n\t<Invoice xmlns="urn:oasis"/>'))).not.toBeNull();
  });

  /**
   * ⚠️ A `<!DOCTYPE` nem megy át. Az entitás-alapú támadások egész osztálya
   * azon múlik, és az XML-értelmező is eldobja az ilyen fájlt — ami ott
   * elbukna, azt itt sem engedjük be.
   */
  test('a doctype-os fájl nem XML', () => {
    expect(felismer(bajtok('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo/>'))).toBeNull();
    expect(felismer(bajtok('<!-- komment --><Invoice/>'))).toBeNull();
  });

  test('a HTML nem XML', () => {
    expect(felismer(bajtok('<!doctype html><html></html>'))).toBeNull();
  });

  test('az ismeretlen tartalom null', () => {
    expect(felismer(bajtok('csak szöveg'))).toBeNull();
    expect(felismer(bajtok([0x50, 0x4b, 0x03, 0x04]))).toBeNull(); // ZIP/docx
    expect(felismer(new Uint8Array())).toBeNull();
  });
});

describe('ellenoriz', () => {
  test('a jó fájl átmegy', () => {
    const e = ellenoriz(bajtok('%PDF-1.7'), 1024, 'szamla.pdf');
    expect(e.ok).toBe(true);
  });

  test('a túl nagy fájlt elutasítja, és megmondja a határt', () => {
    const e = ellenoriz(bajtok('%PDF-1.7'), 21 * 1024 * 1024, 'nagy.pdf');
    expect(e.ok).toBe(false);
    expect(e.ok === false && e.hiba).toContain('20 MB');
    expect(e.ok === false && e.hiba).toContain('nagy.pdf');
  });

  test('az üres fájlt elutasítja', () => {
    const e = ellenoriz(new Uint8Array(), 0, 'ures.pdf');
    expect(e.ok).toBe(false);
  });

  /**
   * A hibaüzenet megmondja, mit fogadunk el — egy „érvénytelen fájl"
   * üzenetből nem derül ki, mit csináljon a felhasználó.
   */
  test('az átnevezett fájlt a tartalma buktatja le', () => {
    // .pdf névre keresztelt Word-dokumentum.
    const e = ellenoriz(bajtok([0x50, 0x4b, 0x03, 0x04]), 5000, 'szamla.pdf');
    expect(e.ok).toBe(false);
    expect(e.ok === false && e.hiba).toContain('PDF, JPG, PNG, WEBP');
  });
});
