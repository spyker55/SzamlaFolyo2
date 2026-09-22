import { describe, expect, it } from 'vitest';
import { magyarAuthHiba } from './authHiba.ts';

/** A Supabase `AuthWeakPasswordError` alakja, a mért mezőkkel. */
function gyenge(reasons: string[], message = 'Password is too weak') {
  return { code: 'weak_password', status: 422, message, reasons };
}

describe('a Supabase hitelesítési hibái magyarul szólalnak meg', () => {
  it('a kiszivárgott jelszót megnevezi', () => {
    const uzenet = magyarAuthHiba(gyenge(['pwned']));

    expect(uzenet).toMatch(/szivárg/);
    expect(uzenet).not.toMatch(/[Pp]assword/);
  });

  it('a rövid jelszóra nem talál ki küszöbszámot', () => {
    const uzenet = magyarAuthHiba(gyenge(['length'], 'Password should be at least 12 characters'));

    expect(uzenet).toMatch(/rövid/);
    // A szerver küszöbét a böngésző nem ismeri — egy odaírt szám hazugság volna.
    expect(uzenet).not.toMatch(/\d/);
  });

  it('a `pwned` erősebb a `length`-nél, ha mindkettő jön', () => {
    expect(magyarAuthHiba(gyenge(['length', 'pwned']))).toMatch(/szivárg/);
  });

  it('kód nélküli, régebbi szerver üzenetét is felismeri', () => {
    const uzenet = magyarAuthHiba({
      status: 422,
      message: 'This password has been found in a data breach',
    });

    expect(uzenet).toMatch(/szivárg/);
  });

  it('a levélkorlátot megkülönbözteti', () => {
    expect(magyarAuthHiba({ code: 'over_email_send_rate_limit', message: 'x' })).toMatch(/perc/);
  });

  it('a lejárt linket megnevezi', () => {
    expect(magyarAuthHiba({ code: 'otp_expired', message: 'x' })).toMatch(/lejárt/);
  });

  it('a foglalt címre NEM mondja ki, hogy létezik a fiók', () => {
    const uzenet = magyarAuthHiba({ code: 'email_exists', message: 'x' }) ?? '';

    // A Supabase szándékosan nem árulja el, hogy egy cím regisztrált-e. Ezt a
    // védelmet a mi szövegünk nem gyengítheti: feltételesen fogalmazunk.
    expect(uzenet).toMatch(/Ha .*már van fiókod/);
    expect(uzenet).not.toMatch(/már regisztrált|foglalt|létezik/);
  });

  it('az ismeretlen hibára `null`-t ad, nem talál ki mondatot', () => {
    expect(magyarAuthHiba({ code: 'valami_egeszen_uj', message: 'Boom' })).toBeNull();
  });

  it('a `signup_disabled` nem ide tartozik — azt a képernyő maga kezeli', () => {
    expect(magyarAuthHiba({ code: 'signup_disabled', message: 'x' })).toBeNull();
  });

  it('egyetlen magyar mondat sem szivárogtat angol platformszöveget', () => {
    const kodok = [
      'weak_password',
      'over_email_send_rate_limit',
      'over_request_rate_limit',
      'otp_expired',
      'session_expired',
      'email_exists',
      'email_not_confirmed',
      'email_address_invalid',
      'same_password',
    ];

    const uzenetek = kodok.map((code) => magyarAuthHiba({ code, message: 'RAW ENGLISH TEXT' }));

    // Anti-vakság: tényleg kapunk mondatokat, nem csupa null.
    expect(uzenetek.filter((u) => u !== null).length).toBe(kodok.length);
    expect(uzenetek.join(' ')).not.toMatch(/RAW ENGLISH TEXT/);
  });
});
