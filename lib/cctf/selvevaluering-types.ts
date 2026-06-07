export type KriterieStatus = 'tom' | 'ai_udkast' | 'redigeret' | 'godkendt';

/** Standardiseret selvvurdering. '' = ikke valgt endnu. */
export type SelvvurderingNiveau = '' | 'lever_op' | 'delvist' | 'lever_ikke_op' | 'ikke_relevant';

export const SELVVURDERING_NIVEAUER: { value: Exclude<SelvvurderingNiveau, ''>; label: string; color: string; bg: string }[] = [
  { value: 'lever_op',      label: 'Lever op til kravet',      color: '#1E6B3A', bg: '#e8f5e9' },
  { value: 'delvist',       label: 'Delvist opfyldt',          color: '#8B6914', bg: '#fff8e1' },
  { value: 'lever_ikke_op', label: 'Lever ikke op til kravet', color: '#b3261e', bg: '#fdecea' },
  { value: 'ikke_relevant', label: 'Ikke relevant',            color: '#5f6368', bg: '#f1f3f4' },
];

export const SELVVURDERING_LABEL: Record<Exclude<SelvvurderingNiveau, ''>, string> = Object.fromEntries(
  SELVVURDERING_NIVEAUER.map(n => [n.value, n.label]),
) as Record<Exclude<SelvvurderingNiveau, ''>, string>;

export type DokRef = {
  entitetType: string;   // 'tiltag' | 'maal' | 'indikator' | 'indsatsomraade'
  entitetId: string;
  label: string;         // fx "Tiltag: Etablering af solpark Nordmark"
  bemaerkning: string | null;
};

export type KriterieBesvarelse = {
  kriterieNr: number;
  status: KriterieStatus;
  // Officielle afsnit fra CCTF-skemaet v2.5:
  hvadStaarPaa: string;    // "Hvad kommunen allerede har gjort"
  hvadOpdateres: string;   // "Hvad kommunen vil opdatere/udbygge"
  selvvurderingNiveau: SelvvurderingNiveau; // Standardiseret vurdering (dropdown)
  selvvurdering: string;   // Begrundelse for selvvurderingen (fritekst)
  // Snapshotet fra cctf_kriterie_mapping ved godkendelse:
  dokumentationshenvisninger: DokRef[];
  // AI-hooks (ikke aktive endnu):
  aiGenereret: boolean;
  aiGenereretDato: string | null;
};

export type SelvevalueringData = {
  cctfVersion: string;       // '2.5'
  kriterier: KriterieBesvarelse[];
};

/** Lav en tom KriterieBesvarelse for et givet kriterie-nr */
export function tomKriterieBesvarelse(kriterieNr: number): KriterieBesvarelse {
  return {
    kriterieNr,
    status: 'tom',
    hvadStaarPaa: '',
    hvadOpdateres: '',
    selvvurderingNiveau: '',
    selvvurdering: '',
    dokumentationshenvisninger: [],
    aiGenereret: false,
    aiGenereretDato: null,
  };
}
