export type KriterieStatus = 'tom' | 'ai_udkast' | 'redigeret' | 'godkendt';

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
  selvvurdering: string;   // "Samlet selvvurdering af opfyldelse"
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
    selvvurdering: '',
    dokumentationshenvisninger: [],
    aiGenereret: false,
    aiGenereretDato: null,
  };
}
