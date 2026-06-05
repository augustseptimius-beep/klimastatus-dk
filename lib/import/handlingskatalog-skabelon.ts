import type { ImportIndsats, ImportHandling } from './types';

export type KolonneNoegle =
  | 'indsatsomraade' | 'indsats_type' | 'sektor' | 'indsats_beskrivelse'
  | 'tiltag_titel' | 'tiltag_type' | 'tiltag_status' | 'tiltag_beskrivelse';

export const SKABELON_KOLONNER: { noegle: KolonneNoegle; overskrift: string; paakraevet: boolean }[] = [
  { noegle: 'indsatsomraade',      overskrift: 'Indsatsområde',       paakraevet: true },
  { noegle: 'indsats_type',        overskrift: 'Indsats-type',        paakraevet: true },
  { noegle: 'sektor',              overskrift: 'Sektor',              paakraevet: true },
  { noegle: 'indsats_beskrivelse', overskrift: 'Indsats-beskrivelse', paakraevet: false },
  { noegle: 'tiltag_titel',        overskrift: 'Tiltag-titel',        paakraevet: true },
  { noegle: 'tiltag_type',         overskrift: 'Tiltag-type',         paakraevet: true },
  { noegle: 'tiltag_status',       overskrift: 'Tiltag-status',       paakraevet: true },
  { noegle: 'tiltag_beskrivelse',  overskrift: 'Tiltag-beskrivelse',  paakraevet: false },
];

const HEADER_ALIAS: Record<string, KolonneNoegle> = {
  'indsatsområde': 'indsatsomraade', 'indsatsomraade': 'indsatsomraade', 'indsatsområde-navn': 'indsatsomraade',
  'indsats-type': 'indsats_type', 'indsatstype': 'indsats_type',
  'sektor': 'sektor',
  'indsats-beskrivelse': 'indsats_beskrivelse',
  'tiltag-titel': 'tiltag_titel', 'tiltag': 'tiltag_titel', 'handling': 'tiltag_titel', 'handling-titel': 'tiltag_titel',
  'tiltag-type': 'tiltag_type', 'handling-type': 'tiltag_type',
  'tiltag-status': 'tiltag_status', 'status': 'tiltag_status',
  'tiltag-beskrivelse': 'tiltag_beskrivelse',
};

export function normaliserHeader(raw: string): KolonneNoegle | null {
  return HEADER_ALIAS[raw.trim().toLowerCase()] ?? null;
}

export const INDSATS_TYPE_ALIAS: Record<string, ImportIndsats['type']> = {
  'drivhusgasreduktion': 'ghg_reduction', 'ghg_reduction': 'ghg_reduction', 'reduktion': 'ghg_reduction',
  'klimatilpasning': 'adaptation', 'adaptation': 'adaptation', 'tilpasning': 'adaptation',
  'forbrug': 'consumption', 'consumption': 'consumption',
  'retfærdig omstilling': 'just_transition', 'just_transition': 'just_transition',
  'tværgående': 'cross_cutting', 'cross_cutting': 'cross_cutting',
};

export const SEKTOR_ALIAS: Record<string, ImportIndsats['sektor']> = {
  'energi': 'energy', 'energy': 'energy',
  'transport': 'transport',
  'bygninger': 'buildings', 'buildings': 'buildings',
  'fødevarer': 'food', 'food': 'food',
  'landbrug': 'agriculture', 'agriculture': 'agriculture',
  'affald': 'waste', 'waste': 'waste',
  'klimatilpasning': 'adaptation', 'adaptation': 'adaptation',
  'andet': 'other', 'other': 'other',
};

export const TILTAG_TYPE_ALIAS: Record<string, ImportHandling['type']> = {
  'reduktion': 'reduction', 'reduction': 'reduction',
  'tilpasning': 'adaptation', 'adaptation': 'adaptation',
  'begge': 'both', 'both': 'both',
};

export const TILTAG_STATUS_ALIAS: Record<string, ImportHandling['status']> = {
  'planlagt': 'planned', 'planned': 'planned',
  'igangværende': 'in_progress', 'igangsat': 'in_progress', 'in_progress': 'in_progress',
  'gennemført': 'completed', 'completed': 'completed', 'færdig': 'completed',
  'udgået': 'discontinued', 'discontinued': 'discontinued',
};

export function byggSkabelonCsv(): string {
  const header = SKABELON_KOLONNER.map((k) => k.overskrift);
  const eksempel1 = [
    'Energirenovering af kommunale bygninger', 'Drivhusgasreduktion', 'Bygninger',
    'Reduktion af energiforbrug i kommunens ejendomme',
    'Efterisolering af rådhuset', 'Reduktion', 'Igangværende', 'Loft og facade efterisoleres i 2026',
  ];
  const eksempel2 = [
    'Energirenovering af kommunale bygninger', 'Drivhusgasreduktion', 'Bygninger', '',
    'Solceller på skoletage', 'Reduktion', 'Planlagt', '',
  ];
  const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [header, eksempel1, eksempel2].map((r) => r.map(esc).join(',')).join('\n');
}
