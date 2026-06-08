import { describe, it, expect } from 'vitest';
import { EFFEKT_KATEGORIER, CO2_KATEGORI, kategoriNavn, standardEnhedFor } from './effekt-kategorier';

describe('effekt-kategorier', () => {
  it('indeholder de fire startkategorier', () => {
    const keys = EFFEKT_KATEGORIER.map((k) => k.key);
    expect(keys).toEqual(['co2_reduktion', 'klimatilpasning', 'retfaerdig_fordeling', 'sidegevinst']);
  });

  it('CO2_KATEGORI peger på co2_reduktion', () => {
    expect(CO2_KATEGORI).toBe('co2_reduktion');
  });

  it('co2_reduktion har en standardenhed', () => {
    const co2 = EFFEKT_KATEGORIER.find((k) => k.key === 'co2_reduktion');
    expect(co2?.standardEnhed).toBe('ton CO₂e/år');
  });

  it('kategoriNavn slår navn op fra key', () => {
    expect(kategoriNavn('klimatilpasning')).toBe('Klimatilpasning');
  });

  it('kategoriNavn returnerer "Øvrig effekt" for null', () => {
    expect(kategoriNavn(null)).toBe('Øvrig effekt');
  });

  it('kategoriNavn returnerer key uændret for ukendt key', () => {
    expect(kategoriNavn('ukendt')).toBe('ukendt');
  });

  it('standardEnhedFor returnerer tom streng for kategori uden enhed', () => {
    expect(standardEnhedFor('klimatilpasning')).toBe('');
  });

  it('standardEnhedFor returnerer "ton CO₂e/år" for co2_reduktion', () => {
    expect(standardEnhedFor('co2_reduktion')).toBe('ton CO₂e/år');
  });
});
