import type { WidgetDefinition } from '../types';

export const definition: WidgetDefinition = {
  type: 'indsatser-oversigt',
  navn: 'Indsatsoversigt',
  beskrivelse: 'Liste over klimaindsatsområder med handlinger og status.',
  ikon: 'ListChecks',
  tilladteBredder: [2, 3, 4],
  standardBredde: 4,
  configFelter: [],
};
