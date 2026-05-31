export type LaeringsBeslutning =
  | 'viderefoeres' | 'justeres' | 'udgaar' | 'tilfoeres_ressourcer' | 'eskaleres';

export type LaeringsKnytning = 'tiltag' | 'indsatsomraade' | 'maal';

/** Beslutninger i den rækkefølge de skal vises i UI (mest brugte først, "udgår" sidst). */
export const BESLUTNINGER: LaeringsBeslutning[] = [
  'viderefoeres', 'justeres', 'tilfoeres_ressourcer', 'eskaleres', 'udgaar',
];

const BESLUTNING_LABELS: Record<LaeringsBeslutning, string> = {
  viderefoeres: 'Videreføres',
  justeres: 'Justeres',
  udgaar: 'Udgår',
  tilfoeres_ressourcer: 'Tilføres ressourcer',
  eskaleres: 'Eskaleres',
};

const KNYTNING_LABELS: Record<LaeringsKnytning, string> = {
  tiltag: 'Tiltag',
  indsatsomraade: 'Indsatsområde',
  maal: 'Mål',
};

export function beslutningLabel(b: LaeringsBeslutning): string {
  return BESLUTNING_LABELS[b];
}

export function knytningLabel(k: LaeringsKnytning): string {
  return KNYTNING_LABELS[k];
}
