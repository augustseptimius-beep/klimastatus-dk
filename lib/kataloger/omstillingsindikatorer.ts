// lib/kataloger/omstillingsindikatorer.ts
// 9 nationale omstillingsindikatorer med national målværdi. Kilde: evidensgrundlag
// §6.4 [D2 s.35, Tabel 13]. Seedes som benchmark-templates UDEN live kilde
// (datakilder wires i Fase 2). niveau = outcome/impact.
type Niveau = 'outcome' | 'impact';
type Sektor = 'energy' | 'transport' | 'agriculture';

export type Omstillingsindikator = {
  titel: string;
  enhed: string;
  nationalMaalvaerdi: number;
  nationalMaalvaerdiNote: string;
  niveau: Niveau;
  sektor: Sektor;
};

export const OMSTILLINGSINDIKATORER: readonly Omstillingsindikator[] = [
  { titel: 'Udfasning af naturgas til rumvarme', enhed: '%', nationalMaalvaerdi: 100, nationalMaalvaerdiNote: '100% i 2035', niveau: 'outcome', sektor: 'energy' },
  { titel: 'Indfasning af elbiler', enhed: '% af bilpark', nationalMaalvaerdi: 23, nationalMaalvaerdiNote: '23% rene elbiler i 2030', niveau: 'outcome', sektor: 'transport' },
  { titel: 'Elproduktion fra solceller', enhed: 'GWh/år', nationalMaalvaerdi: 27000, nationalMaalvaerdiNote: '~27.000 GWh/år', niveau: 'impact', sektor: 'energy' },
  { titel: 'Elproduktion fra land-/kystvind', enhed: 'GWh/år', nationalMaalvaerdi: 23000, nationalMaalvaerdiNote: '~23.000 GWh/år', niveau: 'impact', sektor: 'energy' },
  { titel: 'Udtag af lavbundsjorde', enhed: 'ha', nationalMaalvaerdi: 80000, nationalMaalvaerdiNote: '80.000 ha', niveau: 'impact', sektor: 'agriculture' },
  { titel: 'Skovrejsning', enhed: 'ha', nationalMaalvaerdi: 60000, nationalMaalvaerdiNote: '~60.000 ha', niveau: 'impact', sektor: 'agriculture' },
  { titel: 'Biogas', enhed: 'GWh/år', nationalMaalvaerdi: 14500, nationalMaalvaerdiNote: '14.500 GWh/år', niveau: 'impact', sektor: 'energy' },
  { titel: 'PtX (Power-to-X)', enhed: 'GWh/år', nationalMaalvaerdi: 17500, nationalMaalvaerdiNote: '17.500 GWh/år', niveau: 'impact', sektor: 'energy' },
  { titel: 'CCS (CO₂-fangst og -lagring)', enhed: 'kt CO₂/år', nationalMaalvaerdi: 3200, nationalMaalvaerdiNote: '3.200 kt CO₂/år', niveau: 'impact', sektor: 'energy' },
] as const;
