import { describe, it, expect } from 'vitest';
import { erMagicLinkGyldig } from './magic-link-vurdering';

const omEnUge = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const iGaar = new Date(Date.now() - 24 * 60 * 60 * 1000);

describe('erMagicLinkGyldig', () => {
  it('afviser manglende link', () => {
    expect(erMagicLinkGyldig(undefined)).toBe(false);
    expect(erMagicLinkGyldig(null)).toBe(false);
  });

  it('afviser brugt link', () => {
    expect(erMagicLinkGyldig({ used: true, expiresAt: omEnUge })).toBe(false);
  });

  it('afviser udløbet link', () => {
    expect(erMagicLinkGyldig({ used: false, expiresAt: iGaar })).toBe(false);
  });

  it('godkender ubrugt, ikke-udløbet link', () => {
    expect(erMagicLinkGyldig({ used: false, expiresAt: omEnUge })).toBe(true);
  });

  it('håndterer expiresAt som streng (DB-drivere kan returnere begge)', () => {
    expect(erMagicLinkGyldig({ used: false, expiresAt: omEnUge.toISOString() })).toBe(true);
    expect(erMagicLinkGyldig({ used: false, expiresAt: iGaar.toISOString() })).toBe(false);
  });
});
