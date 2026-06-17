import { describe, it, expect } from 'vitest';
import { STANDARDTILTAG_KATALOG } from './standardtiltag-katalog';

describe('STANDARDTILTAG_KATALOG', () => {
  it('indeholder præcis 46 tiltag', () => {
    expect(STANDARDTILTAG_KATALOG).toHaveLength(46);
  });

  it('har korrekt fordeling pr. kategori (11/10/10/15)', () => {
    const n = (k: string) => STANDARDTILTAG_KATALOG.filter((t) => t.kategori === k).length;
    expect(n('energi')).toBe(11);
    expect(n('transport')).toBe(10);
    expect(n('landbrug_areal')).toBe(10);
    expect(n('scope3')).toBe(15);
  });

  it('har unikke titler', () => {
    const titler = STANDARDTILTAG_KATALOG.map((t) => t.titel);
    expect(new Set(titler).size).toBe(46);
  });

  it('har udbredelses-% i 0–100 på hvert tiltag', () => {
    for (const t of STANDARDTILTAG_KATALOG) {
      expect(t.udbredelsesProcent).toBeGreaterThanOrEqual(0);
      expect(t.udbredelsesProcent).toBeLessThanOrEqual(100);
    }
  });
});
