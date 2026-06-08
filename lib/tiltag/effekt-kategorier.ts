export const EFFEKT_KATEGORIER = [
  { key: 'co2_reduktion',        navn: 'CO₂-reduktion',        standardEnhed: 'ton CO₂e/år' },
  { key: 'klimatilpasning',      navn: 'Klimatilpasning',      standardEnhed: '' },
  { key: 'retfaerdig_fordeling', navn: 'Retfærdig fordeling',  standardEnhed: '' },
  { key: 'sidegevinst',          navn: 'Sidegevinst',          standardEnhed: '' },
] as const;

export type EffektKategoriKey = (typeof EFFEKT_KATEGORIER)[number]['key'];

export const CO2_KATEGORI: EffektKategoriKey = 'co2_reduktion';

export function kategoriNavn(key: string | null): string {
  if (!key) return 'Øvrig effekt';
  return EFFEKT_KATEGORIER.find((k) => k.key === key)?.navn ?? key;
}

export function standardEnhedFor(key: string): string {
  return EFFEKT_KATEGORIER.find((k) => k.key === key)?.standardEnhed ?? '';
}
