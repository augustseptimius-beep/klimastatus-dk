import type { WidgetDefinition } from '../types';

export const definition: WidgetDefinition = {
  type: 'klimamaal-hero',
  navn: 'Klimamål (forside-blok)',
  beskrivelse: 'Stor forside-blok: nuværende udledning, reduktion siden baseline og fremdrift mod målet.',
  ikon: 'Target',
  tilladteBredder: [4],
  standardBredde: 4,
  configFelter: [
    { key: 'overskrift', type: 'text', label: 'Overskrift', standard: 'Klimastatus' },
  ],
};
