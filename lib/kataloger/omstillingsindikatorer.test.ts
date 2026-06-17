import { describe, it, expect } from 'vitest';
import { OMSTILLINGSINDIKATORER } from './omstillingsindikatorer';

describe('OMSTILLINGSINDIKATORER', () => {
  it('indeholder præcis 9 indikatorer', () => {
    expect(OMSTILLINGSINDIKATORER).toHaveLength(9);
  });

  it('har enhed og national målværdi på hver', () => {
    for (const i of OMSTILLINGSINDIKATORER) {
      expect(i.enhed).toBeTruthy();
      expect(typeof i.nationalMaalvaerdi).toBe('number');
    }
  });

  it('har unikke titler', () => {
    expect(new Set(OMSTILLINGSINDIKATORER.map((i) => i.titel)).size).toBe(9);
  });
});
