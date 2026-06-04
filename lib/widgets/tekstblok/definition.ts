import type { WidgetDefinition } from '../types';

export const definition: WidgetDefinition = {
  type: 'tekstblok',
  navn: 'Tekstblok',
  beskrivelse: 'Fri introtekst — fx en velkomst eller kontekst til borgerne.',
  ikon: 'Type',
  tilladteBredder: [2, 3, 4],
  standardBredde: 4,
  configFelter: [
    { key: 'overskrift', type: 'text', label: 'Overskrift', standard: 'Om vores klimaindsats' },
    { key: 'tekst', type: 'text', label: 'Brødtekst', standard: '', multiline: true },
  ],
};
