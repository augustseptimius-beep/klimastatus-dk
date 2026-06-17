// lib/kataloger/standardtiltag-katalog.ts
// 46 navngivne standardtiltag. Kilde: evidensgrundlag §6.3 [D2 s.28–37].
// udbredelsesProcent = andel af de 96 analyserede kommuner der har tiltaget.
type Kategori = 'energi' | 'transport' | 'landbrug_areal' | 'scope3';

export type Standardtiltag = {
  titel: string;
  kategori: Kategori;
  udbredelsesProcent: number;
};

export const STANDARDTILTAG_KATALOG: readonly Standardtiltag[] = [
  // Energi (11) [D2 s.28]
  { titel: 'Konvertering af olie-/naturgasfyr til fjernvarme/varmepumpe', kategori: 'energi', udbredelsesProcent: 99 },
  { titel: 'Varmebesparelser', kategori: 'energi', udbredelsesProcent: 86 },
  { titel: 'Solceller på marker', kategori: 'energi', udbredelsesProcent: 78 },
  { titel: 'Solceller på tage', kategori: 'energi', udbredelsesProcent: 67 },
  { titel: 'Landvind', kategori: 'energi', udbredelsesProcent: 66 },
  { titel: 'Biogasanlæg', kategori: 'energi', udbredelsesProcent: 48 },
  { titel: 'Fossil ud af fjernvarme', kategori: 'energi', udbredelsesProcent: 46 },
  { titel: 'Overskudsvarme', kategori: 'energi', udbredelsesProcent: 42 },
  { titel: 'Plastudsortering', kategori: 'energi', udbredelsesProcent: 39 },
  { titel: 'CCS (CO₂-fangst og -lagring)', kategori: 'energi', udbredelsesProcent: 32 },
  { titel: 'PtX (Power-to-X)', kategori: 'energi', udbredelsesProcent: 29 },

  // Transport (10) [D2 s.29]
  { titel: 'El/gas i kollektiv trafik', kategori: 'transport', udbredelsesProcent: 85 },
  { titel: 'Ladeinfrastruktur', kategori: 'transport', udbredelsesProcent: 85 },
  { titel: 'Fremme af cyklisme', kategori: 'transport', udbredelsesProcent: 77 },
  { titel: 'Kommunal elflåde', kategori: 'transport', udbredelsesProcent: 73 },
  { titel: 'Elektrificering af person-/varebiler', kategori: 'transport', udbredelsesProcent: 73 },
  { titel: 'Fremme af kollektiv transport', kategori: 'transport', udbredelsesProcent: 59 },
  { titel: 'Ændrede transportvaner', kategori: 'transport', udbredelsesProcent: 57 },
  { titel: 'Samkørsel og delebiler', kategori: 'transport', udbredelsesProcent: 56 },
  { titel: 'Tunge køretøjer fossilfri', kategori: 'transport', udbredelsesProcent: 54 },
  { titel: 'Energieffektivitet i transport', kategori: 'transport', udbredelsesProcent: 36 },

  // Landbrug/areal (10) [D2 s.30]
  { titel: 'Skovrejsning', kategori: 'landbrug_areal', udbredelsesProcent: 78 },
  { titel: 'Udtag af lavbundsjorde', kategori: 'landbrug_areal', udbredelsesProcent: 70 },
  { titel: 'Landbrugs-klimaplan', kategori: 'landbrug_areal', udbredelsesProcent: 43 },
  { titel: 'Forgasning af husdyrgødning', kategori: 'landbrug_areal', udbredelsesProcent: 40 },
  { titel: 'Biochar', kategori: 'landbrug_areal', udbredelsesProcent: 30 },
  { titel: 'Staldteknologi', kategori: 'landbrug_areal', udbredelsesProcent: 29 },
  { titel: 'Natur- og klimagenopretning', kategori: 'landbrug_areal', udbredelsesProcent: 25 },
  { titel: 'Fodringsteknologi', kategori: 'landbrug_areal', udbredelsesProcent: 24 },
  { titel: 'Afgrødeomlægning', kategori: 'landbrug_areal', udbredelsesProcent: 23 },
  { titel: 'Planteavl i øvrigt', kategori: 'landbrug_areal', udbredelsesProcent: 22 },

  // Scope 3 (15) [D2 s.37]
  { titel: 'Grønne indkøb', kategori: 'scope3', udbredelsesProcent: 66 },
  { titel: 'Affaldssortering', kategori: 'scope3', udbredelsesProcent: 54 },
  { titel: 'Klimavenlig kost', kategori: 'scope3', udbredelsesProcent: 53 },
  { titel: 'Bæredygtige byggematerialer', kategori: 'scope3', udbredelsesProcent: 46 },
  { titel: 'Mindre madspild', kategori: 'scope3', udbredelsesProcent: 45 },
  { titel: 'Bæredygtig levevis', kategori: 'scope3', udbredelsesProcent: 42 },
  { titel: 'Genanvendelse af byggematerialer', kategori: 'scope3', udbredelsesProcent: 35 },
  { titel: 'Cirkulær økonomi', kategori: 'scope3', udbredelsesProcent: 33 },
  { titel: 'Kommunen som virksomhed', kategori: 'scope3', udbredelsesProcent: 31 },
  { titel: 'CO₂-regnskaber for virksomheder', kategori: 'scope3', udbredelsesProcent: 29 },
  { titel: 'Tekstilgenbrug', kategori: 'scope3', udbredelsesProcent: 18 },
  { titel: 'Deleøkonomi', kategori: 'scope3', udbredelsesProcent: 12 },
  { titel: 'Renovering frem for nybyggeri', kategori: 'scope3', udbredelsesProcent: 7 },
  { titel: 'Elektronik', kategori: 'scope3', udbredelsesProcent: 6 },
  { titel: 'Internationale flyrejser', kategori: 'scope3', udbredelsesProcent: 5 },
] as const;
