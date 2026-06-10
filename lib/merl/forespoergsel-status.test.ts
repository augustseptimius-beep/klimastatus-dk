import { describe, it, expect } from 'vitest';
import {
  erForfalden, nyligAnmodet, kadenceLabel, kadencePeriodeNoegle,
  SVARVINDUE_DAGE, ANMOD_IGEN_SPAERRE_DAGE,
} from './forespoergsel-status';

describe('erForfalden', () => {
  it('er false for besvaret forespørgsel uanset alder', () => {
    expect(erForfalden('besvaret', '2026-01-01T00:00:00Z', '2026-06-01')).toBe(false);
  });
  it('er false når sendt inden for svarvinduet', () => {
    expect(erForfalden('sendt', '2026-06-01T00:00:00Z', '2026-06-10')).toBe(false);
  });
  it('er true når sendt ældre end svarvinduet og stadig sendt', () => {
    expect(erForfalden('sendt', '2026-05-01T00:00:00Z', '2026-06-01')).toBe(true);
  });
  it('bruger SVARVINDUE_DAGE som grænse (præcis grænse er ikke forfalden)', () => {
    expect(erForfalden('sendt', '2026-06-01T00:00:00Z', '2026-06-15')).toBe(false);
    expect(erForfalden('sendt', '2026-06-01T00:00:00Z', '2026-06-16')).toBe(true);
  });
});

describe('nyligAnmodet', () => {
  it('er false når der aldrig er anmodet', () => {
    expect(nyligAnmodet(null, '2026-06-01')).toBe(false);
  });
  it('er true når seneste anmodning er inden for spærren', () => {
    expect(nyligAnmodet('2026-05-30T00:00:00Z', '2026-06-01')).toBe(true);
  });
  it('er false når seneste anmodning er ældre end spærren', () => {
    expect(nyligAnmodet('2026-05-01T00:00:00Z', '2026-06-01')).toBe(false);
  });
});

describe('kadenceLabel', () => {
  it('giver dansk label for hver kadence', () => {
    expect(kadenceLabel('maanedlig')).toBe('Månedlig');
    expect(kadenceLabel('kvartalsvis')).toBe('Kvartalsvis');
    expect(kadenceLabel('halvaarlig')).toBe('Halvårlig');
    expect(kadenceLabel('aarlig')).toBe('Årlig');
    expect(kadenceLabel('manuel')).toBe('Manuel (slukket)');
  });
});

describe('kadencePeriodeNoegle', () => {
  it('årlig → år', () => {
    expect(kadencePeriodeNoegle('aarlig', '2026-06-09')).toBe('2026');
  });
  it('halvårlig → halvår', () => {
    expect(kadencePeriodeNoegle('halvaarlig', '2026-06-09')).toBe('2026-H1');
    expect(kadencePeriodeNoegle('halvaarlig', '2026-09-09')).toBe('2026-H2');
  });
  it('kvartalsvis → kvartal', () => {
    expect(kadencePeriodeNoegle('kvartalsvis', '2026-06-09')).toBe('2026-Q2');
    expect(kadencePeriodeNoegle('kvartalsvis', '2026-01-15')).toBe('2026-Q1');
  });
  it('månedlig → måned', () => {
    expect(kadencePeriodeNoegle('maanedlig', '2026-06-09')).toBe('2026-06');
  });
  it('manuel → null', () => {
    expect(kadencePeriodeNoegle('manuel', '2026-06-09')).toBe(null);
  });
});

describe('konstanter', () => {
  it('har fornuftige standarder', () => {
    expect(SVARVINDUE_DAGE).toBe(14);
    expect(ANMOD_IGEN_SPAERRE_DAGE).toBe(7);
  });
});
